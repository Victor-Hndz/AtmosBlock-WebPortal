#!/usr/bin/env bash
# PRD-401: copia los JSON del producto de $PRODUCTO a la rama gh-pages clonada en $PAGINAS
# (prediccion/<modelo>/<fecha>.json y <fecha>_z500.json), regenera prediccion/index.json y hace push. GitHub Pages lo
# sirve con CORS abierto para el portal; los PNG no se copian: el portal los enlaza del release (index.json lleva la
# plantilla).
# Sin cambios no hace commit.
# Uso: PAGINAS=paginas bash prediccion/producto/publicar.sh   (tras generar.sh, con gh-pages clonada en $PAGINAS)
set -euo pipefail

PRODUCTO=${PRODUCTO:-producto}
PAGINAS=${PAGINAS:-paginas}
REPO=${GITHUB_REPOSITORY:-Victor-Hndz/AtmosBlock-WebPortal}
VISOR=$(cd "$(dirname "$0")/../pages" && pwd)
shopt -s nullglob

# PRD-508: el visor público (prediccion/pages) en la raíz de gh-pages; sin package.json ni tests
cp "$VISOR"/index.html "$VISOR"/*.css "$VISOR"/*.js "$PAGINAS/"

# el producto y el Z500 medio de las isolíneas del visor (<fecha>_z500.json)
for j in "$PRODUCTO"/producto_*_*.json; do
  [[ $(basename "$j") =~ ^producto_(ifs|aifs)_([0-9]{8})(_z500)?\.json$ ]] || continue
  mkdir -p "$PAGINAS/prediccion/${BASH_REMATCH[1]}"
  cp "$j" "$PAGINAS/prediccion/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}${BASH_REMATCH[3]}.json"
done

# Isolíneas: solo las de los DIAS_Z500 días más recientes de cada modelo, para que el sitio de Pages (límite de 1 GB)
# no crezca sin fin; los <fecha>.json y el índice se conservan todos. El visor trata una fecha podada como una sin ellas.
DIAS_Z500=30
for m in ifs aifs; do
  f=("$PAGINAS/prediccion/$m"/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].json)
  ((${#f[@]})) || continue
  desde=$(date -u -d "$(basename "${f[-1]}" .json) -$((DIAS_Z500 - 1)) days" +%Y%m%d)
  for z in "$PAGINAS/prediccion/$m"/*_z500.json; do
    if [[ $(basename "$z" _z500.json) < $desde ]]; then rm "$z"; fi
  done
done

fechas() { # lista JSON de las fechas publicadas de un modelo, en orden (solo <fecha>.json, sin los _z500)
  local f=("$PAGINAS/prediccion/$1"/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].json) s=""
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
