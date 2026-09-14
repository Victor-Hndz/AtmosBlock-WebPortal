#!/usr/bin/env python3
"""WEB-208: .env.example documenta exactamente las variables de entorno que usa el proyecto.

Uso (desde la raíz del repo): python3 .github/scripts/check_env_example.py

Falla si una variable usada en docker-compose, en la configuración de NestJS o en el código Python
no está en .env.example, o si .env.example tiene variables que ya no se usan.
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

# Variables que leen librerías o imágenes, no nuestro código.
EXTERNAS = {
    "CDSAPI_URL",  # cdsapi (configurador)
    "CDSAPI_KEY",
}


def leer(ruta):
    return ruta.read_text(encoding="utf-8")


def usadas():
    variables = set(re.findall(r"\$\{([A-Z_][A-Z0-9_]*)", leer(RAIZ / "docker-compose.yml")))

    config = leer(RAIZ / "backend/nestjs/src/config/config.module.ts")
    variables |= set(re.findall(r"^\s+([A-Z_][A-Z0-9_]*): Joi\.", config, re.MULTILINE))

    for ts in (RAIZ / "backend/nestjs/src").rglob("*.ts"):
        if not ts.name.endswith(".spec.ts"):
            variables |= set(re.findall(r"configService\.get(?:<[^>]+>)?\(\s*\"([A-Z_][A-Z0-9_]*)\"", leer(ts)))

    for py in [*(RAIZ / "backend").rglob("*.py"), *(RAIZ / "cron_cleanup").rglob("*.py")]:
        if "node_modules" in py.parts or py.name.startswith("test_") or "fixtures" in py.parts:
            continue
        variables |= set(re.findall(r"os\.(?:getenv|environ\.get)\(\s*[\"']([A-Z_][A-Z0-9_]*)[\"']", leer(py)))
        variables |= set(re.findall(r"os\.environ\[\s*[\"']([A-Z_][A-Z0-9_]*)[\"']\s*\]", leer(py)))

    return variables | EXTERNAS


def documentadas():
    ejemplo = RAIZ / ".env.example"
    if not ejemplo.exists():
        return None
    return set(re.findall(r"^([A-Z_][A-Z0-9_]*)=", leer(ejemplo), re.MULTILINE))


def main():
    usadas_ = usadas()
    documentadas_ = documentadas()
    if documentadas_ is None:
        print("ERROR: falta .env.example en la raíz del repo")
        return 1

    faltan = sorted(usadas_ - documentadas_)
    sobran = sorted(documentadas_ - usadas_)
    if faltan:
        print("ERROR: variables usadas que faltan en .env.example:", ", ".join(faltan))
    if sobran:
        print("ERROR: variables de .env.example que ya no se usan:", ", ".join(sobran))
    if faltan or sobran:
        return 1

    print(f"OK: .env.example documenta las {len(usadas_)} variables usadas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
