#!/usr/bin/env bash
# PRD-101: lógica de subir.sh con gh y archivar.py simulados (sin red ni GitHub).
# Uso: bash prediccion/archivo/test_subir.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"

# gh simulado: "release view <tag> --json" lista $SUBIDOS; el resto se anota en $T/gh.log
cat >"$T/bin/gh" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"$LOG"
if [[ $1 == release && $2 == view && $* == *--json* ]]; then printf '%s\n' $SUBIDOS; fi
exit 0
EOF
# archivar.py simulado: falla con los modelos/fechas de $FALLA ("aifs:20260101"), si no crea el fichero
cat >"$T/py" <<'EOF'
#!/usr/bin/env bash
f=$3; m=$5
[[ " $FALLA " == *" $m:$f "* ]] && exit 1
mkdir -p salida && touch "salida/z500_${m}_ens_${f}_00z_hn_1p25.nc"
EOF
chmod +x "$T/bin/gh" "$T/py"

errores=0
caso() { # caso <nombre> <código esperado> <FECHA> <SUBIDOS> <FALLA> <patrón que debe salir en gh.log> [patrón que no]
  : >"$T/gh.log"
  (cd "$T" && PATH="$T/bin:$PATH" PY="$T/py" LOG="$T/gh.log" FECHA="$3" SUBIDOS="$4" FALLA="$5" \
    bash "$AQUI/subir.sh" >"$T/salida.txt" 2>&1)
  local rc=$?
  if [[ $rc -ne $2 ]] || { [[ -n $6 ]] && ! grep -q -- "$6" "$T/gh.log"; } ||
    { [[ -n ${7:-} ]] && grep -q -- "$7" "$T/gh.log"; }; then
    echo "FALLA: $1 (código $rc, esperado $2)"; cat "$T/salida.txt" "$T/gh.log"; errores=$((errores + 1))
  else
    echo "ok: $1"
  fi
}

hoy=$(date -u +%Y%m%d)
caso "sube los dos modelos al release del mes" 0 20260115 "" "" \
  "release upload archivo-ens-2026-01 salida/z500_aifs_ens_20260115_00z_hn_1p25.nc"
caso "omite lo ya subido" 0 20260115 "z500_ifs_ens_20260115_00z_hn_1p25.nc" "" \
  "upload archivo-ens-2026-01 salida/z500_aifs" "z500_ifs_ens_20260115"
caso "un día anterior que falla hace fallar el job" 1 20260115 "" "aifs:20260115" \
  "upload archivo-ens-2026-01 salida/z500_ifs"
caso "hoy aún sin publicar solo avisa" 0 "$hoy" "" "aifs:$hoy" "release view"
caso "fecha mal formada" 2 "2026-01-15" "" "" "" "release"

exit $((errores > 0 ? 1 : 0))
