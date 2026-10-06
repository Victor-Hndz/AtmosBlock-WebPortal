#!/usr/bin/env bash
# PRD-506: publicar_resumen.sh con gh y resumen.py simulados y un repositorio git local como gh-pages (sin red).
# Uso: bash prediccion/verificacion/test_publicar_resumen.sh
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
mkdir -p "$T/bin"

# gh simulado: "release list" da $TAGS; "release download <tag> -p <patrón> -D <dir>" crea los registros de $REGISTROS
# de ese mes
cat >"$T/bin/gh" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"$LOG"
if [[ $1 == release && $2 == list ]]; then printf '%s\n' $TAGS; fi
if [[ $1 == release && $2 == download ]]; then
  mes=${3#verificacion-}; mes=${mes/-/}
  mkdir -p "$7"
  for r in $REGISTROS; do [[ $r == *_${mes}??.nc ]] && touch "$7/$r"; done
fi
exit 0
EOF
# resumen.py simulado: escribe en --salida cuántos registros hay en --registros
cat >"$T/py" <<'EOF'
#!/usr/bin/env bash
echo "{\"registros\": $(ls "$3" | wc -l)}" >"$5"
EOF
chmod +x "$T/bin/gh" "$T/py"

git init -q --bare -b gh-pages "$T/origen.git"
git clone -q "$T/origen.git" "$T/semilla" 2>/dev/null
mkdir -p "$T/semilla/prediccion" && echo '{}' >"$T/semilla/prediccion/index.json"
git -C "$T/semilla" add -A && git -C "$T/semilla" commit -qm inicio && git -C "$T/semilla" push -q origin HEAD:gh-pages

errores=0
comprobar() { if eval "$2"; then echo "ok: $1"; else echo "FALLA: $1"; cat "$T/salida.txt"; errores=$((errores + 1)); fi; }
publicar() {
  rm -rf "$T/paginas" "$T/registros" && git clone -q -b gh-pages "$T/origen.git" "$T/paginas"
  (cd "$T" && PATH="$T/bin:$PATH" PY="$T/py" LOG="$T/gh.log" TAGS="$1" REGISTROS="$2" PAGINAS="$T/paginas" \
    bash "$AQUI/publicar_resumen.sh" >"$T/salida.txt" 2>&1)
}
en_origen() { git -C "$T/origen.git" show "gh-pages:$1" 2>/dev/null; }
commits() { git -C "$T/origen.git" rev-list --count gh-pages; }

publicar "archivo-ens-2026-09 verificacion-2026-09 verificacion-2026-10 producto-ens-2026-10" \
  "verificacion_ifs_20260928.nc verificacion_aifs_20260928.nc verificacion_ifs_20261001.nc"
comprobar "baja los registros de todos los meses y publica el resumen" \
  '[[ $(en_origen prediccion/verificacion.json | tr -d " \n") == "{\"registros\":3}" ]]'
comprobar "solo de los releases de verificación" '! grep -q "download producto-ens" "$T/gh.log"'
antes=$(commits)
publicar "verificacion-2026-09 verificacion-2026-10" \
  "verificacion_ifs_20260928.nc verificacion_aifs_20260928.nc verificacion_ifs_20261001.nc"
comprobar "sin cambios no hace commit" '[[ $(commits) == "$antes" ]]'
publicar "archivo-ens-2026-09" ""
comprobar "sin registros publica un resumen vacío" \
  '[[ $(en_origen prediccion/verificacion.json | tr -d " \n") == "{\"registros\":0}" ]]'

exit $((errores > 0 ? 1 : 0))
