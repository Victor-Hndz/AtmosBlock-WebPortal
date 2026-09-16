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

| Recorridos de contorno geodésicos *(decisión de diseño, no bug)* | ALG-360 | 1 OMEGA → 4 OMEGA + 2 REX, las nuevas junto a ±180°; la original se conserva | **107 / 15** | **Objetivo:** el acuerdo entre 0,25° y 1° pasa de 97 a 105 formaciones emparejadas. Puntos y clusters idénticos. Ver sección ALG-360 |

B6, B3, B4, B5 y B8 no cambian los puntos seleccionados ni los clusters (`*_selected_*.csv`). B2, B1, B10 y ALG-359 sí, porque cambian el muestreo. B7 cambia un solo punto. ALG-360 solo cambia las formaciones.

## ALG-360: recorridos de contorno geodésicos

No corrige un bug: es una decisión de diseño con la asesoría del agente físico. Las comprobaciones de contorno recorrían la rejilla por índices: 64 direcciones enteras con zancadas de hasta 8 celdas, sin vuelta en ±180° y con ángulos físicos que cambian con cos φ. El sector "sur" medía ±41° a 30°N y ±15° a 75°N. Además, los niveles de contorno eran los de las celdas que pisaba el camino hacia el norte, así que en rejillas gruesas se saltaban niveles.

**Medición previa** (caso largo, parche local que cuenta los niveles probados por máximo):

| | 0,25° | 1° (decimación ×4) |
|---|---|---|
| Niveles de 20 m saltados | 2,0 % | 15,6 % |
| Máximos con algún nivel saltado | 1,1 % | 53,7 % |

**Cambio, en tres commits con su delta:**

1. **Rayos geodésicos.** Para cada cluster y cada uno de los `n_rays` acimuts, se muestrea el círculo máximo cada `contour_ray_step_km` = 25 km con la interpolación bilineal, hasta `search_radius_km`. Se guarda el extremo de la altura (mínimo para un máximo, máximo para un mínimo). Un rayo cruza el nivel L antes de su límite si y solo si su extremo queda por debajo de L (MAX) o por encima (MIN), así que cada nivel se decide con 64 comparaciones.
   - **Dónde para un rayo:** en `LAT_LIM_MIN`, en el borde de latitudes o de longitudes del fichero (si no es global), en el casquete polar de 25 km o si la interpolación falla.
   - **Sectores:** ±45° con los límites incluidos (17 rayos) y pertenencia decidida por índice de rayo.
2. **Niveles explícitos.** Todos los múltiplos de 20 m con mín_polo < L ≤ altura del centro. mín_polo es el extremo del rayo hacia el polo.
3. **Δlon del Rex con vuelta en ±180°.** Sigue en grados; pasarlo a km es ALG-364.

**Tests:**
- `test_rayos_geodesicos` usa campos sintéticos definidos en km. En rojo con el recorrido por índices estaban dos casos: un alto junto a ±180° salía abierto, y la misma dorsal (141°–175°) daba respuestas distintas en el sector este a 30°N y a 75°N. Los controles se mantienen en verde: un alto aislado sale cerrado a 0,25° y a 1°.
- `test_niveles_contorno`: un máximo con 40 m por grado, a 1°, debe dar los 54 niveles de 5800 a 4740 m.

**Delta por commit:**

| | Caso fijo | Caso largo (60 pasos) | Caso largo a 1° |
|---|---|---|---|
| Antes (ALG-359) | 1 / 0 | 104 / 16 | 118 / 15 |
| 1. Rayos geodésicos | 4 / 2 | 107 / 15 (95 de 120 emparejadas a ≤1°; 25 salen, 27 entran) | 107 / 14 |
| 2. Niveles explícitos | 4 / 2 (sin cambios) | 107 / 15 (sin cambios) | 108 / 15 |
| 3. Δlon del Rex con vuelta | sin cambios | sin cambios | sin cambios |

Valores en OMEGA / REX.

**Caso fijo:** la OMEGA original se conserva. Las cinco formaciones nuevas están junto a ±180° (64–66°N, entre 170°E y 170°O), donde antes los recorridos se cortaban.

**Caso largo por bandas** (latitud del máximo; la franja ±180° es |lon| ≥ 170°), en OMEGA / REX:

| | 30–50° | 50–63° | >63° | ±180° |
|---|---|---|---|---|
| Antes | 9 / 0 | 50 / 7 | 45 / 9 | 0 / 0 |
| Después | 9 / 0 | 50 / 9 | 48 / 6 | 2 / 0 |

Casi todos los cambios se concentran al norte de 50°N y entre 130°E y 180°. Encaja con lo esperado: sectores que ya no dependen de cos φ y recorridos que dan la vuelta en ±180°.

**Invariancia a la resolución** (caso largo a 0,25° frente al mismo caso decimado a 1°; formaciones emparejadas a ≤1°):

| | Formaciones a 0,25° / a 1° | Emparejadas | Solo en una de las dos |
|---|---|---|---|
| Antes | 120 / 133 | 97 | 23 + 36 = 59 |
| Después | 122 / 123 | **105** | 17 + 18 = **35** (−41 %) |

**Sensibilidad al paso de los rayos** (caso largo): con 12,5 km, 121 de 122 formaciones emparejadas; con 50 km, 122 de 122. El resultado apenas depende del paso.

**Coste:** el caso largo con 12 hilos sigue en unos 6 s.

Se mantienen la invariancia a hilos, procesos y orden. Líneas base actualizadas: cambia solo el hash de formaciones del caso fijo y del de 2003; el de puntos es idéntico.

## ALG-364: separación del Rex en km, no en grados

La regla del Rex exigía que el mínimo quedara a ≤10° de longitud del máximo. Pero 10° de longitud son ~950 km a 30°N, 556 km a 60°N y 193 km a 80°N: la tolerancia dependía de la latitud. Ahora se mide la distancia del mínimo al círculo máximo del meridiano del máximo, `d = R·asin(cos φ_min·|sin Δλ|)`, solo con cos Δλ > 0 (si no, el mínimo está al otro lado del polo). Es periódica en longitud, así que la vuelta en ±180° sale sola.

**Tests** (`test_rayos_geodesicos`): (50°, Δλ 10°) ≈ 712,6 km; simetría este/oeste; vuelta en ±180°; Δλ de 90° y 180° no cuentan; hemisferio sur; (84°, Δλ 60°) ≈ 578 km.

### Valor: 700 km

**Literatura** (revisión del agente físico, fuentes leídas en texto completo). Ningún trabajo publica una distancia en km entre la alta y la baja de un Rex. Pero sí fija en qué latitud evaluar los 10° anteriores, porque la fórmula usa la latitud de la **baja**:
- Sousa et al. 2021 (doi:10.1175/JCLI-D-20-0658.1): extensión latitudinal típica de 15° entre la alta y la baja.
- Hirt et al. 2018 (doi:10.1080/16000870.2018.1458565): distancia alta–baja de los *high-over-low* con pico en ~2000–2200 km; criterio |Δlon| < 10° con dos bajas.
- Barriopedro et al. 2006 (doi:10.1175/JCLI3678.1): centros de bloqueo en 60–70°N, con φ_S = 40°N.

Combinado, la baja típica queda en ~40–50°N; 60°N es la latitud de la alta. Los criterios publicados de alta sobre baja equivalen a 710–1060 km a la latitud de la baja; ninguno es tan estricto como 550 km. La física (radio de deformación ~1000 km, cuarto de onda de Rossby estacionaria) fija el orden de magnitud, pero no separa 550 de 700.

**Medición interna:** con la regla en grados, la latitud de la baja de nuestros 20 Rex tiene mediana **52°N** (Q1 49,75°, Q3 57°); la de la alta, 63,5°N.

**Prueba empírica.** Regla en grados frente a 440, 550, 560, 660, 700 y 840 km en seis casos: fijo, 2003, largo, febrero de 2004, junio de 2024 y largo a 1°.

| | Grados | 550 km | 700 km |
|---|---|---|---|
| Rex (largo / jun-2024 / largo a 1°) | 15 / 3 / 15 | 14 / 1 / 14 | 15 / 3 / 15 |
| Persistencia en el caso largo (Rex con continuidad a ≤500 km en t±1) | 9/15 | 8/14 | 9/15 |
| Robustez: Rex a 0,25° con pareja a 1° | 12/15 | 10/14 | 12/15 |
| Fragilidad: Rex a ±20 % del umbral | — | 2/14 | 1/15 |

- **700 km** (y 660) da resultados idénticos a la regla en grados en los seis casos.
- **550 km** (y 560) quita cuatro Rex, todos coherentes con la predicción geométrica. Pero el del caso largo era persistente, y los dos de junio de 2024 son el mismo sistema en pasos consecutivos: estructuras coherentes, no ruido.
- 440 km quita más y 840 km añade cuatro.

**Límite:** con ~20 Rex, casi todos de un episodio, la prueba es un indicio. Pendiente ampliarla con casos documentados (ALG-366).

**Delta con 700 km: 0 formaciones** en todos los casos; líneas base sin cambios.

## ALG-363: rayos de contorno que atraviesan el polo

Con ALG-360 cada rayo se detenía, sin cruzar, a 25 km del polo, igual que antes lo hacía la fila del polo. Ahora sigue el mismo círculo máximo al otro lado. Los niveles de contorno se siguen contando solo hasta el polo, con el extremo del rayo 0 (el meridiano del centro) hasta 90°: más allá, "hacia el polo" pasaría a ser hacia el sur.

**Tests** (`test_rayos_geodesicos`):
- Un alto en 84°N, que supera el nivel hasta ~734 km del centro con el polo a ~667 km, salía abierto; ahora sale cerrado.
- El mismo alto sigue dando 9 niveles (hasta el polo), no 15.

**Delta: 0 formaciones** en el caso fijo, en el largo y en el largo a 1°, también por bandas. Cambian solo los contadores de interpolaciones de las líneas base, por las muestras al otro lado del polo. El cambio de semántica afecta a centros por encima de ~63°N, a menos de 3000 km del polo, y en estos casos no altera ninguna formación.

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
