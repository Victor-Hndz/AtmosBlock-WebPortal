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

| B8 `expandCluster` recursivo: desbordaba la pila con clusters grandes | ALG-403 | sin cambios | 99 / 14 | **0**: CSV de clusters, formaciones y contadores idénticos byte a byte en los 60 pasos |

| B10 `bilinear_interpolation` intercambiaba los pesos de las esquinas `p12` y `p21` | ALG-357 | puntos en clusters 1367 → 1373; sigue 1 OMEGA, desplazada una celda | **101 / 15** | **Moderado:** ~2 % de los puntos cambian de clasificación; 111 de 113 formaciones se conservan a ≤1°, 2 desaparecen y 5 aparecen. Ver sección B10 |

| Espaciado de candidatos de 1,25° a 1,0° *(decisión de diseño, no bug)* | ALG-359 | puntos en clusters 1373 → 2118; misma OMEGA | **104 / 16** | **Esperado:** +57 % de puntos candidatos (1,25² = 1,56), clusters +3,1 %; 106 de 116 formaciones se conservan a ≤1°. Ver sección ALG-359 |

B6, B3, B4, B5 y B8 no cambian los puntos seleccionados ni los clusters (`*_selected_*.csv`). B2, B1, B10 y ALG-359 sí, porque cambian el muestreo. B7 cambia un solo punto.

## ALG-359: espaciado de candidatos de 1,25° a 1,0°

No corrige un bug: es una decisión de diseño tomada con la asesoría del agente físico. Con 1,25° (`STEP` = 5 celdas a 0,25°), los candidatos no caen en las mismas coordenadas a 0,5° ni a 1°, así que el test de invariancia a la resolución (ALG-308) no podría comparar sobre los mismos puntos. 1° es múltiplo de 0,25°, 0,5° y 1°, y queda por debajo de `ray_distance_km`/4 ≈ 125 km.

| Medida | Caso fijo | Caso largo (60 pasos) |
|---|---|---|
| Puntos en clusters | 1373 → 2118 | 33 060 → 51 898 |
| MAX / MIN | 291 / 1082 → 450 / 1668 | 13 305 / 19 755 → 20 905 / 30 993 |
| Clusters | 78 → 80 | 1918 → 1978 |
| Formaciones (OMEGA / REX) | 1 / 0 → 1 / 0 | 101 / 15 → 104 / 16 |
| Tiempo con 12 hilos | — | 5 s → 7 s |

**Formaciones del caso largo**, emparejadas por paso, tipo y centroides a ≤1°: se conservan 106 de 116; 10 desaparecen y 14 aparecen. Varias de ellas son la misma formación desplazada algo más de 1° (por ejemplo, en el paso 48 el máximo pasa de 56,25° / 132,00° a 56,00° / 133,00°). La OMEGA del caso fijo es la misma, con los mismos identificadores de cluster.

Se mantienen la invariancia a hilos, procesos y orden. Líneas base de `regresion_hash` y `regresion_hash_2003` actualizadas.

## B10: pesos de la interpolación bilineal

La fórmula pondera `z2` con `(lat − lat_inf)(lon_sup − lon)`, que es el peso de la esquina `p21` (latitud superior, longitud inferior), y `z3` con el de `p12`. Pero `z2` tomaba el valor de `p12` y `z3` el de `p21`, así que cada rayo se interpolaba como si latitud y longitud estuvieran traspuestas dentro de la celda de 0,25°. Con la misma fracción de celda en ambas direcciones el error se anula, por eso ningún test lo veía.

`test_bilinear` añade un campo plano `z = 100·lat + 40·lon`, que la interpolación bilineal reproduce exactamente:
- en (45.05, 10.20), antes 4922 y ahora 4913 (exacto);
- en (45.20, 10.10), antes 4918 y ahora 4924 (exacto).

| Medida | Caso fijo | Caso largo (60 pasos) |
|---|---|---|
| Puntos en clusters | 1367 → 1373 | 32 974 → 33 060 |
| MAX / MIN | 288 / 1079 → 291 / 1082 | 13 258 / 19 716 → 13 305 / 19 755 |
| Clusters | 77 → 78 | 1906 → 1918 |
| Puntos (paso, lat, lon, tipo) que cambian | 24 salen, 30 entran | 644 salen, 730 entran (~2 %) |
| Formaciones (OMEGA / REX) | 1 / 0 → 1 / 0 | 99 / 14 → 101 / 15 |

**Formaciones del caso largo**, emparejadas por paso, tipo y centroides del máximo y de los mínimos a ≤1°:
- **111 de 113 se conservan.** La mayoría cambian de centroide en una celda, porque sus clusters ganan o pierden algún punto.
- **Desaparecen 2:** dos OMEGA del paso 52, sustituidas por otra OMEGA en la misma zona.
- **Aparecen 5:** OMEGA en los pasos 6, 29, 52 y 53, y una REX en el paso 46.

La OMEGA del caso fijo es la misma: su máximo pasa de 54,00° a 54,25° de latitud y su mínimo izquierdo de −14,75° a −14,50° de longitud.

Se mantienen la invariancia a hilos y procesos (`invariancia_omp_*`, `invariancia_mpi_*`, `invariancia_omp_mpi_3x2`) y al orden de los clusters (`invariancia_orden`). Líneas base de `regresion_hash` y `regresion_hash_2003` actualizadas.

## B8: `expandCluster` iterativo

El agrupado recorría cada cluster con un DFS recursivo: una llamada por punto conectado. Con la pila por defecto (8 MB en la imagen del CI), un cluster de ~1 millón de puntos provocaba un *segmentation fault*.

Ahora usa una pila explícita que crece con `realloc`, con el mismo criterio: vecindad 8, mismo tipo que el punto actual y dentro de `eps`. Esa relación es simétrica, así que el orden de recorrido no cambia qué puntos quedan en cada cluster.

`test_expandcluster` usa una rejilla de 1000 × 1000 con un bloque MAX de 999 000 puntos y una fila separadora con un MIN:
- con la versión recursiva, *segmentation fault* (exit 139);
- con la iterativa, los 999 000 puntos quedan marcados con el id y no se toca ningún punto de otro tipo.

En los datos reales los clusters no llegan a ese tamaño (≤ 15 552 puntos submuestreados por paso), así que la salida no cambia.

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
