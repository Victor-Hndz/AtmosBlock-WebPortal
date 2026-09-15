"""Handler de configuración: errores notificados a la API (WEB-211), peticiones independientes (WEB-222)
y comando del núcleo según el paralelismo pedido (WEB-218).

Uso: python backend/FAST-IBAN_Project/handler/test_config_handler.py
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
    """Sustituye un módulo con dependencias externas (aio_pika, minio, dotenv) que el test no necesita."""
    modulo = types.ModuleType(nombre)
    modulo.__dict__.update(atributos)
    sys.modules.setdefault(nombre, modulo)


limpiados = []
_stub("dotenv", load_dotenv=lambda *args, **kwargs: None)
_stub("utils.rabbitMQ.rabbitmq", RabbitMQ=object)
_stub("utils.minio.upload_files", upload_files_to_request_hash=lambda *args, **kwargs: None)
_stub("utils.clean_folder_files", clean_directory=limpiados.append)

_spec = importlib.util.spec_from_file_location("config_handler", RAIZ / "handler" / "config_handler.py")
config_handler = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(config_handler)

from utils.consts.consts import STATUS_ERROR, STATUS_OK  # noqa: E402
from utils.rabbitMQ.rabbit_consts import (  # noqa: E402
    EXECUTION_ALGORITHM_KEY,
    EXECUTION_VISUALIZATION_KEY,
    NOTIFY_EXECUTION,
    NOTIFY_VISUALIZATION,
    RESULTS_DONE_KEY,
)


class RabbitFalso:
    """Solo publica: el handler se suscribe a las notificaciones una vez, al arrancar (WEB-222)."""

    def __init__(self):
        self.publicados = []

    async def publish(self, exchange, routing_key, message):
        self.publicados.append((routing_key, json.loads(message)))

    def con_clave(self, clave):
        return [m for k, m in self.publicados if k == clave]


def mensaje(**contenido):
    return json.dumps({"status": STATUS_OK, "message": "", "content": contenido}).encode()


def datos_configuracion(request_hash, **cambios):
    return {
        "file": f"/app/config/data/{request_hash}.nc", "requestHash": request_hash, "variableName": "geopotential",
        "pressureLevel": ["500"], "years": ["2022"], "months": ["03"], "days": ["14"], "hours": ["12"],
        "areaCovered": ["90", "-180", "-90", "180"], "mapTypes": ["comb"], "mapLevels": ["20"], "fileFormat": "png",
        "noData": False, "noMaps": False, "omp": False, "mpi": False, "nThreads": None, "nProces": None, **cambios,
    }


def configuracion(request_hash, **cambios):
    return mensaje(**datos_configuracion(request_hash, **cambios))


class ConfigHandlerTest(unittest.TestCase):
    def setUp(self):
        self.rabbit = RabbitFalso()
        self.handler = config_handler.ConfigHandler(self.rabbit)
        limpiados.clear()

    def notificar(self, tipo, request_hash, estado, texto=""):
        manejador = (
            self.handler.handle_execution_message if tipo == NOTIFY_EXECUTION else self.handler.handle_map_generation_message
        )
        asyncio.run(manejador(mensaje(request_type=tipo, request_hash=request_hash, exec_status=estado, exec_message=texto)))

    def test_error_de_ejecucion_se_notifica_a_la_api(self):
        asyncio.run(self.handler.handle_config_message(configuracion("h1")))
        self.notificar(NOTIFY_EXECUTION, "h1", STATUS_ERROR, "segfault")

        resultados = self.rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertEqual(resultados[0]["content"]["requestHash"], "h1")
        self.assertIn("segfault", resultados[0]["content"]["content"])

    def test_error_de_mapas_se_notifica_a_la_api(self):
        asyncio.run(self.handler.handle_config_message(configuracion("h1")))
        self.notificar(NOTIFY_EXECUTION, "h1", STATUS_OK)
        self.notificar(NOTIFY_VISUALIZATION, "h1", STATUS_ERROR, "cartopy")

        resultados = self.rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertIn("cartopy", resultados[0]["content"]["content"])

    def test_cada_paso_publica_sin_volver_a_suscribirse(self):
        # Antes, process_file y process_map_generation llamaban otra vez a consume(NOTIFICATIONS_QUEUE).
        asyncio.run(self.handler.handle_config_message(configuracion("h1")))
        self.notificar(NOTIFY_EXECUTION, "h1", STATUS_OK)

        self.assertEqual(len(self.rabbit.con_clave(EXECUTION_ALGORITHM_KEY)), 1)
        self.assertEqual(len(self.rabbit.con_clave(EXECUTION_VISUALIZATION_KEY)), 1)

    def test_peticiones_simultaneas_no_se_pisan(self):
        asyncio.run(self.handler.handle_config_message(configuracion("a", noMaps=True)))
        asyncio.run(self.handler.handle_config_message(configuracion("b")))

        self.notificar(NOTIFY_EXECUTION, "a", STATUS_OK)

        resultados = self.rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual([r["content"]["requestHash"] for r in resultados], ["a"])
        self.assertEqual(resultados[0]["status"], STATUS_OK)
        self.assertEqual(self.rabbit.con_clave(EXECUTION_VISUALIZATION_KEY), [], "a no pidió mapas")
        self.assertEqual(limpiados, ["./out/a"])

        self.notificar(NOTIFY_EXECUTION, "b", STATUS_OK)
        mapas = self.rabbit.con_clave(EXECUTION_VISUALIZATION_KEY)
        self.assertEqual([m["content"]["request_hash"] for m in mapas], ["b"])


class ComandoEjecucionTest(unittest.TestCase):
    """WEB-218: el portal lanzaba siempre ./FAST-IBAN (serie) y pasaba None como hilos o procesos."""

    AREA = ["/app/config/data/h.nc", "-90", "90", "-180", "180", "./out/h/"]

    def comando(self, **cambios):
        handler = config_handler.ConfigHandler(RabbitFalso())
        with mock.patch.object(config_handler.os, "cpu_count", return_value=8):
            cmd = handler.prepare_execution_command(datos_configuracion("h", **cambios), [-90, 90], [-180, 180])
        self.assertTrue(all(isinstance(arg, str) for arg in cmd), f"subprocess exige texto: {cmd}")
        return cmd

    def test_serie(self):
        self.assertEqual(self.comando(), ["./FAST-IBAN", *self.AREA, "1"])

    def test_openmp_usa_su_binario_y_todos_los_nucleos_por_defecto(self):
        self.assertEqual(self.comando(omp=True), ["./FAST-IBAN_omp", *self.AREA, "8"])

    def test_openmp_respeta_los_hilos_pedidos(self):
        self.assertEqual(self.comando(omp=True, nThreads=3), ["./FAST-IBAN_omp", *self.AREA, "3"])

    def test_mpi_usa_mpirun_y_su_binario(self):
        self.assertEqual(self.comando(mpi=True), ["mpirun", "-n", "8", "./FAST-IBAN_mpi", *self.AREA, "1"])
        self.assertEqual(self.comando(mpi=True, nProces=3), ["mpirun", "-n", "3", "./FAST-IBAN_mpi", *self.AREA, "1"])

    def test_hibrido_reparte_los_nucleos_entre_procesos_e_hilos(self):
        self.assertEqual(
            self.comando(omp=True, mpi=True), ["mpirun", "-n", "2", "./FAST-IBAN_omp_mpi", *self.AREA, "4"]
        )

    def test_temperatura_solo_tiene_version_en_serie(self):
        # code_t solo compila el binario en serie.
        self.assertEqual(self.comando(variableName="temperature", omp=True, mpi=True), ["./FAST-IBAN", *self.AREA, "1"])


if __name__ == "__main__":
    unittest.main()
