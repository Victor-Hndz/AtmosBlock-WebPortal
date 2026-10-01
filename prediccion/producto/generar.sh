#!/usr/bin/env bash
# PRD-303: genera el producto de las pasadas pedidas (por defecto hoy y ayer, UTC) con lo archivado y lo sube al
# release mensual producto-ens-AAAA-MM. Usa los ficheros de $ARCHIVO y baja de los releases archivo-ens-* los que
# falten: IFS y AIFS del día y la historia IFS de los 4 días anteriores. Omite lo ya subido. Un modelo aún sin
# archivar solo avisa (lo recoge la siguiente ejecución); un fallo del cálculo hace fallar el job.
# Uso: FECHA="AAAAMMDD [AAAAMMDD...]" bash prediccion/producto/generar.sh   (requiere gh con GH_TOKEN)
set -euo pipefail

PY=${PY:-.venv/bin/python}
ARCHIVO=${ARCHIVO:-archivo}
fechas=${FECHA:-"$(date -u +%Y%m%d) $(date -u -d yesterday +%Y%m%d)"}
fallos=0
nombre() { echo "z500_${1}_ens_${2}_00z_hn_1p25.nc"; }

for f in $fechas; do
  [[ $f =~ ^[0-9]{8}$ ]] || { echo "::error::fecha no válida: $f"; exit 2; }
  tag="producto-ens-${f:0:4}-${f:4:2}"
  if ! gh release view "$tag" >/dev/null 2>&1; then
    gh release create "$tag" --prerelease --title "Producto ENS de bloqueo ${f:0:4}-${f:4:2}" --notes \
      "Producto experimental de ocupación de sectores por eventos de bloqueo (índice de Davini + eventos de \
blocktrack, sectores de Matsueda 2009) sobre IFS ENS y AIFS ENS de 00 UTC. Diagnostica la previsión; su habilidad no está verificada. \
Contains modified ECMWF open data, licencia CC-BY-4.0: https://www.ecmwf.int/en/forecasts/datasets/open-data"
  fi
  subidos=$(gh release view "$tag" --json assets -q '.assets[].name')

  necesarios="$(nombre ifs "$f") $(nombre aifs "$f")"
  for k in 1 2 3 4; do necesarios="$necesarios $(nombre ifs "$(date -u -d "$f -$k day" +%Y%m%d)")"; done
  for n in $necesarios; do
    [[ $n =~ _([0-9]{8})_00z ]] && d=${BASH_REMATCH[1]}
    [[ -f $ARCHIVO/$n ]] || gh release download "archivo-ens-${d:0:4}-${d:4:2}" -p "$n" -D "$ARCHIVO" 2>/dev/null ||
      echo "sin archivar: $n"
  done

  for m in ifs aifs; do
    base="producto_${m}_${f}"
    if grep -qx "$base.json" <<<"$subidos"; then echo "ya generado: $base"; continue; fi
    if [[ ! -f $ARCHIVO/$(nombre "$m" "$f") || ! -f $ARCHIVO/$(nombre ifs "$f") ]]; then
      echo "::warning::$base sin archivo del día; se reintenta en la siguiente ejecución"
      continue
    fi
    if "$PY" prediccion/producto/producto.py --fecha "$f" --modelo "$m" --archivo "$ARCHIVO" --salida producto; then
      gh release upload "$tag" "producto/$base.nc" "producto/$base.json" "producto/$base.png"
    else
      echo "::error::no se pudo generar $base"
      fallos=$((fallos + 1))
    fi
  done
done

exit $((fallos > 0 ? 1 : 0))
