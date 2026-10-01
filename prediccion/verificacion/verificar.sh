#!/usr/bin/env bash
# PRD-504: registra la verificación de cada pasada (IFS y AIFS) cuya ventana ERA5 d−4…d+15 ya está archivada y la
# sube al release mensual verificacion-AAAA-MM. Recorre las pasadas de $DESDE (la primera archivada) a $HASTA
# (hoy−20), baja de los releases el producto y el ERA5 que falten y omite lo ya registrado. Sin producto o sin la
# ventana ERA5 completa, la pasada queda pendiente (no es un error); un fallo del cálculo hace fallar el job.
# Uso: bash prediccion/verificacion/verificar.sh   (requiere gh con GH_TOKEN)
set -euo pipefail

PY=${PY:-.venv/bin/python}
DESDE=${DESDE:-20260928}
HASTA=${HASTA:-$(date -u -d "-20 day" +%Y%m%d)}
CLIMATOLOGIA=${CLIMATOLOGIA:-prediccion/verificacion/climatologia_era5_1991_2020.nc}
fallos=0
mkdir -p verif/producto verif/era5 verif/salida

bajar() { # bajar <tag> <fichero> <carpeta>: lo baja si no está; falla si el release no lo tiene
  [[ -f $3/$2 ]] || gh release download "$1" -p "$2" -D "$3" 2>/dev/null
}

f=$DESDE
while [[ ! $f > $HASTA ]]; do
  tag="verificacion-${f:0:4}-${f:4:2}"
  registrados=$(gh release view "$tag" --json assets -q '.assets[].name' 2>/dev/null || true)
  for m in ifs aifs; do
    n="verificacion_${m}_${f}.nc"
    if grep -qx "$n" <<<"$registrados"; then echo "ya verificado: $n"; continue; fi
    bajar "producto-ens-${f:0:4}-${f:4:2}" "producto_${m}_${f}.nc" verif/producto || { echo "sin producto: $n"; continue; }
    for k in $(seq -4 15); do
      d=$(date -u -d "$f $k day" +%Y%m%d)
      bajar "era5-${d:0:4}-${d:4:2}" "z500_era5_${d}_00z_hn_1p25.nc" verif/era5 || true
    done
    rc=0
    "$PY" prediccion/verificacion/verificar.py --fecha "$f" --modelo "$m" --producto verif/producto \
      --era5 verif/era5 --climatologia "$CLIMATOLOGIA" --salida verif/salida || rc=$?
    if [[ $rc -eq 0 ]]; then
      if ! gh release view "$tag" >/dev/null 2>&1; then
        gh release create "$tag" --prerelease --title "Verificación del producto de bloqueo ${f:0:4}-${f:4:2}" \
          --notes "Registros de verificación (producto frente a ERA5 y climatología 1991–2020) de las pasadas del mes.
Contains modified ECMWF open data (CC-BY-4.0) and modified Copernicus Climate Change Service information."
      fi
      gh release upload "$tag" "verif/salida/$n"
    elif [[ $rc -eq 3 ]]; then
      echo "pendiente: $n (falta ERA5 de la ventana)"
    else
      echo "::error::no se pudo verificar $n"
      fallos=$((fallos + 1))
    fi
  done
  f=$(date -u -d "$f +1 day" +%Y%m%d)
done

exit $((fallos > 0 ? 1 : 0))
