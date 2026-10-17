"""Ejecución del núcleo: errores notificados sin tumbar el consumidor (WEB-207), argv construido aquí a partir de
parámetros validados y nunca un comando recibido por la cola (V5/WEB-301) y binario según el paralelismo pedido (WEB-218).

Uso: python backend/FAST-IBAN_Project/execution/handler/test_exec_handler.py
"""
import asyncio
import hashlib
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

# La API genera el hash con SHA-256 en hexadecimal (requests.service.ts).
HASH = hashlib.sha256(b"h1").hexdigest()
FICHERO = "/app/config/data/area_90_-180_-90_180/geopotential_500hPa_2022-03-(14)_12UTC.nc"


class RabbitFalso:
    def __init__(self):
        self.publicados = []

    async def publish(self, exchange, routing_key, message):
        self.publicados.append(json.loads(message))

    def errores(self):
        return [m["content"] for m in self.publicados if m["content"].get("exec_status") == STATUS_ERROR]


def mensaje(**contenido):
    return json.dumps({"status": "OK", "message": "", "content": contenido}).encode()


def parametros(**cambios):
    """Lo que publica el handler de configuración a la cola de ejecución."""
    return {
        "request_hash": HASH, "variable_name": "geopotential", "file": FICHERO,
        "lat_min": -90, "lat_max": 90, "lon_min": -180, "lon_max": 180,
        "omp": False, "mpi": False, "n_threads": None, "n_proces": None, **cambios,
    }


def ejecutar(contenido, rabbit):
    """Lanza handle_message con cmake, el build y el núcleo simulados (devuelven 0). Devuelve (ok, run, popen)."""
    with mock.patch.object(exec_handler.os, "makedirs"), mock.patch.object(
        exec_handler.os, "cpu_count", return_value=8
    ), mock.patch.object(exec_handler.subprocess, "run") as run, mock.patch.object(
        exec_handler.subprocess, "Popen"
    ) as popen:
        run.return_value.returncode = 0
        popen.return_value.communicate.return_value = ("", "")
        popen.return_value.returncode = 0
        ok = asyncio.run(exec_handler.handle_message(mensaje(**contenido), rabbit))
    return ok, run, popen


class ProcessBodyTest(unittest.TestCase):
    def test_json_invalido_lanza_valueerror_y_no_systemexit(self):
        # SystemExit no es Exception: el wrapper del consumidor no lo captura y el proceso terminaba.
        with self.assertRaises(ValueError):
            process_body(b"{esto no es json")


class ExecHandlerTest(unittest.TestCase):
    def test_variable_desconocida_notifica_error_sin_compilar(self):
        rabbit = RabbitFalso()
        ok, run, popen = ejecutar(parametros(variable_name="humidity"), rabbit)

        self.assertFalse(ok)
        run.assert_not_called()
        popen.assert_not_called()
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertIn("humidity", rabbit.errores()[0]["exec_message"])
        # WEB-222: el handler enruta la notificación a su petición por el hash.
        self.assertEqual(rabbit.errores()[0]["request_hash"], HASH)

    def test_fallo_inesperado_notifica_error(self):
        rabbit = RabbitFalso()
        with mock.patch.object(exec_handler.os, "makedirs"), mock.patch.object(
            exec_handler.subprocess, "run", side_effect=FileNotFoundError("cmake no encontrado")
        ):
            ok = asyncio.run(exec_handler.handle_message(mensaje(**parametros()), rabbit))

        self.assertFalse(ok)
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertIn("cmake no encontrado", rabbit.errores()[0]["exec_message"])


class ComandoRecibidoTest(unittest.TestCase):
    """V5/WEB-301: exec_handler ejecutaba data["cmd"] tal cual; quien publicase en la cola ejecutaba lo que quisiera."""

    def test_ignora_el_cmd_del_mensaje_y_ejecuta_el_nucleo_con_los_parametros(self):
        rabbit = RabbitFalso()
        ok, run, _ = ejecutar(parametros(cmd=["/bin/sh", "-c", "echo pwned"]), rabbit)

        self.assertTrue(ok)
        self.assertEqual(rabbit.errores(), [])
        self.assertEqual(
            run.call_args_list[-1].args[0],
            ["./FAST-IBAN", FICHERO, "-90", "90", "-180", "180", f"./out/{HASH}/", "1"],
        )
        for llamada in run.call_args_list:
            self.assertNotIn("/bin/sh", llamada.args[0])


class ParametrosInvalidosTest(unittest.TestCase):
    """V5/WEB-301: los parámetros llegan por la cola; se validan antes de compilar o ejecutar nada."""

    INVALIDOS = {
        "fichero fuera de la carpeta de datos": {"file": "/etc/passwd"},
        "fichero que sale con ..": {"file": "/app/config/data/../../x.nc"},
        "fichero sin .nc": {"file": "/app/config/data/x.txt"},
        "fichero que no es texto": {"file": ["/app/config/data/x.nc"]},
        "latitud fuera de rango": {"lat_max": 91},
        "longitud fuera de rango": {"lon_min": -181},
        "latitud mínima mayor que la máxima": {"lat_min": 10, "lat_max": 0},
        "longitud mínima mayor que la máxima": {"lon_min": 10, "lon_max": 0},
        "latitud en texto": {"lat_min": "-90"},
        "latitud booleana": {"lat_min": True},
        "hilos en texto": {"omp": True, "n_threads": "4"},
        "hilos decimales": {"omp": True, "n_threads": 2.5},
        "cero hilos": {"omp": True, "n_threads": 0},
        "hilos booleanos": {"omp": True, "n_threads": True},
        "procesos negativos": {"mpi": True, "n_proces": -3},
        "omp que no es booleano": {"omp": "true"},
        "mpi que no es booleano": {"mpi": 1},
    }

    def test_parametros_invalidos_notifican_error_sin_compilar(self):
        for caso, cambios in self.INVALIDOS.items():
            with self.subTest(caso):
                rabbit = RabbitFalso()
                ok, run, popen = ejecutar(parametros(**cambios), rabbit)

                self.assertFalse(ok)
                run.assert_not_called()
                popen.assert_not_called()
                self.assertEqual(len(rabbit.errores()), 1)
                self.assertEqual(rabbit.errores()[0]["request_hash"], HASH)


class ComandoEjecucionTest(unittest.TestCase):
    """WEB-218: el portal lanzaba siempre ./FAST-IBAN (serie) y pasaba None como hilos o procesos."""

    AREA = [FICHERO, "-90", "90", "-180", "180", f"./out/{HASH}/"]

    def comando(self, **cambios):
        with mock.patch.object(exec_handler.os, "cpu_count", return_value=8):
            cmd = exec_handler.argv_de(parametros(**cambios))
        self.assertTrue(all(isinstance(arg, str) for arg in cmd), f"subprocess exige texto: {cmd}")
        return cmd

    def test_serie(self):
        self.assertEqual(self.comando(), ["./FAST-IBAN", *self.AREA, "1"])

    def test_openmp_usa_su_binario_y_todos_los_nucleos_por_defecto(self):
        self.assertEqual(self.comando(omp=True), ["./FAST-IBAN_omp", *self.AREA, "8"])

    def test_openmp_respeta_los_hilos_pedidos(self):
        self.assertEqual(self.comando(omp=True, n_threads=3), ["./FAST-IBAN_omp", *self.AREA, "3"])

    def test_mpi_usa_mpirun_y_su_binario(self):
        self.assertEqual(self.comando(mpi=True), ["mpirun", "-n", "8", "./FAST-IBAN_mpi", *self.AREA, "1"])
        self.assertEqual(self.comando(mpi=True, n_proces=3), ["mpirun", "-n", "3", "./FAST-IBAN_mpi", *self.AREA, "1"])

    def test_hibrido_reparte_los_nucleos_entre_procesos_e_hilos(self):
        self.assertEqual(
            self.comando(omp=True, mpi=True), ["mpirun", "-n", "2", "./FAST-IBAN_omp_mpi", *self.AREA, "4"]
        )

    def test_temperatura_solo_tiene_version_en_serie(self):
        # code_t solo compila el binario en serie.
        self.assertEqual(self.comando(variable_name="temperature", omp=True, mpi=True), ["./FAST-IBAN", *self.AREA, "1"])

    def test_hilos_y_procesos_por_encima_de_los_nucleos_se_recortan(self):
        self.assertEqual(self.comando(omp=True, n_threads=500), ["./FAST-IBAN_omp", *self.AREA, "8"])
        self.assertEqual(self.comando(mpi=True, n_proces=64), ["mpirun", "-n", "8", "./FAST-IBAN_mpi", *self.AREA, "1"])


if __name__ == "__main__":
    unittest.main()
