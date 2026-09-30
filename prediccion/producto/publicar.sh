#!/usr/bin/env bash
# PRD-401: copia los JSON del producto de $PRODUCTO a la rama gh-pages clonada en $PAGINAS
# (prediccion/<modelo>/<fecha>.json), regenera prediccion/index.json y hace push. GitHub Pages lo sirve con CORS
# abierto para el portal; los PNG no se copian: el portal los enlaza del release (index.json lleva la plantilla).
# Sin cambios no hace commit.
# Uso: PAGINAS=paginas bash prediccion/producto/publicar.sh   (tras generar.sh, con gh-pages clonada en $PAGINAS)
set -euo pipefail

PRODUCTO=${PRODUCTO:-producto}
PAGINAS=${PAGINAS:-paginas}
REPO=${GITHUB_REPOSITORY:-Victor-Hndz/AtmosBlock-WebPortal}
shopt -s nullglob

for j in "$PRODUCTO"/producto_*_*.json; do
  [[ $(basename "$j") =~ ^producto_(ifs|aifs)_([0-9]{8})\.json$ ]] || continue
  mkdir -p "$PAGINAS/prediccion/${BASH_REMATCH[1]}"
  cp "$j" "$PAGINAS/prediccion/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}.json"
done

fechas() { # lista JSON de las fechas publicadas de un modelo, en orden
  local f=("$PAGINAS/prediccion/$1"/*.json) s=""
  for x in "${f[@]}"; do s+="${s:+, }\"$(basename "$x" .json)\""; done
  echo "[$s]"
}
cat >"$PAGINAS/prediccion/index.json" <<EOF
{
 "modelos": {"ifs": $(fechas ifs), "aifs": $(fechas aifs)},
 "png": "https://github.com/$REPO/releases/download/producto-ens-{aaaa}-{mm}/producto_{modelo}_{fecha}.png",
 "atribucion": "Contains modified ECMWF open data, CC-BY-4.0: https://www.ecmwf.int/en/forecasts/datasets/open-data"
}
EOF

git -C "$PAGINAS" add -A
if git -C "$PAGINAS" diff --cached --quiet; then
  echo "sin cambios en gh-pages"
  exit 0
fi
git -C "$PAGINAS" commit -q -m "chore(pages): datos de la previsión de bloqueos"
git -C "$PAGINAS" push -q origin HEAD:gh-pages
