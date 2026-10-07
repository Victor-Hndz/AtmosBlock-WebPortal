#!/usr/bin/env bash
# Vigila que el archivo ENS no se haya saltado un día. Si GitHub no lanza un cron no hay fallo y avisar_fallo.sh no
# salta; esto lo detecta después: si al release del mes le falta el día de ayer (IFS o AIFS), abre o comenta el issue
# de «Archivo ENS». No falla: la ejecución que lo detecta ha ido bien. ECMWF solo conserva 2–3 días, así que hay que
# lanzar «Archivo ENS» a mano con esa fecha cuanto antes.
# Uso: RUN_URL="url de la ejecución" [FECHA=AAAAMMDD] bash prediccion/vigilar_archivo.sh   (requiere gh con GH_TOKEN)
set -euo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)

d=${FECHA:-$(date -u -d "-1 day" +%Y%m%d)}
[[ $d =~ ^[0-9]{8}$ ]] || { echo "fecha mal formada: $d" >&2; exit 2; }
hay=$(gh release view "archivo-ens-${d:0:4}-${d:4:2}" --json assets -q '.assets[].name' 2>/dev/null || true)
faltan=()
for m in ifs aifs; do
  n="z500_${m}_ens_${d}_00z_hn_1p25.nc"
  grep -qx "$n" <<<"$hay" || faltan+=("$n")
done
if [[ ${#faltan[@]} -eq 0 ]]; then
  echo "archivo ENS del $d completo"
  exit 0
fi
echo "::warning::falta el archivo ENS del $d: ${faltan[*]}"
WORKFLOW="Archivo ENS" DETALLE="Falta en el release el archivo ENS del $d (${faltan[*]}): ningún cron de «Archivo ENS» \
lo ha guardado. Lánzalo a mano con fecha=$d antes de que ECMWF lo retire. Detectado en $RUN_URL" \
  bash "$AQUI/avisar_fallo.sh"
