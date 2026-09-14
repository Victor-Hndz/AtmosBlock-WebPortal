"""WEB-207: un mensaje de ejecución inválido o un fallo inesperado se notifica como error y no tumba el consumidor.

Uso: python backend/FAST-IBAN_Project/execution/handler/test_exec_handler.py
"""
import asyncio
import importlib.util
import json
import pathlib
import sys
import types
import unittest
from unittest import mock

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))


def _stub(nombre, **atributos):
    """Sustituye un módulo con dependencias externas (aio_pika, minio, dotenv) que el test no necesita."""
    modulo = types.ModuleType(nombre)
    modulo.__dict__.update(atributos)
    sys.modules.setdefault(nombre, modulo)


_stub("dotenv", load_dotenv=lambda *args, **kwargs: None)
_stub("utils.rabbitMQ.rabbitmq", RabbitMQ=object)
_stub("utils.minio.upload_files", upload_files_to_request_hash=lambda *args, **kwargs: None)

_spec = importlib.util.spec_from_file_location("exec_handler", RAIZ / "execution" / "handler" / "exec_handler.py")
exec_handler = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(exec_handler)

from utils.consts.consts import STATUS_ERROR  # noqa: E402
from utils.rabbitMQ.process_body import process_body  # noqa: E402


class RabbitFalso:
    def __init__(self):
        self.publicados = []

    async def publish(self, exchange, routing_key, message):
        self.publicados.append(json.loads(message))

    def errores(self):
        return [m["content"] for m in self.publicados if m["content"].get("exec_status") == STATUS_ERROR]


def mensaje(**contenido):
    return json.dumps({"status": "OK", "message": "", "content": contenido}).encode()


class ProcessBodyTest(unittest.TestCase):
    def test_json_invalido_lanza_valueerror_y_no_systemexit(self):
        # SystemExit no es Exception: el wrapper del consumidor no lo captura y el proceso terminaba.
        with self.assertRaises(ValueError):
            process_body(b"{esto no es json")


class ExecHandlerTest(unittest.TestCase):
    def test_variable_desconocida_notifica_error_sin_compilar(self):
        rabbit = RabbitFalso()
        with mock.patch.object(exec_handler.subprocess, "run") as run, mock.patch.object(
            exec_handler.subprocess, "Popen"
        ) as popen:
            ok = asyncio.run(
                exec_handler.handle_message(mensaje(request_hash="h1", variable_name="humidity", cmd=["./x"]), rabbit)
            )

        self.assertFalse(ok)
        run.assert_not_called()
        popen.assert_not_called()
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertIn("humidity", rabbit.errores()[0]["exec_message"])

    def test_fallo_inesperado_notifica_error(self):
        rabbit = RabbitFalso()
        with mock.patch.object(exec_handler.os, "makedirs"), mock.patch.object(
            exec_handler.subprocess, "run", side_effect=FileNotFoundError("cmake no encontrado")
        ):
            ok = asyncio.run(
                exec_handler.handle_message(mensaje(request_hash="h1", variable_name="geopotential", cmd=["./x"]), rabbit)
            )

        self.assertFalse(ok)
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertIn("cmake no encontrado", rabbit.errores()[0]["exec_message"])


if __name__ == "__main__":
    unittest.main()
