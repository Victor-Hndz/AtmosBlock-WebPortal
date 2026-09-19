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
| Filtro de tamaño por área de celda, 22 000 km² *(decisión de diseño)* | ALG-306 | 4 / 2 → 4 / 1 | **97 / 13** | Se pierden sobre todo formaciones apoyadas en clusters pequeños; acuerdo 0,25°/1° 85 % → 88 %. Ver sección ALG-306 |
| Vecindad de clusters con vuelta en ±180° y fila del polo como un punto | ALG-309 | 4 / 1 → 4 / 0 | 97 / 13 (=) | **Pequeño:** clusters partidos en ±180° pasan a ser uno; 108 de 110 formaciones iguales. Ver sección ALG-309 |
| Límite polar del filtro de latitud desactivado (90) *(decisión de diseño)* | ALG-304 | sin cambios | 97 / 13 (=) | **0 formaciones**; puntos en clusters del caso largo +29 % (clusters polares que antes se descartaban). Ver sección ALG-304 |
| Guarda polar derivada de `ray_distance_km` y categoría `POLAR_HIGH` | ALG-310, ALG-311 | sin cambios | 97 / 13 (=) | **2003: 0 formaciones.** Invierno de 1983: una Omega a 86,5°N pasa a `POLAR_HIGH`; 3 `POLAR_HIGH` en total (85,75–86,5°N); acuerdo 0,25°/1° 123 → 126. Ver sección ALG-310/311 |
| Un rayo fuera del fichero no vota; el portal descarga un margen y el C solo informa dentro del área | ALG-369 (y ALG-358) | mismas detecciones | 97 / 12 (=) en 25–90 | **Ficheros recortados del portal:** fin del exceso de MAX en los bordes (1983, 25–30°N: 57 611 MAX → 27). Con el margen, candidatos idénticos al fichero completo. Ver sección ALG-369 |
| El lado del mínimo en la Omega se decide sin truncar la longitud | ALG-362 | sin cambios | 97 / 12 (=) | 2003 y 2019: 1 Omega cambia de mínimo cada uno; 1983: 0; DJFMAM 2014-15: 14 Omega cambian de mínimo y aparecen 4 (1213 → 1217). Ver sección ALG-362 |
| Los flancos de la Omega deben estar a más de 700 km del meridiano del máximo *(decisión física)* | ALG-362 | 4 / 0: una Omega cambia de mínimo | 97 / 12 → 89 / 12 | **Solo se pierden Omegas o cambian de mínimo:** 2003 −8, 1983 −12, 2019 −7, DJFMAM 2014-15 −176 (−18 %, 5 pasan a Rex). Ver sección ALG-362 |
| El dominio de análisis llega del límite hacia el ecuador al polo de su hemisferio | ALG-374 | sin cambios | sin cambios (norte) | **Hemisferio norte: 0 cambios** (las líneas base no se mueven). En el sur ya no se analiza la franja entre el ecuador y el límite pedido. Ver sección ALG-374 |
| El mínimo del Rex debe estar abierto hacia el este (`contour_der` no se recalculaba) | ALG-361 | sin cambios | 97 / 13 → 97 / 12 | **Solo desaparecen Rex:** 2003 −1, 1983 −1, 2019 −3 (26 → 23); ninguno nuevo ni sustituido. Ver sección ALG-361 |
| Área de celda de banda exacta, con el casquete en la fila del polo (antes 0 km² por cos 90°) | ALG-373 | sin cambios | sin cambios | **0 en los cuatro casos** (2003, 1983, 2019 y DJFMAM 2014-15): ningún cluster estaba cerca del filtro de 22 000 km² por su celda polar. Ver sección ALG-373 |

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

## ALG-377: el Rex en las dos orientaciones este-oeste

La regla del Rex solo aceptaba una orientación del dipolo: la alta cerrada hacia el ecuador y al este y abierta al oeste, con la baja cerrada al oeste y abierta al este. No hay base en la literatura para exigir ese sentido (Rex 1950; Hirt et al. 2018; Detring et al. 2021, doi:10.5194/wcd-2-927-2021; Masato et al. 2012, doi:10.1002/qj.990, muestran que las dos roturas de onda son físicas): era una asimetría heredada. Decidido por el usuario con asesoría física: se acepta también la configuración espejo (alta abierta al este y baja abierta al oeste), con los lados abiertos acoplados, sin parámetros nuevos. Una alta y una baja abiertas por el mismo lado siguen sin ser Rex.

**Predicción escrita antes de medir:** solo pueden aparecer Rex (donde no había formación, o donde una Omega pierde frente a una baja espejo más cercana y pasa a Rex); un Rex existente solo puede cambiar de baja si hay una baja espejo válida más cerca; ningún Rex desaparece y no aparece ninguna Omega; los puntos de los clusters no cambian. Orden de magnitud: entre +30 % y +100 % de Rex. **Control positivo:** en el caso de 2019, paso 13, sale REX con la alta 57°N 20,75°W y la baja 43,25°N 16,25°W (ALG-367). La simetría entre hemisferios con datos reales (JJA 2015) se mantiene.

DELTA_377

## ALG-369: rayos fuera del fichero y margen de descarga del portal

Un rayo de clasificación cuya interpolación fallaba (el punto caía fuera del fichero) sumaba un voto a MAX y ninguno a MIN, aunque el comentario del código decía que no se tenía en cuenta. En el portal el fichero llega recortado al área pedida, así que los candidatos de los bordes sufrían ese sesgo. Decidido por el usuario con asesoría física (opciones b + e):

- **(b)** El rayo fallido no vota; el umbral sigue en 57 de 64 rayos, así que un candidato con más de 7 rayos fuera no se clasifica.
- **(e)** El configurador descarga un margen de `ray_distance_km` + una celda alrededor del área (5° en latitud; 4,5°/cos φ + una celda en longitud) y el C solo informa de candidatos dentro del área pedida (antes ignoraba `LAT_LIM_MAX` y los límites de longitud: ALG-358).

**Protocolo y predicciones, escritos antes de medir.** Casos 2003-08-01…15 y 1983-01-31…02-21, en dos dominios: hemisférico 25–90°N y regional 35–75°N × 30°O–40°E. Cuatro ejecuciones por dominio:
- **A:** fichero completo (90–0°N, todas las longitudes) con el código nuevo, informando solo dentro del área: la referencia.
- **B:** fichero recortado exactamente al área, código anterior.
- **C:** fichero recortado exactamente al área, código nuevo.
- **D:** fichero con el margen del configurador, código nuevo.

Predicciones: B tiene un exceso de MAX en las franjas junto a los bordes; C no tiene candidatos en esas franjas donde fallan más de 7 rayos; **D coincide con A en los candidatos**, bit a bit en el dominio hemisférico. En el regional, los rayos de contorno de D paran en el borde del fichero y en A no, así que alguna formación cuyo contorno llegue más allá del margen puede diferir (formaciones truncadas: deuda aparte).

**Resultado: se cumplen las cuatro predicciones.** Candidatos sin filtros de cluster (MAX / MIN en la franja de borde: 25–30°N en el dominio hemisférico, 5° junto a cada borde en el regional) y formaciones de la ejecución normal:

| Caso y dominio | A (referencia) | B (antes, recortado) | C (nuevo, recortado) | D (nuevo, con margen) |
|---|---|---|---|---|
| 2003, hemisférico | 5400 / 1423; 101 formaciones | **11 610 / 0**; 101 iguales | 0 / 0; 101 iguales | **idéntico a A**; 101 iguales |
| 2003, regional | 823 / 2856; 4 formaciones | 8264 / 0; 0 formaciones | 0 / 0; 0 formaciones | **idéntico a A**; 3 de 4 |
| 1983, hemisférico | 27 / 443; 131 formaciones | **57 611 / 0**; 129 de 131 | 0 / 0; 129 de 131 | **idéntico a A**; 131 iguales |
| 1983, regional | 1430 / 2575; 9 formaciones | 12 698 / 0; 2 de 7 | 0 / 0; 2 de 7 | **idéntico a A**; 9 iguales |

- **El sesgo era enorme en los bordes:** con el fichero recortado, casi todos los candidatos de la franja salían MAX y ninguno MIN. En el dominio hemisférico lo tapaba en parte el filtro de 30° de los clusters (las formaciones apenas cambian); en el regional, no: B da 0 formaciones en 2003 y 2 correctas de 7 en 1983.
- **Con el margen del configurador los candidatos son idénticos a los del fichero completo, bit a bit**, en los cuatro casos.
- **Formación truncada:** en el dominio regional de 2003, D pierde 1 de las 4 formaciones de A. Sus rayos de contorno (hasta 3000 km) llegan al borde del fichero, que en A no existe. Es la limitación prevista; marcarlas queda como deuda.
- Con los límites de las pruebas de CTest (`25 85`), el caso fijo da las mismas detecciones (solo bajan los contadores de llamadas) y el de 2003 deja de informar 45 puntos por encima de 85°; líneas base actualizadas.

## ALG-373: área de la celda del polo

`area_celda_km2` usaba R²·Δλ·Δφ·cos φ, que da 0 en la fila de ±90°: un cluster polar se quedaba sin el área de su celda del polo (≈ 9 700 km² a 1°, casi la mitad del filtro de 22 000 km²). Pasa a la banda exacta R²·Δλ·(sin(φ+Δ/2) − sin(φ−Δ/2)), recortada a ±90°: es aditiva, y en la fila del polo cada candidato se lleva su parte del casquete (las 360/Δ celdas suman 2πR²(1 − cos Δ/2)).

**Test** `test_area_celda`: rojo antes (fila del polo 0 km²; 4×4 celdas de 0,25° no sumaban la de 1° que cubren), verde después.

**Delta:** 0 en CTest (líneas base intactas) y en los cuatro casos largos, en puntos y formaciones (2003, 1983, 2019 y DJFMAM 2014-15; en este último, 683 102 puntos y 819 OMEGA / 191 REX / 36 POLAR_HIGH antes y después). Fuera del polo la banda y la fórmula con cos φ difieren menos de 10⁻⁴ en relativo, y ningún cluster polar de estos casos estaba en el filo del filtro.

## ALG-362: el lado del mínimo en la Omega sin truncar la longitud

En la búsqueda de la Omega, un mínimo es flanco izquierdo (oeste) o derecho (este) según su longitud respecto a la del máximo, con vuelta en ±180°. Esas longitudes se guardaban en `int`, que trunca: un mínimo con la misma parte entera que el máximo (10,5° frente a 10,9°) no quedaba en ningún lado, y 10,9° frente a 11,1° sí contaba. La decisión pasa a `lado_del_minimo()` con `double`.

**Test** `test_lado_minimo`: rojo con el `int` (10,9/10,5, 10,5/10,9 y −10,5/−10,9 daban 0), verde con `double`; los casos con vuelta en ±180° y el mismo meridiano no cambian. La extracción a la función se comprobó antes sin cambiar ningún hash.

**Delta:**
- Caso fijo: sin cambios. Caso de 2003 de CTest: cambia el hash de formaciones (los puntos no); línea base actualizada.
- 2003-08-01…15: una Omega (paso 55) cambia de mínimo derecho. 1983: sin cambios. 2019: una Omega (paso 24) cambia de mínimo.
- DJFMAM 2014-15: 14 Omega cambian de mínimo y aparecen 4 (1213 → 1217 formaciones); acuerdo 0,25°/1° 1081 → 1088 emparejadas.
- **Patrón:** los mínimos que entran están casi en el meridiano del máximo (Δλ de 0,25° a 0,75°) y hacia el ecuador. Antes el truncamiento los excluía por accidente. Una baja justo bajo la alta es la configuración de un Rex, no un flanco de Omega: la separación mínima de los flancos queda como cambio físico aparte, con su propia decisión y su delta.

**Separación mínima de los flancos (commit aparte, decidido por el usuario el 2026-09-18 con asesoría física).** Un mínimo solo es flanco de una Omega si está a **más de `rex_max_offset_km` (700 km) del meridiano del máximo**: el complemento exacto de la franja del Rex, sin hueco ni solape y sin parámetros nuevos (Hirt et al. 2018 separan *high-over-low* de Omega por |Δλ|). **Predicción escrita antes de medir:** solo pueden perderse flancos con d ≤ 700 km, así que el cambio solo puede quitar Omegas o cambiarles un mínimo por otro más lejano; ninguna Omega nueva puede aparecer salvo que un máximo antes emparejado como Omega quede libre y pase a Rex; los Rex no pierden nada.

**Test** (`test_lado_minimo`, casos de flanco): mínimo a 358 km del meridiano o casi en él → no es flanco; a 854 km al este o al oeste → sí. Rojo antes (la función no existía), verde después.

**Delta** (frente al commit anterior; se cumple la predicción: solo se pierden Omegas o cambian de mínimo, ninguna aparece, los Rex no pierden nada):

| Caso | Omega | Perdidas | Cambian de mínimo | Omega → Rex |
|---|---|---|---|---|
| Caso fijo (4 pasos) | 4 → 4 | 0 | 1 | 0 |
| 2003-08-01…15 | 97 → 89 | 8 | 14 | 0 |
| 1983-01-31…02-21 | 128 → 116 | 12 | 30 | 0 |
| 2019-06-24…07-01 | 80 → 73 | 7 | 29 | 0 |
| DJFMAM 2014-15 | 995 → 819 | 171 | 286 | 5 |

- **El efecto es grande en el semestre invernal (−18 % de Omegas) y moderado en los casos cortos (−8 a −9 %).** Se reparte por todas las bandas de latitud.
- **Qué se pierde:** Omegas cuyo flanco más cercano estaba a 59–679 km del meridiano del máximo. De las 176 perdidas o convertidas en 2014-15, solo 16 tenían los dos flancos en los sectores laterales (este/oeste, ±45°) vistos desde el máximo; en los casos cortos, 1 de 27. El resto tenía al menos un flanco hacia el ecuador, en la franja del Rex.
- **Alternativa descartada con datos:** exigir que los flancos estén en los sectores laterales de ±45° sería mucho más estricto (solo el 35–56 % de las Omegas actuales lo cumplen), porque los flancos típicos quedan al suroeste y al sureste del máximo.
- **Acuerdo 0,25°/1° en 2014-15:** 1088 → 926 emparejadas sobre 1217 → 1046 formaciones (89 % → 89 %).
- Líneas base del caso fijo y de 2003 actualizadas.

## ALG-374: el dominio de análisis depende del hemisferio

`FILA_LAT_MIN` (ALG-302) y la parada de los rayos usaban siempre `LAT_LIM_MIN` como límite hacia el ecuador. En el hemisferio sur ese límite es el **polar**: con `-90 -25` se recorrían las filas desde la primera del fichero (0°) y ningún rayo paraba antes de −90°, así que se analizaba la franja de 0° a −25° que en el norte queda fuera.

Ahora `calcular_dominio_latitudes()` da el dominio `[DOM_LAT_MIN, DOM_LAT_MAX]`: el límite hacia el ecuador es el de menor |latitud| y hacia el polo se llega a ±90°, porque el límite polar no recorta el análisis (ALG-304). Un dominio que cruza el ecuador queda limitado por los dos. Las filas empiezan en `FILA_LAT_INICIO` (la primera del fichero en el norte) y los rayos paran al salir del dominio.

**Tests:**
- `test_dominio_latitudes`: (25, 90) y (25, 85) → [25, 90]; (−90, −25) y (−85, −25) → [−90, −25]; (−30, 30) → [−30, 30].
- `latitudes_hemisferio_sur`: el caso fijo reflejado **sin recortar** (0° a −90°), con los filtros de cluster quitados y límites `-90 -25`. Rojo antes del cambio: 2570 de 4796 puntos fuera de [−90, −25]; verde después.
- `simetria_hemisferica_completa`: el mismo espejo sin recortar frente al original. Pasaba ya antes, porque en las 4 pasadas del caso fijo ningún cluster llega a esa franja: por eso hizo falta el test anterior.

**Delta:**
- **Hemisferio norte: 0.** Las líneas base del caso fijo y de 2003 no cambian; CTest 52/52 con valgrind.
- **Hemisferio sur (JJA 2015, 368 pasos, datos reales):** 320 638 → 320 595 puntos (−43) y 289 / 49 / 66 → **291 / 40 / 66** OMEGA / REX / POLAR_HIGH. Los 9 Rex que desaparecen tenían el mínimo en la franja equatorward del límite, que ya no se analiza; dos Omega más aparecen al quedar libres esos máximos.
- **Espejo real de JJA 2015** (el campo del sur reflejado al norte): de 43 puntos y 11 formaciones distintas a **0 y 0**. Era el criterio de la puerta G3 que faltaba.
## ALG-361: el mínimo del Rex debe estar abierto hacia el este

En la búsqueda del mínimo de un Rex, `contour_der` se ponía a `false` antes del bucle y no se recalculaba para cada mínimo, así que la condición `!contour_der` se cumplía siempre: se aceptaban mínimos con el contorno cerrado también hacia el este. La forma exigida al mínimo pasa a una función, `minimo_rex_valido`: contorno hacia el ecuador y hacia el oeste en todo el sector, hacia el polo en la mayoría, y **abierto hacia el este** (no todos los rayos del sector cruzan el nivel). Es la simetría de la condición del máximo (cerrado hacia el ecuador y el este, abierto hacia el oeste).

**Test** `test_minimo_rex`, con los extremos de los rayos fijados a mano: un mínimo sin contorno cerrado que cruza por el ecuador, el oeste, el polo (en mayoría) y el este se aceptaba (rojo) y ya no; controles con el este abierto (sí) y con el oeste abierto (no). La extracción a la función se comprobó antes, sin cambiar ningún hash.

**Delta** (casos largos con techo de latitud 90): solo desaparecen Rex, ninguno aparece ni cambia de mínimo.
- **Caso fijo y caso de 2003 de CTest:** sin cambios; líneas base intactas.
- **2003-08-01…15:** 97 / 13 → 97 / 12. Se pierde el Rex del paso 6 (máximo 68°N −39,75°, mínimo 60,25°N −42,25°).
- **1983-01-31…02-21:** 128 / 13 → 128 / 12. Se pierde el del paso 78 (máximo 59,75°N 35,75°E, mínimo 40,5°N 28°E), fuera del sector del episodio documentado.
- **2019-06-24…07-01:** 80 / 26 → 80 / 23. Se pierden los de los pasos 13 (Siberia occidental), 14 (Pacífico nororiental) y 19 (Canadá).
- **Acuerdo 0,25°/1°:** 2003 99 → 98, 1983 126 → 125, 2019 96 → 95 emparejadas (las pérdidas coinciden en las dos resoluciones); desacuerdo de 2019 22 → 20.

## ALG-310/311: guarda polar y altas polares

A menos de `ray_distance_km` del polo, la circunferencia de rayos de un máximo envuelve el polo: todos los destinos quedan hacia el ecuador y los sectores de dirección (ecuador, polo, este, oeste) dejan de distinguir nada. Una Omega o un Rex clasificados ahí no tienen sentido geométrico.

- **ALG-310.** La guarda se deriva del parámetro, no es un literal: `90 − (ray_distance_km/R)·180/π`, 85,503° con 500 km. Se escribe en la cabecera de los CSV (`polar_guard_deg`), aunque no se lee de `params.yaml`.
- **ALG-311.** Un máximo cuyo centroide queda más allá de la guarda (`hemi·lat`, ambos hemisferios) se exporta como `POLAR_HIGH`, sin mínimos (`min1_id` = `min2_id` = −1), antes del bucle de niveles, y no se evalúa como Omega ni Rex. Es una estructura anticiclónica instantánea sobre el casquete polar, **no un bloqueo**: la persistencia llega con el seguimiento (fase 4). Es un cambio de clase, no un filtro: el cluster sigue en `*_selected_*.csv`.

Los mapas no cambian: con `min1_id` = −1 no hay puntos de mínimo que dibujar y la etiqueta muestra el tipo tal cual.

**Tests:**
- `test_polar_high`: rejilla global de 0,25° con un alto gaussiano. A 88°N y a 88°S sale `POLAR_HIGH`; a 80°N no. Rojo antes del cambio (los dos casos polares), verde después.
- `guarda_polar_en_cabecera`: con `ray_distance_km: 400`, la cabecera lleva `polar_guard_deg: 86.403`.

**Delta** (techo de latitud 85 y 90, mismo resultado):
- **Caso fijo y caso largo de 2003:** 0 formaciones; tampoco cambian las bandas ni el acuerdo 0,25°/1°. Líneas base intactas.
- **Invierno de 1983** (1983-01-31 a 02-21, 88 pasos): 129 / 13 → 128 Omega / 13 Rex / 3 `POLAR_HIGH`. La Omega del paso 57 con el máximo en 86,5°N pasa a `POLAR_HIGH`; las otras dos (85,75° y 86,25°N) no formaban nada antes. El acuerdo entre 0,25° y 1° pasa de 123 a 126 emparejadas (las 3 altas polares coinciden en ambas resoluciones).

## ALG-304: filtro de latitud sin límite polar

El filtro descartaba los clusters cuyo punto más al norte no quedaba entre 30° y 85°. El 85 no tenía base física y dejaba fuera justo la franja de 75–90° que da sentido al método (asesoría física). Ahora el filtro usa el punto más cercano a su polo en valor absoluto (ALG-303), y `cluster_lat_max_deg` = 90 significa sin límite polar. Se mantiene 30° en ambos hemisferios: la climatología de bloqueo del HS está en 40–70°S. Se quita después de ALG-309 para que las altas que tocan el polo no salgan partidas.

**Test** (`test_parametros`): con 90, un cluster que llega a 90°N o a 90°S sigue dentro; con 85 queda fuera.

**Delta: 0 formaciones** en el caso fijo, en el largo y en el largo a 1°, también por bandas y en el acuerdo 0,25°/1°. Los puntos en clusters del caso largo pasan de 51 685 a 66 510 (+29 %): son clusters polares que ahora llegan a `search_formation`, pero cerca del polo el rayo hacia el polo apenas deja niveles de contorno y no forman Omega ni Rex (ALG-310 y ALG-311 los clasifican). La línea base del caso de 2003 cambia porque hay más clusters y se renumeran sus identificadores.

## ALG-309: vecindad con vuelta en ±180° y paso por el polo

`expandCluster` agrupaba candidatos vecinos (vecindad 8) comparando `|Δlat| ≤ eps` y `|Δlon| ≤ eps` en grados: ese eps no descartaba ningún vecino (C10), y los objetos se partían en ±180° y en el polo. Ahora la vecindad es topológica: los 8 vecinos del mismo tipo, con vuelta en longitud si la retícula es global, y la fila de un polo como un único punto (todos sus candidatos son vecinos entre sí). Se elimina eps: un umbral geodésico √2·R·Δ también aceptaría siempre a los 8 vecinos.

**Coste (ALG-312):** `point_distance` cuesta 43 ns por vecino frente a 2,7 ns de la comparación anterior; con ~420 000 comprobaciones en el caso largo serían ~18 ms (0,1 %). Al no hacer falta ningún umbral, no se usa.

**Test** `test_vecindad`: rojo con la vecindad anterior (máximos en −180° y 179° separados; 89°N en −90° y 90° separados) → verde; control en una rejilla regional, que no da la vuelta. `test_expandcluster` (1 millón de puntos) sigue en verde.

**Delta:**
- **Caso fijo:** 4 / 1 → 4 / 0. El Rex del paso 0 en 65,5°N −178,5° desaparece y una Omega del paso 1 cambia de mínimo: los clusters partidos en ±180° pasan a ser uno solo y su centroide se mueve.
- **Caso largo:** 97 / 13 sin cambios; 108 de 110 formaciones iguales. Las otras dos son Omega de los pasos 34 y 35 cuyo mínimo junto a ±180° se une y pasa de −180° a 177–180°.
- Bandas de latitud y acuerdo entre 0,25° y 1°: sin cambios.

## ALG-306: área mínima de cluster en km²

El filtro de tamaño exigía al menos 2 puntos por cluster. Con candidatos cada 1°, un punto representa ~10 700 km² a 30° y ~1 100 km² a 85°, así que el filtro dependía de la latitud y de la resolución. Ahora cada cluster suma el área de sus celdas, `R²·Δλ·Δφ·cos φ` (`area_celda_km2`), y se descartan los de menos de `min_cluster_area_km2`.

**Valor: 22 000 km²**, con un argumento previo a medir (agente físico). Un candidato tolera 7 de 64 rayos fallidos (sector de ±19,7°); una dorsal recta sin pendiente a lo largo del eje deja una franja de candidatos de ~170 km, y su círculo inscrito, π·(250·sin 19,69°)² ≈ 22 300 km², es el caso límite entre un extremo cerrado y uno abierto a la escala de `ray_distance_km`. Es un filtro de robustez de la semilla, no de tamaño físico. 10 000 km² reproducía casi exactamente la regla anterior, pero deja pasar celdas sueltas entre 30° y 36°.

**Curva de estabilidad** (medida antes de fijar el valor; sin meseta, así que no se usa para elegir):

| Área mínima | Caso largo OMEGA / REX | 1983 | 2019 | Acuerdo 0,25°/1° (largo · 1983) |
|---|---|---|---|---|
| ≥ 2 puntos (antes) | 107 / 15 | 150 / 15 | 84 / 27 | 85 % · 80 % |
| 10 000 km² | 106 / 16 | 145 / 15 | 85 / 27 | 86 % · 82 % |
| 20 000 km² | 99 / 13 | 135 / 15 | 80 / 27 | 88 % · 84 % |
| 50 000 km² | 79 / 12 | 120 / 13 | 77 / 25 | 89 % · 84 % |
| 100 000 km² | 54 / 9 | 91 / 8 | 68 / 23 | 89 % · 84 % |

**Delta con 22 000 km²:**
- **Caso fijo:** 4 / 2 → 4 / 1. Desaparece el Rex del paso 1 junto a ±180°, y una Omega cambia de mínimo derecho.
- **Caso largo:** 107 / 15 → 97 / 13; 107 de 122 formaciones se conservan a ≤1°, 15 desaparecen y aparecen 3 (mínimos que cambian).
- **Acuerdo entre 0,25° y 1°** en el caso largo: 105 de 123 → 99 de 112; formaciones que solo están en una resolución, 35 → 24 (−31 %).

Test `test_area_celda`: 1° en el ecuador ≈ 12 364 km², la mitad a 60°, igual en el HS, y 16 celdas de 0,25° = 1 de 1°.

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
