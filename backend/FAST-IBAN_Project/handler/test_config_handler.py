"""WEB-211: un error de ejecución o de mapas se envía a la API como resultado con estado ERROR.

Uso: python backend/FAST-IBAN_Project/handler/test_config_handler.py
"""
import asyncio
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


_stub("dotenv", load_dotenv=lambda *args, **kwargs: None)
_stub("utils.rabbitMQ.rabbitmq", RabbitMQ=object)
_stub("utils.minio.upload_files", upload_files_to_request_hash=lambda *args, **kwargs: None)
_stub("utils.clean_folder_files", clean_directory=lambda *args, **kwargs: None)

_spec = importlib.util.spec_from_file_location("config_handler", RAIZ / "handler" / "config_handler.py")
config_handler = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(config_handler)

from utils.consts.consts import STATUS_ERROR, STATUS_OK  # noqa: E402
from utils.rabbitMQ.rabbit_consts import NOTIFY_EXECUTION, NOTIFY_VISUALIZATION, RESULTS_DONE_KEY  # noqa: E402


class RabbitFalso:
    def __init__(self):
        self.publicados = []

    async def publish(self, exchange, routing_key, message):
        self.publicados.append((routing_key, json.loads(message)))

    def resultados(self):
        return [m for clave, m in self.publicados if clave == RESULTS_DONE_KEY]


def mensaje(**contenido):
    return json.dumps({"status": STATUS_OK, "message": "", "content": contenido}).encode()


class ConfigHandlerErroresTest(unittest.TestCase):
    def _handler(self):
        rabbit = RabbitFalso()
        handler = config_handler.ConfigHandler(rabbit)
        handler.request_hash = "h1"
        return handler, rabbit

    def test_error_de_ejecucion_se_notifica_a_la_api(self):
        handler, rabbit = self._handler()

        asyncio.run(
            handler.handle_execution_message(
                mensaje(request_type=NOTIFY_EXECUTION, exec_status=STATUS_ERROR, exec_message="segfault")
            )
        )

        resultados = rabbit.resultados()
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertEqual(resultados[0]["content"]["requestHash"], "h1")
        self.assertIn("segfault", resultados[0]["content"]["content"])

    def test_error_de_mapas_se_notifica_a_la_api(self):
        handler, rabbit = self._handler()

        asyncio.run(
            handler.handle_map_generation_message(
                mensaje(request_type=NOTIFY_VISUALIZATION, exec_status=STATUS_ERROR, exec_message="cartopy")
            )
        )

        resultados = rabbit.resultados()
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]["status"], STATUS_ERROR)
        self.assertIn("cartopy", resultados[0]["content"]["content"])


if __name__ == "__main__":
    unittest.main()
