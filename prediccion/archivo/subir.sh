#!/usr/bin/env bash
# PRD-101: archiva las pasadas de 00 UTC pedidas (por defecto hoy y ayer, UTC) y las sube al release mensual
# archivo-ens-AAAA-MM. Omite lo que ya está subido, así que repetirlo no descarga nada de más.
# Hoy puede no estar publicado todavía (sobre todo AIFS): su fallo solo avisa. El de un día anterior hace fallar
# el job, porque el servidor de ECMWF solo guarda 2–3 días.
# Uso: FECHA="AAAAMMDD [AAAAMMDD...]" bash prediccion/archivo/subir.sh   (requiere gh con GH_TOKEN)
set -euo pipefail

PY=${PY:-.venv/bin/python}
hoy=$(date -u +%Y%m%d)
fechas=${FECHA:-"$hoy $(date -u -d yesterday +%Y%m%d)"}
fallos=0

for f in $fechas; do
  [[ $f =~ ^[0-9]{8}$ ]] || { echo "::error::fecha no válida: $f"; exit 2; }
  tag="archivo-ens-${f:0:4}-${f:4:2}"
  if ! gh release view "$tag" >/dev/null 2>&1; then
    gh release create "$tag" --prerelease --title "Archivo ENS Z500 ${f:0:4}-${f:4:2}" --notes \
      "Z500 de IFS ENS y AIFS ENS (50 miembros, 00 UTC, 0–360 h cada 24 h), hemisferio norte a 1,25°. \
Contains modified ECMWF open data, licencia CC-BY-4.0: https://www.ecmwf.int/en/forecasts/datasets/open-data"
  fi
  subidos=$(gh release view "$tag" --json assets -q '.assets[].name')
  for m in ifs aifs; do
    n="z500_${m}_ens_${f}_00z_hn_1p25.nc"
    if grep -qx "$n" <<<"$subidos"; then echo "ya archivado: $n"; continue; fi
    if "$PY" prediccion/archivo/archivar.py --fecha "$f" --modelos "$m" --salida salida; then
      gh release upload "$tag" "salida/$n"
    elif [[ $f == "$hoy" ]]; then
      echo "::warning::$n aún no disponible; se reintenta en la siguiente ejecución"
    else
      echo "::error::no se pudo archivar $n"
      fallos=$((fallos + 1))
    fi
  done
done

exit $((fallos > 0 ? 1 : 0))
