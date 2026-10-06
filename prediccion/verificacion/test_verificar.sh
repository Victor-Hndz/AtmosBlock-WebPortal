#!/usr/bin/env bash
# PRD-504: lógica de verificar.sh con gh y verificar.py simulados (sin red ni GitHub).
# Uso: bash prediccion/verificacion/test_verificar.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"

# gh simulado: "release view <tag> --json" lista $SUBIDOS; "release download <tag> -p <n> -D <dir>" crea <n> si está
# en $DISPONIBLES y si no falla; todo se anota en $LOG
cat >"$T/bin/gh" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"$LOG"
if [[ $1 == release && $2 == view && $* == *--json* ]]; then printf '%s\n' $SUBIDOS; fi
if [[ $1 == release && $2 == download ]]; then
  [[ " $DISPONIBLES " == *" $5 "* ]] || exit 1
  mkdir -p "$7" && touch "$7/$5"
fi
exit 0
EOF
# verificar.py simulado: 1 con $FALLA ("aifs:20260928"); 3 (pendiente) si falta algún ERA5 de la ventana o el
# producto; si no, crea el registro
cat >"$T/py" <<'EOF'
#!/usr/bin/env bash
f=$3; m=$5; p=$7; e=$9; s=${13}
[[ " $FALLA " == *" $m:$f "* ]] && exit 1
[[ -f $p/producto_${m}_${f}.nc ]] || exit 3
for k in $(seq -4 15); do [[ -f $e/z500_era5_$(date -u -d "$f $k day" +%Y%m%d)_00z_hn_1p25.nc ]] || exit 3; done
mkdir -p "$s" && touch "$s/verificacion_${m}_${f}.nc"
EOF
chmod +x "$T/bin/gh" "$T/py"

era5() { for k in $(seq -4 15); do printf 'z500_era5_%s_00z_hn_1p25.nc ' "$(date -u -d "20260928 $k day" +%Y%m%d)"; done; }
COMPLETO="producto_ifs_20260928.nc producto_aifs_20260928.nc $(era5)"
SIN_ULTIMO_ERA5="producto_ifs_20260928.nc producto_aifs_20260928.nc $(era5 | sed 's/z500_era5_20261013_00z_hn_1p25.nc //')"

errores=0
caso() { # caso <nombre> <código> <SUBIDOS> <DISPONIBLES> <FALLA> <patrón en gh.log> [patrón que no]
  : >"$T/gh.log"
  rm -rf "$T/verif"
  (cd "$T" && PATH="$T/bin:$PATH" PY="$T/py" LOG="$T/gh.log" DESDE=20260928 HASTA=20260928 SUBIDOS="$3" \
    DISPONIBLES="$4" FALLA="$5" bash "$AQUI/verificar.sh" >"$T/salida.txt" 2>&1)
  local rc=$?
  if [[ $rc -ne $2 ]] || { [[ -n $6 ]] && ! grep -q -- "$6" "$T/gh.log"; } ||
    { [[ -n ${7:-} ]] && grep -q -- "$7" "$T/gh.log"; }; then
    echo "FALLA: $1 (código $rc, esperado $2)"; cat "$T/salida.txt" "$T/gh.log"; errores=$((errores + 1))
  else
    echo "ok: $1"
  fi
}

caso "registra los dos modelos y los sube" 0 "" "$COMPLETO" "" \
  "release upload verificacion-2026-09 verif/salida/verificacion_aifs_20260928.nc"
caso "baja la ventana ERA5 de su mes" 0 "" "$COMPLETO" "" \
  "release download era5-2026-10 -p z500_era5_20261013_00z_hn_1p25.nc"
caso "omite lo ya verificado" 0 "verificacion_ifs_20260928.nc" "$COMPLETO" "" \
  "upload verificacion-2026-09 verif/salida/verificacion_aifs" "verificacion_ifs_20260928.nc$"
caso "sin la ventana ERA5 completa queda pendiente" 0 "" "$SIN_ULTIMO_ERA5" "" "release download" "release upload"
caso "sin producto no verifica" 0 "" "$(era5)" "" "release download" "release upload"
caso "un fallo del cálculo hace fallar el job" 1 "" "$COMPLETO" "aifs:20260928" \
  "upload verificacion-2026-09 verif/salida/verificacion_ifs" "verificacion_aifs_20260928.nc$"

exit $((errores > 0 ? 1 : 0))
