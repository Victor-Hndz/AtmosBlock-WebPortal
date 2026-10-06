#!/usr/bin/env bash
# PRD-506: baja todos los registros de los releases verificacion-AAAA-MM, calcula el resumen de puntuaciones
# (resumen.py) y lo publica en la rama gh-pages clonada en $PAGINAS como prediccion/verificacion.json, para el portal.
# Sin cambios no hace commit.
# Uso: PAGINAS=paginas bash prediccion/verificacion/publicar_resumen.sh   (requiere gh con GH_TOKEN)
set -euo pipefail

PY=${PY:-.venv/bin/python}
PAGINAS=${PAGINAS:-paginas}
mkdir -p registros "$PAGINAS/prediccion"

for tag in $(gh release list --limit 1000 --json tagName -q '.[].tagName' | grep '^verificacion-' || true); do
  gh release download "$tag" -p "verificacion_*.nc" -D registros --skip-existing
done
"$PY" prediccion/verificacion/resumen.py --registros registros --salida "$PAGINAS/prediccion/verificacion.json"

git -C "$PAGINAS" add -A
if git -C "$PAGINAS" diff --cached --quiet; then
  echo "sin cambios en el resumen"
  exit 0
fi
git -C "$PAGINAS" commit -q -m "chore(pages): resumen de la verificación de la previsión de bloqueos"
git -C "$PAGINAS" push -q origin HEAD:gh-pages
