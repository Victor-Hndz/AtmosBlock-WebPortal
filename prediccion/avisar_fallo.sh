#!/usr/bin/env bash
# Avisa de un fallo de un workflow de la previsión con un issue (etiqueta prediccion-fallo): lo abre si no hay uno
# abierto para ese workflow y, si lo hay, lo comenta, para no llenar el repositorio de issues repetidos.
# Uso: WORKFLOW="nombre" RUN_URL="url de la ejecución" bash prediccion/avisar_fallo.sh   (requiere gh con GH_TOKEN)
set -euo pipefail

ETIQUETA=prediccion-fallo
titulo="Fallo del workflow «$WORKFLOW»"
cuerpo="Ha fallado la ejecución $RUN_URL ($(date -u +%Y-%m-%dT%H:%MZ))."

gh label create "$ETIQUETA" --color D93F0B --description "Fallo de un workflow de la previsión de bloqueos" \
  --force >/dev/null
abierto=$(gh issue list --state open --label "$ETIQUETA" --json number,title \
  -q ".[] | select(.title == \"$titulo\") | .number" | head -1)
if [[ -n $abierto ]]; then
  gh issue comment "$abierto" --body "$cuerpo"
else
  gh issue create --title "$titulo" --label "$ETIQUETA" --body "$cuerpo

Revisa el log de la ejecución. Si el fallo es del archivo de un día anterior, ese día puede perderse: ECMWF solo
conserva 2–3 días. Cierra este issue cuando esté resuelto; el siguiente fallo abrirá uno nuevo."
fi
