"""Configurador: fallos notificados a la API (WEB-221) y peticiones simultáneas independientes (WEB-222).

Antes, request_data imprimía el error del CDS y seguía; adapt_netcdf fallaba con un fichero inexistente,
el wrapper del consumidor tragaba la excepción y la petición se quedaba en GENERATING para siempre.

Uso: python backend/FAST-IBAN_Project/configurator/test_configurator.py
"""
import asyncio
import importlib.util
import json
import pathlib
import sys
import types
import unittest
from unittest import mock

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))


def _stub(nombre, **atributos):
    """Sustituye un módulo con dependencias externas (aio_pika, cdsapi, xarray, dotenv) que el test no necesita."""
    modulo = types.ModuleType(nombre)
    modulo.__dict__.update(atributos)
    sys.modules[nombre] = modulo


def _cargar(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


class ErrorCDS(Exception):
    pass


def _retrieve_que_falla(*args, **kwargs):
    raise ErrorCDS("MARS has returned an error: Ambiguous humidity")


_stub("dotenv", load_dotenv=lambda *args, **kwargs: None)
_stub("utils.rabbitMQ.rabbitmq", RabbitMQ=object)
_stub("cdsapi", Client=lambda: types.SimpleNamespace(retrieve=_retrieve_que_falla))
api_request = _cargar("api_request_real", RAIZ / "utils" / "api_request.py")

llamadas_adapt = []
_stub("utils.api_request", request_data=api_request.request_data)
_stub("utils.netcdf_editor", adapt_netcdf=llamadas_adapt.append)
# ALG-369 / WEB-359: las rutas de descarga viven aparte, sin dependencias, para que la prueba de extremo a extremo
# pueda preguntarle al configurador dónde espera cada fichero.
sys.path.insert(0, str(RAIZ / "configurator"))
rutas = _cargar("rutas", RAIZ / "configurator" / "rutas.py")
sys.modules["rutas"] = rutas
configurator = _cargar("configurator_CLI", RAIZ / "configurator" / "configurator_CLI.py")

from utils.consts.consts import STATUS_ERROR, STATUS_OK  # noqa: E402
from utils.rabbitMQ.rabbit_consts import HANDLER_START_KEY, PROGRESS_UPDATE_KEY, RESULTS_DONE_KEY  # noqa: E402


class RabbitFalso:
    def __init__(self):
        self.publicados = []

    async def publish(self, exchange, routing_key, message):
        # Cede el control como una publicación real: otra petición puede avanzar mientras tanto.
        await asyncio.sleep(0)
        self.publicados.append((routing_key, json.loads(message)))

    def con_clave(self, clave):
        return [m for k, m in self.publicados if k == clave]


def peticion(**cambios):
    contenido = {
        "requestHash": "h1", "variableName": "humidity", "pressureLevels": ["500"], "years": ["2022"],
        "months": ["03"], "days": ["14"], "hours": ["12"], "areaCovered": ["90", "-180", "-90", "180"],
        "mapTypes": ["comb"], "fileFormat": "png", **cambios,
    }
    return json.dumps({"status": STATUS_OK, "message": "New request created", "content": json.dumps(contenido)}).encode()


class RequestDataTest(unittest.TestCase):
    def test_el_error_del_cds_se_propaga(self):
        with self.assertRaises(ErrorCDS):
            api_request.request_data("humidity", ["2022"], ["03"], ["14"], ["12"], ["500"], [90, -180, -90, 180], "x.nc")


class ConfiguratorErroresTest(unittest.TestCase):
    def test_fallo_de_descarga_se_notifica_a_la_api_y_no_sigue(self):
        rabbit = RabbitFalso()
        llamadas_adapt.clear()

        # El directorio del área (ALG-369) no se crea de verdad: /app no existe fuera del contenedor.
        with mock.patch.object(configurator.os, "makedirs"):
            asyncio.run(configurator.Configurator(rabbit).process_message(peticion()))

        resultados = rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertEqual(resultados[0]["content"]["requestHash"], "h1")
        self.assertEqual(llamadas_adapt, [], "no debe adaptar un fichero que no se ha descargado")
        self.assertEqual(rabbit.con_clave(HANDLER_START_KEY), [], "no debe lanzar el handler")


class ConfiguratorConcurrenciaTest(unittest.TestCase):
    def test_peticiones_simultaneas_no_se_pisan(self):
        # WEB-222: el configurador es una instancia única; los argumentos de una petición no pueden
        # sobrescribir los de otra que sigue en curso.
        rabbit = RabbitFalso()
        conf = configurator.Configurator(rabbit)

        async def ambas():
            await asyncio.gather(
                conf.process_message(peticion(requestHash="a", variableName="geopotential", hours=["0"])),
                conf.process_message(peticion(requestHash="b", variableName="geopotential", hours=["6"])),
            )

        with mock.patch.object(configurator.os.path, "exists", return_value=True):
            asyncio.run(ambas())

        enviados = {m["content"]["requestHash"]: m["content"]["file"] for m in rabbit.con_clave(HANDLER_START_KEY)}
        self.assertEqual(sorted(enviados), ["a", "b"])
        self.assertTrue(enviados["a"].endswith("_00UTC.nc"), enviados["a"])
        self.assertTrue(enviados["b"].endswith("_06UTC.nc"), enviados["b"])
        progreso = [m["content"]["requestHash"] for m in rabbit.con_clave(PROGRESS_UPDATE_KEY)]
        self.assertEqual((progreso.count("a"), progreso.count("b")), (3, 3))


class AreaDeDescargaTest(unittest.TestCase):
    """ALG-369: el geopotencial se descarga con un margen de ray_distance_km alrededor del área pedida, en grados
    enteros, para que los rayos de los candidatos de los bordes tengan datos; el C solo informa dentro del área."""

    def test_hemisferio_norte_por_encima_de_25(self):
        self.assertEqual(configurator.area_de_descarga(["90", "-180", "25", "180"], "geopotential"), ["90", "-180", "20", "180"])

    def test_dominio_regional_margen_en_longitud_segun_la_latitud_mas_polar(self):
        # 500 km son 4,5° de latitud; en longitud, 4,5°/cos 70° + una celda = 13,4° → 14°.
        self.assertEqual(configurator.area_de_descarga(["70", "-30", "35", "40"], "Geopotential"), ["75", "-44", "30", "54"])

    def test_cruza_el_antimeridiano_o_llega_cerca_del_polo_circulo_completo(self):
        self.assertEqual(configurator.area_de_descarga(["60", "160", "40", "179"], "geopotential"), ["65", "-180", "35", "180"])
        self.assertEqual(configurator.area_de_descarga(["85", "0", "60", "30"], "geopotential"), ["90", "-180", "55", "180"])

    def test_hemisferio_sur_simetrico(self):
        self.assertEqual(configurator.area_de_descarga(["-25", "-180", "-90", "180"], "geopotential"), ["-20", "-180", "-90", "180"])

    def test_la_temperatura_no_lleva_margen(self):
        self.assertEqual(configurator.area_de_descarga(["70", "-30", "35", "40"], "temperature"), ["70", "-30", "35", "40"])

    def test_distancia_de_los_rayos_igual_que_en_params_yaml(self):
        params = (RAIZ / "execution" / "code" / "config" / "params.yaml").read_text(encoding="utf-8")
        valor = next(float(l.split(":")[1]) for l in params.splitlines() if l.startswith("ray_distance_km:"))
        self.assertEqual(rutas.RAY_DISTANCE_KM, valor)

    def test_el_fichero_va_en_un_directorio_por_area(self):
        args = {"variableName": "geopotential", "pressureLevels": ["500"], "years": ["2022"], "months": ["03"],
                "days": ["14"], "hours": ["12"]}
        ruta = configurator.mount_file_name(args, ["90", "-180", "20", "180"])
        self.assertTrue(ruta.endswith("/area_90_-180_20_180/geopotential_500hPa_2022-03-(14)_12UTC.nc"), ruta)


if __name__ == "__main__":
    unittest.main()
