# Delta de detecciones por corrección

Cada corrección del núcleo en C se mide antes de actualizar la línea base de `regresion_hash`. Se usan dos casos:

| Caso | Contenido | Dónde |
|---|---|---|
| **Fijo** | ERA5 Z500, 2022-03-14, 00/06/12/18 UTC, 90°N–0°, 360° (4 pasos) | `backend/FAST-IBAN_Project/execution/code/tests/fixtures/` |
| **Largo** | ERA5 Z500, 2003-08-01…15, 00/06/12/18 UTC, 90°N–0°, 360° (60 pasos) | No versionado (62 MB). Se regenera con la misma petición al CDS y `adapt_netcdf` |

Ambos se ejecutan con `FAST-IBAN_omp <caso> 25 85 -180 180 out/ <hilos>`. La salida no depende del número de hilos (`invariancia_omp_*`).

## Resumen

| Bug | Tarea | Caso fijo | Caso largo: formaciones (OMEGA / REX) | Cambio |
|---|---|---|---|---|
| — | antes de la fase 1 (`35fa237`) | 1 OMEGA | 124 / 14 | — |
| B6 `t_total` sin inicializar | ALG-101 | sin cambios | sin cambios | 0 (solo afecta al fichero de tiempos) |
| B3 nueve `==` en la desambiguación Rex/Omega | ALG-102 | sin cambios | 124 / 14, CSV idénticos | **0**: en ningún paso un máximo tuvo a la vez candidato REX y par OMEGA |
| B4 `if` sin cuerpo en la rama derecha de `search_formation` | ALG-103 | sin cambios | 124 / 14 | **8 de 138 formaciones (5,8 %)** cambian el mínimo derecho, en 7 de 60 pasos |
| B5 emparejamiento MAX↔MIN dependiente del orden | ALG-107 | sin cambios | 124 / 14 | **10 de 138 formaciones (7,2 %)** cambian algún mínimo, en 9 de 60 pasos. La salida ya no depende del orden de los clusters (`invariancia_orden`) |

En las cuatro correcciones los puntos seleccionados y los clusters (`*_selected_*.csv`) son idénticos. Los contadores de `findIndex` no cambian: 1,88 % de las llamadas y 3,79 % de las interpolaciones.

## B4: formaciones que cambian (caso largo)

Antes, el `if(clusters[j].center.lat < selected_der.center.lat)` sin cuerpo se "comía" la evaluación del candidato derecho. Una vez elegido un mínimo derecho, solo se consideraban los que estaban más al sur, aunque tuvieran peor puntuación de distancia. Tras la corrección, la rama derecha evalúa igual que la izquierda.

| Paso | Máximo | Mínimo izq. | Mínimo der. antes → después |
|---|---|---|---|
| 36 | 1 | 10 | 9 → 2 |
| 37 | 2 | 14 | 11 → 4 |
| 45 | 1 | 7 | 13 → 3 |
| 46 | 2 | 3 | 18 → 4 |
| 48 | 2 | 4 | 7 → 6 |
| 50 | 1 | 8 | 7 → 9 |
| 50 | 13 | 25 | 28 → 27 |
| 51 | 10 | 22 | 16 → 11 |

Los identificadores son los índices de cluster de cada paso temporal.

## B5: regla de emparejamiento y formaciones que cambian (caso largo)

**Antes:** cada candidato se puntuaba con el mínimo del lado opuesto elegido hasta ese momento (INF si aún no había ninguno). Ambos lados compartían la misma "mejor puntuación", y el bonus ×0,95 se comparaba bonificado pero se guardaba sin bonificar. El resultado dependía del orden de los clusters: al invertirlo cambiaban 7 formaciones.

**Ahora** (dos pasadas):
1. En el recorrido de contornos solo se reúnen los candidatos válidos de cada lado, sin duplicados. Las condiciones de validez no cambian.
2. Se elige la pareja (izquierdo, derecho) con menor distancia media del triángulo máximo–izquierdo–derecho.
   - **Empates:** menor `id` izquierdo y, después, menor `id` derecho.

**Bonus ×0,95 retirado.** Se probó una versión que lo aplicaba si el mínimo más al norte de la pareja quedaba por debajo de la latitud del máximo. Como los candidatos ya exigen latitud ≤ la del máximo, solo podía actuar con un mínimo exactamente a la latitud del máximo. Medido: 0 formaciones distintas con y sin bonus en los 60 pasos del caso largo y en los dos casos fijos. Redefinirlo con un umbral nuevo sería introducir un parámetro sin validar, así que se quita.

| Paso | Máximo | Mínimo izq. antes → después | Mínimo der. antes → después |
|---|---|---|---|
| 13 | 3 | 12 → 10 | 4 |
| 38 | 1 | 6 → 15 | 4 |
| 44 | 1 | 5 → 2 | 9 → 3 |
| 45 | 1 | 7 → 2 | 3 |
| 50 | 11 | 25 | 17 → 14 |
| 50 | 13 | 25 | 27 → 28 |
| 51 | 2 | 7 | 25 → 20 |
| 55 | 7 | 14 | 15 → 12 |
| 55 | 9 | 16 → 13 | 18 |
| 56 | 5 | 13 | 15 → 12 |
