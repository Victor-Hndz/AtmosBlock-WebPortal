"""Depósito mensual en Zenodo: flujo de la API con las peticiones simuladas (sin red ni token real).

Uso: python prediccion/zenodo/test_depositar.py
"""
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import depositar  # noqa: E402

TITULO = depositar.titulo(2026)


class Zenodo:
    """Zenodo simulado: guarda las peticiones y responde como la API de depósitos."""

    def __init__(self, existentes=()):
        self.existentes = list(existentes)  # [{"id", "title", "state", "files"}]
        self.llamadas = []

    def __call__(self, metodo, url, token, cuerpo=None, datos=None):
        self.llamadas.append((metodo, url.split("/api")[-1], cuerpo))
        ruta = url.split("/api")[-1]
        if metodo == "GET" and ruta.startswith("/deposit/depositions?"):
            return [{"id": d["id"], "title": d["title"], "metadata": {"title": d["title"]}, "state": d["state"]}
                    for d in self.existentes]
        if metodo == "POST" and ruta == "/deposit/depositions":
            return {"id": 100, "links": {"bucket": "https://z/api/files/b100"}, "files": []}
        if metodo == "POST" and ruta.endswith("/actions/newversion"):
            return {"links": {"latest_draft": "https://z/api/deposit/depositions/101"}}
        if metodo == "GET" and ruta == "/deposit/depositions/101":
            previo = self.existentes[0].get("files", [])
            return {"id": 101, "links": {"bucket": "https://z/api/files/b101"}, "files": previo}
        if metodo == "POST" and ruta.endswith("/actions/publish"):
            return {"doi": "10.5281/zenodo.101", "links": {"html": "https://zenodo.org/records/101"}}
        return {}


def carpeta(*nombres):
    d = tempfile.TemporaryDirectory()
    for n in nombres:
        (pathlib.Path(d.name) / n).write_bytes(b"x" * 10)
    return d


class Flujo(unittest.TestCase):
    def ejecutar(self, zenodo, *extra):
        d = carpeta("z500_ifs_ens_20261001_00z_hn_1p25.nc", "producto_ifs_20261001.json")
        self.addCleanup(d.cleanup)
        with mock.patch.object(depositar, "peticion", zenodo):
            return depositar.main(["--mes", "2026-10", "--carpeta", d.name, *extra], token="t")

    def test_sin_registro_crea_un_borrador_sin_publicar(self):
        z = Zenodo()
        self.assertEqual(self.ejecutar(z), 0)
        rutas = [(m, r) for m, r, _ in z.llamadas]
        self.assertIn(("POST", "/deposit/depositions"), rutas)
        self.assertIn(("PUT", "/files/b100/z500_ifs_ens_20261001_00z_hn_1p25.nc"), rutas)
        self.assertIn(("PUT", "/deposit/depositions/100"), rutas)
        self.assertFalse(any(r.endswith("/publish") for _, r in rutas))

    def test_metadatos(self):
        z = Zenodo()
        self.ejecutar(z)
        meta = next(j for m, r, j in z.llamadas if m == "PUT" and r == "/deposit/depositions/100")["metadata"]
        self.assertEqual((meta["title"], meta["upload_type"], meta["license"], meta["version"]),
                         (TITULO, "dataset", "cc-by-4.0", "2026-10"))
        self.assertIn("Contains modified ECMWF open data", meta["description"])
        self.assertTrue(meta["creators"])

    def test_con_registro_publicado_crea_una_version_nueva(self):
        z = Zenodo([{"id": 90, "title": TITULO, "state": "done"}])
        self.ejecutar(z)
        rutas = [(m, r) for m, r, _ in z.llamadas]
        self.assertIn(("POST", "/deposit/depositions/90/actions/newversion"), rutas)
        self.assertIn(("PUT", "/files/b101/producto_ifs_20261001.json"), rutas)

    def test_no_resube_lo_que_ya_tiene_la_version(self):
        z = Zenodo([{"id": 90, "title": TITULO, "state": "done",
                     "files": [{"filename": "producto_ifs_20261001.json", "filesize": 10}]}])
        self.ejecutar(z)
        subidos = [r for m, r, _ in z.llamadas if m == "PUT" and r.startswith("/files/")]
        self.assertEqual(subidos, ["/files/b101/z500_ifs_ens_20261001_00z_hn_1p25.nc"])

    def test_publicar(self):
        z = Zenodo()
        self.ejecutar(z, "--publicar")
        self.assertIn(("POST", "/deposit/depositions/100/actions/publish"), [(m, r) for m, r, _ in z.llamadas])

    def test_sandbox(self):
        self.assertEqual(depositar.base(True), "https://sandbox.zenodo.org/api")
        self.assertEqual(depositar.base(False), "https://zenodo.org/api")

    def test_sin_token_falla(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(depositar.main(["--mes", "2026-10", "--carpeta", d], token=""), 2)


if __name__ == "__main__":
    unittest.main()
