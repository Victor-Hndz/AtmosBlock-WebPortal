#!/usr/bin/env bash
# PRD-504: archiva ERA5 Z500 de 00 UTC (la verdad de la verificación) en el release mensual era5-AAAA-MM. Por defecto,
# los 12 días que acaban en hoy−5 (ERA5T llega con unos 5 días de retraso); omite lo ya subido. Un día de los 7 más
# recientes que aún no esté en el CDS solo avisa; uno anterior que falle hace fallar el job (clave o licencia del CDS).
# Cada petición tiene $ESPERA_CDS segundos: desde el 2026-11-03 el CDS acepta la del día más reciente y no la sirve
# (las demás tardan ~3 min), y sin límite agotaba el tiempo del workflow; una cortada cuenta como no disponible y
# termina la tanda. Es un retraso del CDS, no un fallo de clave: solo avisa, salvo que el día sea el último de la ventana
# de 12 (hoy−16), que ya no se vuelve a pedir (el 14-11-2026 se colgó en 3 ejecuciones seguidas).
# Uso: FECHA="AAAAMMDD [AAAAMMDD...]" bash prediccion/verificacion/subir_era5.sh
#      (requiere gh con GH_TOKEN, y CDSAPI_URL y CDSAPI_KEY para el CDS)
set -euo pipefail

PY=${PY:-.venv/bin/python}
ESPERA_CDS=${ESPERA_CDS:-600}
if [[ -z ${FECHA:-} ]]; then
  fechas=""
  for k in $(seq 16 -1 5); do fechas+=" $(date -u -d "-$k day" +%Y%m%d)"; done
else
  fechas=$FECHA
fi
reciente=$(date -u -d "-7 day" +%Y%m%d)
ultimo=$(date -u -d "-16 day" +%Y%m%d) # el día más antiguo de la ventana: después de hoy no se vuelve a pedir
fallos=0

for f in $fechas; do
  [[ $f =~ ^[0-9]{8}$ ]] || { echo "::error::fecha no válida: $f"; exit 2; }
  tag="era5-${f:0:4}-${f:4:2}"
  if ! gh release view "$tag" >/dev/null 2>&1; then
    gh release create "$tag" --prerelease --title "ERA5 Z500 ${f:0:4}-${f:4:2}" --notes \
      "ERA5 Z500 a 00 UTC (primera versión disponible, ERA5T), hemisferio norte a 1,25°: la verdad de la \
verificación del producto de bloqueo. Contains modified Copernicus Climate Change Service information."
  fi
  n="z500_era5_${f}_00z_hn_1p25.nc"
  if gh release view "$tag" --json assets -q '.assets[].name' | grep -qx "$n"; then
    echo "ya archivado: $n"
    continue
  fi
  rc=0
  timeout "$ESPERA_CDS" "$PY" prediccion/verificacion/era5.py --fecha "$f" --salida era5 || rc=$?
  if [[ $rc -eq 0 ]]; then
    gh release upload "$tag" "era5/$n"
  elif [[ $f > $reciente || ($rc -eq 124 && $f > $ultimo) ]]; then
    echo "::warning::$n aún no disponible en el CDS o sin respuesta; se reintenta en la siguiente ejecución"
  else
    echo "::error::no se pudo archivar $n"
    fallos=$((fallos + 1))
  fi
  # Tras una petición colgada, las siguientes se quedan también en «accepted» (19–23 de noviembre: cada ejecución
  # sirvió una petición nueva y la siguiente se colgó): se paran aquí y siguen en la próxima ejecución, que encuentra
  # la colgada ya servida.
  if [[ $rc -eq 124 ]]; then
    echo "::warning::el CDS no sirvió $n en ${ESPERA_CDS} s; los días que faltan se piden en la siguiente ejecución"
    break
  fi
done

exit $((fallos > 0 ? 1 : 0))
