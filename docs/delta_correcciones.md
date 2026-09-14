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
| B2 `BEARING_STEP` entero: 64 rayos cada 5° cubrían 320° | ALG-104 | puntos en clusters 1527 → 1379 (−9,7 %); sigue 1 OMEGA con otros clusters | **89 / 14** | **Grande:** OMEGA −28 %, puntos MAX −15,5 %, clusters −3,5 %. Ver sección B2 |

| B1 `findIndex`: igualdad de floats en barrido lineal, sin vuelta en longitud | ALG-105 | puntos en clusters 1379 → 1367; sigue 1 OMEGA | **99 / 14** | Interpolaciones con −1: 3,58 % → **0 %**. OMEGA +11 %, puntos MAX −10 %, MIN +7,3 %. **6,7–7,2× más rápido.** Ver sección B1 |

| B7 `bilinear_interpolation` usaba −1 como centinela, pero −1 es un valor empaquetado válido (~5271 m) | ALG-106 | sin cambios | 99 / 14 | **Mínimo:** 1 punto más clasificado como MIN en los 60 pasos (19 715 → 19 716); clusters y formaciones idénticos |

B6, B3, B4 y B5 no cambian los puntos seleccionados ni los clusters (`*_selected_*.csv`). B2 y B1 sí, porque cambian el muestreo. B7 cambia un solo punto.

## B7: el éxito de la interpolación va aparte del valor

`bilinear_interpolation` devolvía un `short` y los llamadores trataban `-1` como "no se pudo interpolar". Pero −1 es un valor empaquetado válido: con `scale_factor` 0,2143 y `add_offset` 51 692 equivale a 51 691,8 m²/s², unos 5271 m de Z500. Un rayo que interpolaba exactamente −1 contaba como voto a MAX y nunca para MIN.

Ahora la función devuelve `bool` (éxito) y deja el valor en `*z_out`. Las 4 variantes usan `if(!interp_ok)`. El test `test_bilinear` comprueba:
- un campo constante −1 interpola −1 con éxito;
- un campo constante 1234 da 1234;
- un punto fuera de dominio devuelve fallo.

Con la interfaz anterior el test no podía expresarse, y el rojo fue un error de compilación. Tras B1 ya no hay interpolaciones fallidas, así que el efecto se limita a los −1 legítimos: en los 15 días, **1 punto** cambia de clase.

## B1: `findIndex` en O(1) con vuelta en longitud

`findIndex` buscaba cada nodo con un barrido lineal y comparaba floats con `==`, sin dar la vuelta en longitud. Un rayo cuyo punto caía en lon ≥ 180° no encontraba su celda, `bilinear_interpolation` devolvía −1 y ese rayo **contaba como voto a MAX sin contar nunca para MIN**.

Ahora el índice se calcula directamente, `(target − arr[0]) / paso`:
- se exige que sea un nodo de la rejilla (tolerancia de 0,001 pasos);
- si la rejilla cubre 360°, da la vuelta.

`test_findindex` cubre nodos, vuelta (180 → −180; −180,25 → 179,75), fuera de dominio en latitud y valores que no son nodo. Con el código anterior fallaban los 3 casos de vuelta.

| Métrica | Caso fijo antes → después | Caso largo antes → después |
|---|---|---|
| Interpolaciones con −1 | 3,58 % → **0 %** | 3,58 % → **0 %** |
| Puntos en clusters | 1379 → 1367 | 33 091 → 32 973 |
| Puntos MAX / MIN | — | 14 723 / 18 368 → 13 258 / 19 715 (−10 % / +7,3 %) |
| Clusters (suma de pasos) | 74 → 77 | 1913 → 1906 |
| Formaciones OMEGA / REX | 1 / 0 → 1 / 0 | **89 / 14 → 99 / 14** (OMEGA +11 %) |
| **Tiempo, 1 hilo** | 7,05 s → **0,98 s** (7,2×) | 107,3 s → **15,9 s** (6,7×) |

- **Por pasos:** los OMEGA cambian en 9 de los 60 pasos, todos al alza.
- **Invariancia:** se mantiene al orden de los clusters (0 diferencias en 15 días) y al número de hilos.
- **Aceleración:** menor que los 2–3 órdenes estimados, porque ahora domina el resto del cálculo (contornos y clusters). Los contadores de `findIndex` no cambian: 1,88 % de las llamadas y 3,79 % de las interpolaciones.

## B2: cobertura angular completa

`BEARING_STEP` era `360/(N_BEARINGS*2)` en división entera: 5° en vez de 5,625°. Los 64 rayos iban de −180° a 135° y dejaban **sin muestrear un sector de 40° (11,1 %)**, siempre el mismo. Ahora es `360.0/(N_BEARINGS*2)`, y `test_geometria_polar` exige que 64 × paso = 360°. Con el paso entero el test daba 320° y fallaba.

| Métrica | Caso fijo antes → después | Caso largo antes → después |
|---|---|---|
| Puntos en clusters | 1527 → 1379 (−9,7 %) | 36 427 → 33 091 (−9,2 %) |
| Puntos MAX / MIN | — | 17 430 / 18 997 → 14 723 / 18 368 (−15,5 % / −3,3 %) |
| Clusters (suma de pasos) | 79 → 74 | 1982 → 1913 (−3,5 %) |
| Formaciones OMEGA / REX | 1 / 0 → 1 / 0 | **124 / 14 → 89 / 14** (OMEGA −28 %) |
| Interpolaciones con −1 | 3,79 % → 3,58 % | 3,79 % → 3,58 % |

- **Por pasos:** el número de OMEGA cambia en 26 de los 60 pasos, casi siempre a la baja.
- **Identificadores:** los `id` de cluster se renumeran, así que las formaciones no se comparan una a una entre versiones.
- **Invariancia al orden:** se mantiene (0 diferencias en los 15 días).
- **Lectura:** el sector sin muestrear no aportaba votos y dejaba pasar como extremo puntos que no lo son en esa dirección. Afectaba más a los MAX y, en cadena, a las parejas OMEGA. Queda por comprobar en la validación contra referencias (H5) si el nuevo recuento se acerca más a ellas. Aquí solo se mide el cambio.

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
