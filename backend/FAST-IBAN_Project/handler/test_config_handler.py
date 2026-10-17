"""Handler de configuración: errores notificados a la API (WEB-211), peticiones independientes (WEB-222)
y parámetros, no un comando, hacia la cola de ejecución (V5/WEB-301).

Uso: python backend/FAST-IBAN_Project/handler/test_config_handler.py
"""
import asyncio
import hashlib
import importlib.util
import json
import pathlib
import sys
import types
import unittest

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


# La API genera el hash con SHA-256 en hexadecimal (requests.service.ts); process_body rechaza otros (V14).
H1, A, B = (hashlib.sha256(nombre.encode()).hexdigest() for nombre in ("h1", "a", "b"))


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
        asyncio.run(self.handler.handle_config_message(configuracion(H1)))
        self.notificar(NOTIFY_EXECUTION, H1, STATUS_ERROR, "segfault")

        resultados = self.rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertEqual(resultados[0]["content"]["requestHash"], H1)
        self.assertIn("segfault", resultados[0]["content"]["content"])

    def test_error_de_mapas_se_notifica_a_la_api(self):
        asyncio.run(self.handler.handle_config_message(configuracion(H1)))
        self.notificar(NOTIFY_EXECUTION, H1, STATUS_OK)
        self.notificar(NOTIFY_VISUALIZATION, H1, STATUS_ERROR, "cartopy")

        resultados = self.rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertIn("cartopy", resultados[0]["content"]["content"])

    def test_cada_paso_publica_sin_volver_a_suscribirse(self):
        # Antes, process_file y process_map_generation llamaban otra vez a consume(NOTIFICATIONS_QUEUE).
        asyncio.run(self.handler.handle_config_message(configuracion(H1)))
        self.notificar(NOTIFY_EXECUTION, H1, STATUS_OK)

        self.assertEqual(len(self.rabbit.con_clave(EXECUTION_ALGORITHM_KEY)), 1)
        self.assertEqual(len(self.rabbit.con_clave(EXECUTION_VISUALIZATION_KEY)), 1)

    def test_peticiones_simultaneas_no_se_pisan(self):
        asyncio.run(self.handler.handle_config_message(configuracion(A, noMaps=True)))
        asyncio.run(self.handler.handle_config_message(configuracion(B)))

        self.notificar(NOTIFY_EXECUTION, A, STATUS_OK)

        resultados = self.rabbit.con_clave(RESULTS_DONE_KEY)
        self.assertEqual([r["content"]["requestHash"] for r in resultados], [A])
        self.assertEqual(resultados[0]["status"], STATUS_OK)
        self.assertEqual(self.rabbit.con_clave(EXECUTION_VISUALIZATION_KEY), [], "a no pidió mapas")
        self.assertEqual(limpiados, [f"./out/{A}"])

        self.notificar(NOTIFY_EXECUTION, B, STATUS_OK)
        mapas = self.rabbit.con_clave(EXECUTION_VISUALIZATION_KEY)
        self.assertEqual([m["content"]["request_hash"] for m in mapas], [B])


class MensajeEjecucionTest(unittest.TestCase):
    """V5/WEB-301: el handler mandaba el argv completo (data["cmd"]) y exec_handler lo ejecutaba tal cual."""

    def publicado(self, **cambios):
        rabbit = RabbitFalso()
        asyncio.run(config_handler.ConfigHandler(rabbit).handle_config_message(configuracion(H1, **cambios)))
        (enviado,) = rabbit.con_clave(EXECUTION_ALGORITHM_KEY)
        return enviado["content"]

    def test_publica_parametros_y_no_un_comando(self):
        self.assertEqual(
            self.publicado(),
            {
                "request_hash": H1, "variable_name": "geopotential", "file": f"/app/config/data/{H1}.nc",
                "lat_min": -90, "lat_max": 90, "lon_min": -180, "lon_max": 180,
                "omp": False, "mpi": False, "n_threads": None, "n_proces": None,
            },
        )

    def test_paralelismo_pedido_tal_cual(self):
        contenido = self.publicado(variableName="Geopotential", omp=1, mpi=True, nThreads=3, nProces=2)
        self.assertNotIn("cmd", contenido)
        self.assertEqual(contenido["variable_name"], "geopotential")
        self.assertEqual(
            (contenido["omp"], contenido["mpi"], contenido["n_threads"], contenido["n_proces"]), (True, True, 3, 2)
        )


if __name__ == "__main__":
    unittest.main()
