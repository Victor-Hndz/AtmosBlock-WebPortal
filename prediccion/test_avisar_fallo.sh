#!/usr/bin/env bash
# Avisos de fallo de los workflows de la previsión: avisar_fallo.sh con gh simulado (sin red ni GitHub).
# Uso: bash prediccion/test_avisar_fallo.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"

# gh simulado: "issue list" devuelve $ABIERTO (número del issue abierto con ese título, o nada); el resto se anota
cat >"$T/bin/gh" <<'EOS'
#!/usr/bin/env bash
echo "$*" >>"$LOG"
if [[ $1 == issue && $2 == list ]]; then printf '%s' "$ABIERTO"; fi
exit 0
EOS
chmod +x "$T/bin/gh"

errores=0
caso() { # caso <nombre> <ABIERTO> <patrón en gh.log> [patrón que no]
  : >"$T/gh.log"
  PATH="$T/bin:$PATH" LOG="$T/gh.log" ABIERTO="$2" WORKFLOW="Archivo ENS" \
    RUN_URL="https://github.com/o/r/actions/runs/42" bash "$AQUI/avisar_fallo.sh" >"$T/salida.txt" 2>&1
  local rc=$?
  if [[ $rc -ne 0 ]] || ! grep -q -- "$3" "$T/gh.log" || { [[ -n ${4:-} ]] && grep -q -- "$4" "$T/gh.log"; }; then
    echo "FALLA: $1 (código $rc)"; cat "$T/salida.txt" "$T/gh.log"; errores=$((errores + 1))
  else
    echo "ok: $1"
  fi
}

caso "sin issue abierto, crea uno con la etiqueta" "" "issue create --title Fallo del workflow «Archivo ENS» --label prediccion-fallo" "issue comment"
caso "con uno abierto, lo comenta" "17" "issue comment 17 --body" "issue create"
caso "el aviso enlaza la ejecución" "" "actions/runs/42"
caso "crea la etiqueta si no existe" "" "label create prediccion-fallo"

exit $((errores > 0 ? 1 : 0))
