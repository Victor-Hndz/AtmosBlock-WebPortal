#!/usr/bin/env bash
# PRD-504: lógica de subir_era5.sh con gh y era5.py simulados (sin red, CDS ni GitHub).
# Uso: bash prediccion/verificacion/test_subir_era5.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"

# gh simulado: "release view <tag> --json" lista $SUBIDOS; el resto se anota en $LOG
cat >"$T/bin/gh" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"$LOG"
if [[ $1 == release && $2 == view && $* == *--json* ]]; then printf '%s\n' $SUBIDOS; fi
exit 0
EOF
# era5.py simulado: falla con las fechas de $FALLA, si no crea el fichero en --salida
cat >"$T/py" <<'EOF'
#!/usr/bin/env bash
f=$3; s=$5
[[ " $FALLA " == *" $f "* ]] && exit 1
mkdir -p "$s" && touch "$s/z500_era5_${f}_00z_hn_1p25.nc"
EOF
chmod +x "$T/bin/gh" "$T/py"

errores=0
caso() { # caso <nombre> <código> <FECHA> <SUBIDOS> <FALLA> <patrón en gh.log> [patrón que no]
  : >"$T/gh.log"
  (cd "$T" && PATH="$T/bin:$PATH" PY="$T/py" LOG="$T/gh.log" FECHA="$3" SUBIDOS="$4" FALLA="$5" \
    bash "$AQUI/subir_era5.sh" >"$T/salida.txt" 2>&1)
  local rc=$?
  if [[ $rc -ne $2 ]] || { [[ -n $6 ]] && ! grep -q -- "$6" "$T/gh.log"; } ||
    { [[ -n ${7:-} ]] && grep -q -- "$7" "$T/gh.log"; }; then
    echo "FALLA: $1 (código $rc, esperado $2)"; cat "$T/salida.txt" "$T/gh.log"; errores=$((errores + 1))
  else
    echo "ok: $1"
  fi
}

reciente=$(date -u -d "-5 day" +%Y%m%d)
caso "sube cada día al release de su mes" 0 "20260930 20261001" "" "" \
  "release upload era5-2026-10 era5/z500_era5_20261001_00z_hn_1p25.nc"
caso "omite lo ya subido" 0 "20260930" "z500_era5_20260930_00z_hn_1p25.nc" "" "release view" \
  "release upload"
caso "un día reciente que aún no está solo avisa" 0 "$reciente" "" "$reciente" "release view" "release upload"
caso "un día antiguo que falla hace fallar el job" 1 "20260920 20260921" "" "20260920" \
  "upload era5-2026-09 era5/z500_era5_20260921"
caso "fecha mal formada" 2 "2026-09-20" "" "" "" "release"
caso "por defecto, los 12 días hasta hoy−5" 0 "" "" "" \
  "upload era5-${reciente:0:4}-${reciente:4:2} era5/z500_era5_${reciente}_00z"

exit $((errores > 0 ? 1 : 0))
