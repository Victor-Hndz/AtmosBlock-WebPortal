#!/usr/bin/env bash
# Vigilancia del archivo ENS (un cron que GitHub no lanza no falla, así que nadie avisaría): vigilar_archivo.sh con
# gh simulado, sin red ni GitHub.
# Uso: bash prediccion/test_vigilar_archivo.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"

# gh simulado: "release view" devuelve $ASSETS; "issue list" no encuentra ningún issue abierto; todo se anota
cat >"$T/bin/gh" <<'EOS'
#!/usr/bin/env bash
echo "$*" >>"$LOG"
if [[ $1 == release && $2 == view ]]; then printf '%b' "$ASSETS"; fi
exit 0
EOS
chmod +x "$T/bin/gh"

errores=0
caso() { # caso <nombre> <ASSETS> <código esperado> <patrón en gh.log o -> [patrón que no]
  : >"$T/gh.log"
  PATH="$T/bin:$PATH" LOG="$T/gh.log" ASSETS="$2" FECHA="${FECHA_CASO:-20261006}" \
    RUN_URL="https://github.com/o/r/actions/runs/7" bash "$AQUI/vigilar_archivo.sh" >"$T/salida.txt" 2>&1
  local rc=$?
  if [[ $rc -ne $3 ]] || { [[ $4 != - ]] && ! grep -q -- "$4" "$T/gh.log"; } ||
    { [[ -n ${5:-} ]] && grep -q -- "$5" "$T/gh.log"; }; then
    echo "FALLA: $1 (código $rc)"; cat "$T/salida.txt" "$T/gh.log"; errores=$((errores + 1))
  else
    echo "ok: $1"
  fi
}

COMPLETO="z500_ifs_ens_20261006_00z_hn_1p25.nc\nz500_aifs_ens_20261006_00z_hn_1p25.nc\n"
caso "con IFS y AIFS de ese día no avisa" "$COMPLETO" 0 "release view archivo-ens-2026-10" "issue create"
caso "si falta AIFS, issue de «Archivo ENS» con el día que falta" "z500_ifs_ens_20261006_00z_hn_1p25.nc\n" 0 \
  "issue create --title Fallo del workflow «Archivo ENS»"
caso "el aviso dice qué fichero falta y cómo recuperarlo" "" 0 "z500_aifs_ens_20261006.*fecha=20261006"
caso "el aviso enlaza la ejecución que lo detectó" "" 0 "actions/runs/7"
FECHA_CASO=2026-10-06 caso "fecha mal formada" "$COMPLETO" 2 - "issue"

exit $((errores > 0 ? 1 : 0))
