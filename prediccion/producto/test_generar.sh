#!/usr/bin/env bash
# PRD-303: lógica de generar.sh con gh y producto.py simulados (sin red ni GitHub).
# Uso: bash prediccion/producto/test_generar.sh
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
# producto.py simulado: falla con los modelos/fechas de $FALLA ("aifs:20260102"), si no crea las tres salidas
cat >"$T/py" <<'EOF'
#!/usr/bin/env bash
f=$3; m=$5; s=$9
[[ " $FALLA " == *" $m:$f "* ]] && exit 1
mkdir -p "$s" && touch "$s/producto_${m}_${f}".{nc,json,png}
EOF
chmod +x "$T/bin/gh" "$T/py"

a() { printf 'z500_%s_ens_%s_00z_hn_1p25.nc ' "$@"; }
COMPLETO="$(a ifs 20260102) $(a aifs 20260102) $(a ifs 20260101) $(a ifs 20251231) $(a ifs 20251230) $(a ifs 20251229)"

errores=0
caso() { # caso <nombre> <código> <FECHA> <SUBIDOS> <DISPONIBLES> <FALLA> <patrón en gh.log> [patrón que no]
  : >"$T/gh.log"
  rm -rf "$T/archivo" "$T/producto"
  (cd "$T" && PATH="$T/bin:$PATH" PY="$T/py" LOG="$T/gh.log" FECHA="$3" SUBIDOS="$4" DISPONIBLES="$5" FALLA="$6" \
    REGENERAR="${REGENERAR:-}" bash "$AQUI/generar.sh" >"$T/salida.txt" 2>&1)
  local rc=$?
  if [[ $rc -ne $2 ]] || { [[ -n $7 ]] && ! grep -q -- "$7" "$T/gh.log"; } ||
    { [[ -n ${8:-} ]] && grep -q -- "$8" "$T/gh.log"; }; then
    echo "FALLA: $1 (código $rc, esperado $2)"; cat "$T/salida.txt" "$T/gh.log"; errores=$((errores + 1))
  else
    echo "ok: $1"
  fi
}

caso "sube las tres salidas al release del mes" 0 20260102 "" "$COMPLETO" "" \
  "release upload producto-ens-2026-01 producto/producto_aifs_20260102.nc producto/producto_aifs_20260102.json producto/producto_aifs_20260102.png"
caso "baja la historia del release del mes anterior" 0 20260102 "" "$COMPLETO" "" \
  "release download archivo-ens-2025-12 -p z500_ifs_ens_20251229_00z_hn_1p25.nc"
caso "no baja historia de AIFS" 0 20260102 "" "$COMPLETO" "" "" "z500_aifs_ens_20260101"
caso "omite lo ya generado" 0 20260102 "producto_ifs_20260102.json" "$COMPLETO" "" \
  "upload producto-ens-2026-01 producto/producto_aifs" "producto/producto_ifs"
caso "sin archivo del modelo solo avisa" 0 20260102 "" "$(a ifs 20260102)" "" \
  "upload producto-ens-2026-01 producto/producto_ifs" "producto/producto_aifs"
caso "un fallo del cálculo hace fallar el job" 1 20260102 "" "$COMPLETO" "aifs:20260102" \
  "upload producto-ens-2026-01 producto/producto_ifs" "producto/producto_aifs"
REGENERAR=1 caso "regenerar sustituye lo ya generado" 0 20260102 "producto_ifs_20260102.json" "$COMPLETO" "" \
  "producto/producto_ifs_20260102.json producto/producto_ifs_20260102.png --clobber"
caso "fecha mal formada" 2 "2026-01-02" "" "" "" "" "release"

exit $((errores > 0 ? 1 : 0))
