"""Ejecución del núcleo: errores notificados sin tumbar el consumidor (WEB-207), argv construido aquí a partir de
parámetros validados y nunca un comando recibido por la cola (V5/WEB-301), hash de petición validado en la entrada
de todos los consumidores (V14/WEB-302), binario según el paralelismo pedido (WEB-218) y núcleo lanzado sin
bloquear el bucle de eventos, con tiempo máximo y con los CPU del contenedor (V15/WEB-304), ya compilado en la imagen
(WEB-303).

Uso: python backend/FAST-IBAN_Project/execution/handler/test_exec_handler.py
"""
import asyncio
import contextlib
import hashlib
import importlib.util
import json
import os
import pathlib
import signal
import sys
import tempfile
import time
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


class ProcesoFalso:
    """Proceso de asyncio.create_subprocess_exec simulado: tarda `segundos` (None: no termina hasta que lo maten)."""

    def __init__(self, pid, segundos=0):
        self.pid, self.segundos, self.returncode, self.matado = pid, segundos, None, False
        self._fin = asyncio.Event()

    async def communicate(self):
        if self.segundos is None:
            await self._fin.wait()
        else:
            await asyncio.sleep(self.segundos)
            self.returncode = 0
        return b"", b""

    def kill(self):
        self.matado, self.returncode = True, -9
        self._fin.set()

    async def wait(self):
        await self._fin.wait()
        return self.returncode


def lanzador(segundos_nucleo):
    """create_subprocess_exec falso: el núcleo tarda segundos_nucleo. Devuelve (mock, procesos)."""
    procesos = {}

    async def crear(*argv, **kwargs):
        proceso = ProcesoFalso(1000 + len(procesos), segundos_nucleo)
        procesos[proceso.pid] = proceso
        return proceso

    return mock.Mock(side_effect=crear), procesos


def ejecutar(contenido, rabbit):
    """Lanza handle_message con el núcleo simulado (termina con 0). Devuelve (ok, argvs)."""
    crear, _ = lanzador(0)
    with mock.patch.object(exec_handler, "cpus_disponibles", return_value=8), mock.patch.object(
        exec_handler.asyncio, "create_subprocess_exec", crear
    ):
        ok = asyncio.run(exec_handler.handle_message(mensaje(**contenido), rabbit))
    return ok, [list(llamada.args) for llamada in crear.call_args_list]


class ProcessBodyTest(unittest.TestCase):
    def test_json_invalido_lanza_valueerror_y_no_systemexit(self):
        # SystemExit no es Exception: el wrapper del consumidor no lo captura y el proceso terminaba.
        with self.assertRaises(ValueError):
            process_body(b"{esto no es json")

    def test_hash_invalido_lanza_valueerror(self):
        # V14: el hash acaba en rutas de disco (./out/<hash>) y en claves de MinIO.
        for invalido in ["../../etc", HASH.upper(), HASH[:63], HASH + "0", None, 7]:
            with self.subTest(hash=invalido), self.assertRaises(ValueError):
                process_body(mensaje(request_hash=invalido))
        with self.assertRaises(ValueError):
            process_body(mensaje(otro="sin hash"))

    def test_acepta_request_hash_y_requesthash_en_texto(self):
        self.assertEqual(process_body(mensaje(request_hash=HASH))["request_hash"], HASH)
        # La API manda el contenido como texto JSON y con requestHash (configurador).
        cuerpo = json.dumps({"status": "OK", "message": "", "content": json.dumps({"requestHash": HASH})}).encode()
        self.assertEqual(process_body(cuerpo)["requestHash"], HASH)

    def test_contenido_que_no_es_un_objeto_lanza_valueerror(self):
        cuerpo = json.dumps({"status": "OK", "message": "", "content": json.dumps([HASH])}).encode()
        with self.assertRaises(ValueError):
            process_body(cuerpo)


class ExecHandlerTest(unittest.TestCase):
    def test_variable_desconocida_notifica_error_sin_ejecutar(self):
        rabbit = RabbitFalso()
        ok, lanzados = ejecutar(parametros(variable_name="humidity"), rabbit)

        self.assertFalse(ok)
        self.assertEqual(lanzados, [])
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertIn("humidity", rabbit.errores()[0]["exec_message"])
        # WEB-222: el handler enruta la notificación a su petición por el hash.
        self.assertEqual(rabbit.errores()[0]["request_hash"], HASH)

    def test_fallo_inesperado_notifica_error(self):
        # WEB-303: si la imagen se construyó sin el binario, la petición acaba en error en vez de colgarse.
        rabbit = RabbitFalso()
        with mock.patch.object(
            exec_handler.asyncio, "create_subprocess_exec", side_effect=FileNotFoundError("./FAST-IBAN no encontrado")
        ):
            ok = asyncio.run(exec_handler.handle_message(mensaje(**parametros()), rabbit))

        self.assertFalse(ok)
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertIn("./FAST-IBAN no encontrado", rabbit.errores()[0]["exec_message"])


class ComandoRecibidoTest(unittest.TestCase):
    """V5/WEB-301: exec_handler ejecutaba data["cmd"] tal cual; quien publicase en la cola ejecutaba lo que quisiera."""

    def test_ignora_el_cmd_del_mensaje_y_ejecuta_el_nucleo_con_los_parametros(self):
        rabbit = RabbitFalso()
        ok, lanzados = ejecutar(parametros(cmd=["/bin/sh", "-c", "echo pwned"]), rabbit)

        self.assertTrue(ok)
        self.assertEqual(rabbit.errores(), [])
        self.assertEqual(
            lanzados[-1],
            ["./FAST-IBAN", FICHERO, "-90", "90", "-180", "180", f"./out/{HASH}/", "1"],
        )
        for argv in lanzados:
            self.assertNotIn("/bin/sh", argv)


class NucleoCompiladoEnLaImagenTest(unittest.TestCase):
    """WEB-303: cada petición recompilaba el núcleo con el gcc del contenedor; ahora el binario viene en la imagen."""

    def test_una_peticion_lanza_solo_el_nucleo(self):
        rabbit = RabbitFalso()
        ok, lanzados = ejecutar(parametros(), rabbit)

        self.assertTrue(ok)
        self.assertEqual(lanzados, [["./FAST-IBAN", FICHERO, "-90", "90", "-180", "180", f"./out/{HASH}/", "1"]])
        # El progreso total de la ejecución no cambia al quitar el paso de compilación.
        progreso = [m["content"]["increment"] for m in rabbit.publicados if "increment" in m["content"]]
        self.assertEqual(sum(progreso), 2)


class HashInvalidoTest(unittest.TestCase):
    """V14/WEB-302: un hash con ../ salía de ./out al compilar la ruta de salida o al limpiarla."""

    def test_hash_invalido_no_ejecuta_ni_publica(self):
        for invalido in ["../../etc", HASH.upper(), HASH[:63], None]:
            with self.subTest(hash=invalido):
                rabbit = RabbitFalso()
                with self.assertRaises(ValueError):
                    ejecutar(parametros(request_hash=invalido), rabbit)
                self.assertEqual(rabbit.publicados, [])

        rabbit = RabbitFalso()
        contenido = parametros()
        del contenido["request_hash"]
        with self.assertRaises(ValueError):
            ejecutar(contenido, rabbit)
        self.assertEqual(rabbit.publicados, [])

    def test_hash_invalido_no_llama_a_subprocess(self):
        with mock.patch.object(exec_handler.asyncio, "create_subprocess_exec") as crear:
            with self.assertRaises(ValueError):
                asyncio.run(exec_handler.handle_message(mensaje(**parametros(request_hash="../../etc")), RabbitFalso()))
        crear.assert_not_called()


class ParametrosInvalidosTest(unittest.TestCase):
    """V5/WEB-301: los parámetros llegan por la cola; se validan antes de ejecutar nada."""

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

    def test_parametros_invalidos_notifican_error_sin_ejecutar(self):
        for caso, cambios in self.INVALIDOS.items():
            with self.subTest(caso):
                rabbit = RabbitFalso()
                ok, lanzados = ejecutar(parametros(**cambios), rabbit)

                self.assertFalse(ok)
                self.assertEqual(lanzados, [])
                self.assertEqual(len(rabbit.errores()), 1)
                self.assertEqual(rabbit.errores()[0]["request_hash"], HASH)


class ComandoEjecucionTest(unittest.TestCase):
    """WEB-218: el portal lanzaba siempre ./FAST-IBAN (serie) y pasaba None como hilos o procesos."""

    AREA = [FICHERO, "-90", "90", "-180", "180", f"./out/{HASH}/"]

    def comando(self, **cambios):
        with mock.patch.object(exec_handler, "cpus_disponibles", return_value=8):
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


def subprocess_sincrono(segundos_nucleo):
    """subprocess.run y Popen parcheados (versión síncrona): si se vuelve a ella, el test falla sin lanzar el núcleo."""

    def run(cmd, **kwargs):
        time.sleep(segundos_nucleo)
        return mock.Mock(returncode=0, stdout="", stderr="")

    pila = contextlib.ExitStack()
    pila.enter_context(mock.patch("subprocess.run", side_effect=run))
    popen = pila.enter_context(mock.patch("subprocess.Popen"))
    popen.return_value.communicate.return_value = ("", "")
    popen.return_value.returncode = 0
    return pila


class TiempoAgotadoTest(unittest.TestCase):
    """V15/WEB-304: el núcleo se lanzaba sin timeout; una ejecución colgada bloqueaba el consumidor para siempre."""

    def test_nucleo_que_no_termina_se_mata_y_notifica_error(self):
        rabbit = RabbitFalso()
        crear, procesos = lanzador(None)
        with contextlib.ExitStack() as pila:
            pila.enter_context(mock.patch.object(exec_handler, "TIMEOUT_NUCLEO", 0.1, create=True))
            pila.enter_context(mock.patch.object(exec_handler.asyncio, "create_subprocess_exec", crear))
            pila.enter_context(subprocess_sincrono(0.3))
            if hasattr(os, "killpg"):  # POSIX: se mata el grupo (mpirun lanza hijos); en Windows, proc.kill()
                killpg = pila.enter_context(
                    mock.patch.object(exec_handler.os, "killpg", side_effect=lambda pid, sig: procesos[pid].kill())
                )
            # Guarda externa: si el handler no corta el núcleo, el test falla en vez de colgar la suite.
            ok = asyncio.run(asyncio.wait_for(exec_handler.handle_message(mensaje(**parametros()), rabbit), 5))

        self.assertFalse(ok, "el núcleo superó el tiempo máximo y no se cortó")
        self.assertEqual(len(rabbit.errores()), 1)
        self.assertEqual(rabbit.errores()[0]["request_hash"], HASH)
        self.assertIn("Tiempo de ejecución agotado", rabbit.errores()[0]["exec_message"])
        nucleo = procesos[max(procesos)]
        self.assertTrue(nucleo.matado)
        # Sin sesión propia, killpg no alcanza a los hijos de mpirun.
        self.assertTrue(crear.call_args.kwargs.get("start_new_session"))
        if hasattr(os, "killpg"):
            killpg.assert_called_once_with(nucleo.pid, signal.SIGKILL)


class BucleNoBloqueadoTest(unittest.TestCase):
    """V15/WEB-304: subprocess síncrono bloqueaba el bucle; sin heartbeats, RabbitMQ re-entregaba el mensaje."""

    def test_el_bucle_avanza_mientras_corre_el_nucleo(self):
        crear, _ = lanzador(0.3)

        async def escenario():
            ticks = 0

            async def reloj():
                nonlocal ticks
                while True:
                    await asyncio.sleep(0.05)
                    ticks += 1

            tarea = asyncio.create_task(reloj())
            await asyncio.sleep(0)
            ok = await exec_handler.handle_message(mensaje(**parametros()), RabbitFalso())
            tarea.cancel()
            return ok, ticks

        with mock.patch.object(exec_handler.asyncio, "create_subprocess_exec", crear), subprocess_sincrono(0.3):
            ok, ticks = asyncio.run(escenario())

        self.assertTrue(ok)
        self.assertGreaterEqual(ticks, 3, "el bucle de eventos no avanzó mientras corría el núcleo")


class CpusDisponiblesTest(unittest.TestCase):
    """V15/WEB-304: os.cpu_count() ve los CPU del host, no el límite del contenedor (cgroup v2, cpu.max)."""

    def cpus(self, contenido, cpu_count=8):
        with tempfile.TemporaryDirectory() as carpeta, mock.patch.object(
            exec_handler.os, "cpu_count", return_value=cpu_count
        ):
            ruta = os.path.join(carpeta, "cpu.max")
            if contenido is not None:
                with open(ruta, "w") as f:
                    f.write(contenido)
            return exec_handler.cpus_disponibles(ruta)

    def test_cuota_del_cgroup(self):
        self.assertEqual(self.cpus("400000 100000\n"), 4)

    def test_cuota_fraccionaria_redondea_hacia_arriba(self):
        self.assertEqual(self.cpus("150000 100000\n"), 2)

    def test_sin_limite_usa_los_cpu_del_sistema(self):
        self.assertEqual(self.cpus("max 100000\n"), 8)

    def test_nunca_mas_que_los_cpu_del_sistema(self):
        self.assertEqual(self.cpus("1600000 100000\n"), 8)

    def test_fichero_inexistente_o_ilegible(self):
        self.assertEqual(self.cpus(None), 8)
        self.assertEqual(self.cpus("basura"), 8)
        self.assertEqual(self.cpus(None, cpu_count=None), 1)


if __name__ == "__main__":
    unittest.main()
