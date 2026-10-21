#!/usr/bin/env bash
# PRD-401: publicar.sh contra un repositorio git local que hace de origin con la rama gh-pages (sin red ni GitHub).
# Uso: bash prediccion/producto/test_publicar.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GITHUB_REPOSITORY=dueno/repo

git init -q --bare -b gh-pages "$T/origen.git"
git clone -q "$T/origen.git" "$T/semilla" 2>/dev/null
mkdir -p "$T/semilla/prediccion/ifs" && echo '{}' >"$T/semilla/prediccion/index.json"
echo '{}' >"$T/semilla/prediccion/ifs/20260928_z500.json" # isolíneas de una fecha sin producto: no es una fecha
# poda de las isolíneas: la fecha más nueva de ifs será 20260930, así que se conservan las de 20260901 en adelante
for f in 20260815 20260831 20260901; do
  echo '{}' >"$T/semilla/prediccion/ifs/$f.json"
  echo '{}' >"$T/semilla/prediccion/ifs/${f}_z500.json"
done
git -C "$T/semilla" add -A && git -C "$T/semilla" commit -qm inicio && git -C "$T/semilla" push -q origin HEAD:gh-pages

errores=0
comprobar() { # comprobar <nombre> <condición>
  if eval "$2"; then echo "ok: $1"; else echo "FALLA: $1"; cat "$T/salida.txt"; errores=$((errores + 1)); fi
}
publicar() {
  rm -rf "$T/paginas" && git clone -q -b gh-pages "$T/origen.git" "$T/paginas"
  (cd "$T" && PRODUCTO="$T/producto" PAGINAS="$T/paginas" bash "$AQUI/publicar.sh" >"$T/salida.txt" 2>&1)
}
en_origen() { git -C "$T/origen.git" show "gh-pages:$1" 2>/dev/null; }
commits() { git -C "$T/origen.git" rev-list --count gh-pages; }

mkdir -p "$T/producto"
for m in ifs aifs; do
  echo "{\"modelo\": \"$m\"}" >"$T/producto/producto_${m}_20260929.json"
  touch "$T/producto/producto_${m}_20260929".{nc,png}
done
echo '{"modelo": "ifs"}' >"$T/producto/producto_ifs_20260930.json"
echo '{"miembros": 50}' >"$T/producto/producto_aifs_20260929_z500.json"

publicar
comprobar "copia cada JSON a prediccion/<modelo>/<fecha>.json" \
  '[[ $(en_origen prediccion/aifs/20260929.json) == *aifs* && -n $(en_origen prediccion/ifs/20260930.json) ]]'
comprobar "copia el Z500 medio a prediccion/<modelo>/<fecha>_z500.json" \
  '[[ $(en_origen prediccion/aifs/20260929_z500.json) == *miembros* ]]'
comprobar "el índice no cuenta los _z500 como fechas" '! en_origen prediccion/index.json | grep -q _z500'
comprobar "poda los _z500 de más de 30 días antes de la fecha más nueva del modelo" \
  '[[ -z $(en_origen prediccion/ifs/20260815_z500.json) && -z $(en_origen prediccion/ifs/20260831_z500.json) &&
     -n $(en_origen prediccion/ifs/20260901_z500.json) && -n $(en_origen prediccion/ifs/20260928_z500.json) &&
     -n $(en_origen prediccion/aifs/20260929_z500.json) ]]'
comprobar "la poda no toca los <fecha>.json" \
  '[[ -n $(en_origen prediccion/ifs/20260815.json) && -n $(en_origen prediccion/ifs/20260831.json) ]]'
comprobar "no publica NetCDF ni PNG" '! git -C "$T/origen.git" ls-tree -r --name-only gh-pages | grep -qE "\.(nc|png)$"'
comprobar "índice con las fechas ordenadas por modelo" \
  'en_origen prediccion/index.json | tr -d " \n" | grep -qF "\"ifs\":[\"20260815\",\"20260831\",\"20260901\",\"20260929\",\"20260930\"],\"aifs\":[\"20260929\"]"'
comprobar "índice con la plantilla del PNG del release" \
  '[[ $(en_origen prediccion/index.json) == *github.com/dueno/repo/releases/download/producto-ens-{aaaa}-{mm}/producto_{modelo}_{fecha}.png* ]]'
comprobar "publica el visor en la raíz (sin package.json ni tests)" \
  '[[ $(en_origen index.html) == *visor.js* && -n $(en_origen logica.js) && -n $(en_origen visor.css) ]] &&
   ! git -C "$T/origen.git" ls-tree --name-only gh-pages | grep -qE "package.json|test_"'
antes=$(commits)
publicar
comprobar "sin cambios no hace commit" '[[ $(commits) == "$antes" ]]'
rm -rf "$T/producto"
publicar
comprobar "sin producto no falla ni hace commit" '[[ $? -eq 0 && $(commits) == "$antes" ]]'

exit $((errores > 0 ? 1 : 0))
