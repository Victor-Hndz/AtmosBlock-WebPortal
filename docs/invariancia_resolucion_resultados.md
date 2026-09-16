# Invariancia a la resolución (ALG-308): resultados preliminares

Resultados del test definido en [`invariancia_resolucion.md`](invariancia_resolucion.md), que se congeló en un commit anterior a la primera ejecución. No se ha cambiado nada del diseño después de medir.

**Resultado.** En el año 2020 y en los tres casos de bloqueo, todas las fases cumplen el criterio fijado de antemano. El IoU agregado por encima de 30° es:
- a 0,5°, al menos 0,90;
- a 1°, al menos 0,85;

y en todos los casos es mayor que el IoU entre pasos consecutivos a 6 h (0,32–0,52) y que el suelo de 0,5. Degradar por promedio de área cuesta como mucho 0,04 de IoU frente a decimar. Las formaciones que se emparejan casi nunca cambian de tipo.

Es una tabla **preliminar**: solo hemisferio norte, un año y tres casos elegidos por tener bloqueo.

## Reproducir

```bash
# dentro de la imagen netcdf-base (fijada por digest en .github/workflows/ci.yml)
sh backend/FAST-IBAN_Project/execution/code/tests/resolucion/medir_invariancia.sh <salida> <ficheros.nc>...
python3 backend/FAST-IBAN_Project/execution/code/tests/resolucion/tabla_invariancia.py <salida> <caso>:<pasos por día>...
```

Datos: ERA5 Z500 de 90°N a 0°, todas las longitudes, con el empaquetado int16 del portal. 2020 a 00 UTC (366 pasos); 2003-08-01…15, 1983-01-31…02-21 y 2019-06-24…07-01 a 00/06/12/18 UTC (60, 88 y 32 pasos). Código del núcleo: rama con ALG-310/311, `params.yaml` sin tocar. Las ejecuciones son deterministas, así que los números se reproducen exactamente.

## IoU agregado por encima de 30°

IoU ponderado por área sobre la retícula de 1°; entre corchetes, el intervalo del 95 % por bootstrap de bloques de 5 días. La columna de persistencia compara cada paso con el siguiente a 0,25° (24 h en 2020, 6 h en los casos).

**2020 (366 días a 00 UTC)**

| Fase | Tipo | Persistencia 24 h | 0,5° decimado | 0,5° promedio | 1° decimado | 1° promedio |
|---|---|---|---|---|---|---|
| Candidatos | MAX | 0,14 | 0,98 [0,98–0,99] | 0,97 [0,96–0,97] | 0,95 [0,94–0,95] | 0,92 [0,91–0,93] |
| Candidatos | MIN | 0,08 | 0,99 [0,99–0,99] | 0,98 [0,98–0,99] | 0,97 [0,97–0,98] | 0,96 [0,95–0,96] |
| Clusters | MAX | 0,14 | 0,98 [0,98–0,99] | 0,97 [0,96–0,97] | 0,95 [0,94–0,95] | 0,92 [0,91–0,93] |
| Clusters | MIN | 0,08 | 0,99 [0,99–0,99] | 0,98 [0,98–0,99] | 0,97 [0,97–0,98] | 0,96 [0,96–0,96] |
| Formaciones | bloqueo | 0,10 | 0,96 [0,94–0,97] | 0,96 [0,95–0,97] | 0,90 [0,88–0,92] | 0,89 [0,87–0,91] |

**Casos a 6 h** (persistencia / 0,5° decimado / 0,5° promedio / 1° decimado / 1° promedio)

| Fase | Tipo | 2003 (verano) | 1983 (invierno) | 2019 (verano) |
|---|---|---|---|---|
| Candidatos | MAX | 0,47 / 0,98 / 0,96 / 0,94 / 0,91 | 0,52 / 0,99 / 0,99 / 0,96 / 0,95 | 0,51 / 0,99 / 0,97 / 0,95 / 0,93 |
| Candidatos | MIN | 0,49 / 0,99 / 0,98 / 0,97 / 0,95 | 0,42 / 0,99 / 0,99 / 0,97 / 0,96 | 0,49 / 0,99 / 0,99 / 0,98 / 0,97 |
| Clusters | MAX | 0,47 / 0,98 / 0,96 / 0,94 / 0,91 | 0,52 / 0,99 / 0,99 / 0,96 / 0,95 | 0,51 / 0,98 / 0,97 / 0,95 / 0,94 |
| Clusters | MIN | 0,50 / 0,99 / 0,98 / 0,97 / 0,96 | 0,43 / 0,99 / 0,99 / 0,97 / 0,96 | 0,49 / 0,99 / 0,99 / 0,98 / 0,97 |
| Formaciones | bloqueo | 0,36 / 0,94 / 0,90 / 0,90 / 0,87 | 0,32 / 0,96 / 0,96 / 0,88 / 0,85 | 0,49 / 0,95 / 0,93 / 0,87 / 0,87 |

**Criterio (§6 del diseño):** se cumple en las 20 combinaciones de fase, tipo y degradación de cada caso a 6 h. En 2020 también se supera el suelo de 0,5; su persistencia de 24 h se da solo como información.

## Por bandas de latitud

**Candidatos y clusters.** El IoU **crece hacia el polo**. A 1° promediado:

| Banda | 2020 | 2003 | 1983 | 2019 |
|---|---|---|---|---|
| 30–50° (candidatos MAX/MIN) | 0,90 / 0,94 | 0,89 / 0,93 | 0,94 / 0,95 | 0,91 / 0,95 |
| 50–75° | 0,95 / 0,96 | 0,96 / 0,97 | 0,96 / 0,96 | 0,96 / 0,97 |
| 75–90° | 0,97 / 0,97 | 0,96 / 0,97 | 0,96 / 0,97 | 0,97 / 0,98 |

Es lo esperable: un grado de longitud mide más en km cerca del ecuador, así que la bilineal interpola sobre distancias mayores. En la banda de 75–90° hay candidatos en 276 de los 366 días de 2020 (MAX) y en 365 (MIN).

**Formaciones** (huella del MAX), a 1° decimado / promediado. Es la fase más sensible:

| Banda | 2020 | 2003 | 1983 | 2019 |
|---|---|---|---|---|
| 30–50° | 0,85 / 0,84 | **0,67 / 0,47** | 0,93 / 0,85 | 0,81 / 0,86 |
| 50–75° | 0,90 / 0,89 | 0,92 / 0,91 | 0,88 / 0,85 | 0,89 / 0,88 |
| 75–90° | 0,94 / 0,94 | 0,94 / 0,90 | **0,78 / 0,82** | 0,87 / 0,87 |

Hay dos puntos débiles:
- **2003, 30–50°.** Por debajo de 0,5 con promedio de área (0,47 a 1° y 0,48 a 0,5°). En ese verano solo hay 8 formaciones en esa banda: una sola que aparezca o desaparezca mueve mucho el IoU.
- **1983, 75–90°.** A 1° baja a 0,78–0,82.

El criterio congelado se evalúa sobre el total por encima de 30°, no por banda, pero se informa igual.

**Por paso,** la mediana del IoU de formaciones a 1° es 0,94–0,97. El percentil 10 baja a 0,51–0,85: los pasos con una o dos formaciones son todo o nada.

## Objetos

Emparejamiento uno a uno con IoU ≥ 0,5, a 1° promediado:

| Objetos | 2020 | 2003 | 1983 | 2019 |
|---|---|---|---|---|
| Clusters MAX emparejados (ref / degradado) | 0,96 / 0,97 | 0,95 / 0,97 | 0,99 / 0,99 | 0,97 / 0,97 |
| Clusters MIN emparejados | 0,97 / 0,99 | 0,98 / 0,99 | 0,98 / 0,99 | 0,98 / 1,00 |
| Formaciones emparejadas | 0,96 / 0,94 | 0,95 / 0,93 | 0,95 / 0,91 | 0,93 / 0,94 |
| Distancia de centroides de formaciones, mediana / p90 (km) | 31 / 58 | 32 / 58 | 32 / 61 | 29 / 57 |
| Formaciones que cambian de tipo | 6 de 682 | 0 de 105 | 1 de 137 | 2 de 101 |

- **0,5°:** los centroides de las formaciones emparejadas se mueven 15–28 km de mediana, del orden de medio paso de la rejilla (≈ 55 km).
- **POLAR_HIGH:** siempre se empareja con POLAR_HIGH.
- **Divisiones y fusiones:** hay pocas. La más alta es la de 27 fusiones de MIN en 2020 a 1° promediado, sobre 6531 clusters.

## Lecturas y límites

- **Candidatos frente a clusters.** Dan casi el mismo IoU. Los filtros de área y de latitud quitan muy poca superficie por encima de 30°, así que, tal como están definidas, las dos fases no se distinguen.
- **Decimación frente a promedio.** La diferencia es pequeña (≤ 0,04 en el total), como cabía esperar de un campo tan suave como Z500. El promedio de área es la prueba más exigente y la que se debe citar.
- **No es una comparación con otros métodos.** Dice cuánto cambian las detecciones de este método con la resolución de entrada, con candidatos cada 1°. El mismo test aplicado a DAV va aparte (ALG-308b).
- **Pendiente para darla por cerrada:**
  - más años;
  - el hemisferio sur;
  - una estación de verano completa, porque la banda de 30–50° de 2003 es la más débil.

  En la fila del polo, el promedio de área difiere del remapeo conservativo de CDO por diseño (media de toda la fila).

## DAV y controles geométricos (ALG-308b)

Aplica §7 y la adenda §8 del diseño; la adenda se congeló antes de calcular los controles. DAV es `DAV()` de blocktrack v1.1 en variante instantánea (GHGS > 0 y GHGN < −10 m/°) y, como variante declarada, con GHGS2 < −5 m/°. Comparte ficheros degradados, retícula de 1° y métricas con FAST-IBAN. DAV solo es computable entre 30° y 75°, así que la comparación conjunta usa ese dominio (75° incluido).

**Lectura.** Con las mismas degradaciones, DAV mantiene un IoU ≥ 0,99, y con decimación exactamente 1. Es lo esperable por construcción: usa diferencias de Z500 a 15° en puntos que las dos rejillas conservan, mientras que FAST-IBAN decide con estructura local a 500 km. Por eso las dos cifras **no ordenan los métodos por calidad**: cada una mide la sensibilidad a la rejilla de un diagnóstico distinto. FAST-IBAN cumple el criterio fijado de antemano en todas las fases, también entre 75° y 90°, donde DAV no es computable.

**Controles a 1° promediado** (30–75°):

| | 2020 | 2003 | 1983 | 2019 |
|---|---|---|---|---|
| **IoU** FAST-IBAN formaciones / candidatos MAX / MIN | 0,88 / 0,92 / 0,96 | 0,87 / 0,91 / 0,95 | 0,86 / 0,95 / 0,96 | 0,87 / 0,93 / 0,96 |
| **IoU** DAV / con GHGS2 | 0,992 / 0,991 | 0,991 / 0,992 | 0,996 / 0,995 | 0,992 / 0,993 |
| **R** = (1 − IoU₁°) / (1 − IoU₆ₕ), FAST-IBAN formaciones / cand. MAX / MIN | — (24 h) | 0,20 / 0,18 / 0,09 | 0,22 / 0,10 / 0,07 | 0,26 / 0,14 / 0,07 |
| **R** DAV / con GHGS2 | — | 0,04 / 0,04 | 0,02 / 0,02 | 0,03 / 0,03 |
| **δ_eff** a 1° (km), FAST-IBAN formaciones / cand. MAX / MIN | 12 / 8 / 4 | 13 / 9 / 4 | 15 / 5 / 4 | 14 / 7 / 3 |
| **δ_eff** a 1° (km), DAV | 2 | 2 | 1 | 2 |
| **Coste del promedio** (IoU decimado − promediado), FAST-IBAN formaciones / cand. MAX | 0,012 / 0,027 | 0,031 / 0,036 | 0,034 / 0,009 | −0,005 / 0,019 |
| **Coste del promedio**, DAV | 0,008 | 0,009 | 0,004 | 0,008 |
| **Fracción marcada f**, FAST-IBAN formaciones / DAV / DAV con GHGS2 | 0,3 % / 7,3 % / 2,9 % | 0,3 % / 13,1 % / 4,0 % | 0,3 % / 5,3 % / 4,4 % | 0,6 % / 7,3 % / 3,1 % |

- **La geometría no lo explica todo.** Con el factor perímetro/área cancelado (R), el cambio por pasar a 1° equivale al 20–26 % del de 6 h de evolución en las formaciones de FAST-IBAN y al 2–4 % en DAV: de 5 a 11 veces más.
- **Aun así, el desplazamiento es pequeño.** El borde equivalente de las formaciones se mueve 12–15 km, una décima parte del paso de la retícula (≈ 111 km). En 6 h de evolución se mueve 66–94 km (156 km en 24 h, en 2020).
- **La pérdida viene sobre todo de la decimación, no del promedio.** El coste del promedio de FAST-IBAN (−0,005 a 0,036) es del mismo orden que el de DAV (0,004 a 0,009). La mayor parte de la pérdida ya aparece con la decimación, es decir, al muestrear rayos y contornos sobre una rejilla más gruesa. Para DAV la decimación vale 1 por construcción.
- **Las máscaras de DAV son mucho mayores** (f del 3 al 13 %, frente al 0,3–0,6 % de nuestras formaciones), así que su IoU se beneficia del efecto geométrico. El IoU por azar es despreciable en los dos métodos (≤ 0,07).
- **GHGS2** reduce la fracción marcada de DAV pero no cambia su sensibilidad a la resolución.

**No es defendible** decir que un método es más o menos robusto que el otro, llamar "invariante" a FAST-IBAN sin matices (esto es degradar desde 0,25°, no ejecutar a resolución nativa), dar cifras de DAV por encima de 75°, ni extrapolar al hemisferio sur o a otros años.

**Reproducir:**

```bash
# en python:3.11-slim con numpy, xarray, scipy, tqdm, netCDF4, matplotlib y cartopy; blocktoolbox.py de blocktrack v1.1
python3 backend/FAST-IBAN_Project/execution/code/tests/resolucion/dav_resolucion.py --blocktrack <dir> --pasos-dia N [--ghgs2] <ref.nc> <dec2.nc> <avg2.nc> <dec4.nc> <avg4.nc> > <dav>/<caso>[_ghgs2].json
python3 backend/FAST-IBAN_Project/execution/code/tests/resolucion/tabla_controles.py <salida de medir_invariancia.sh> <dav> <caso>:<pasos por día>...
```
