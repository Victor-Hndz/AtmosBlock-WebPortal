# Validación del umbral del Rex (ALG-368): preregistro

¿Es `rex_max_offset_km` = 780 km (10° de longitud a φ_min = 45°N) mejor que el valor actual, 700 km (10° a 50°N)? Se valida con datos independientes elegidos antes de medir. Este documento se congela por partes, siempre **antes de ejecutar nada** sobre los datos sorteados.

## 1. Periodo (congelado antes de descargar)

- **Estación:** DJFMAM del hemisferio norte (1 de diciembre de Y−1 a 31 de mayo de Y), ERA5 Z500 a 0,25°, 00/06/12/18 UTC, 90–0°N. El Rex es frecuente en invierno y primavera, y un DJF solo probablemente no daría 30 Rex marginales.
- **Años candidatos:** Y ∈ 1991–2019, excluidos los que tienen datos ya usados en el proyecto entre diciembre de Y−1 y agosto de Y: 2003 (caso de agosto de 2003), 2004 (25-02-2004) y 2019 (24-06 a 01-07-2019 y el caso de temperatura del 28-06-2019). 1983, 2020, 2022 y 2024 quedan fuera del rango.
- **Sorteo** (Python 3.13.11):

  ```python
  lista = [y for y in range(1991, 2020) if y not in {2003, 2004, 2019}]
  rng = random.Random(368)
  pool, orden = lista[:], []
  while pool:
      orden.append(pool.pop(int(rng.random() * len(pool))))
  ```

  Resultado: `orden[:2] = [2015, 2007]`.
- **Primer semestre:** diciembre de 2014 a mayo de 2015. **Segundo semestre, solo si hace falta** (la regla de parada se fija en §2 y mira únicamente el tamaño de la muestra): diciembre de 2006 a mayo de 2007.
- **Hemisferio sur (puerta G3, solo comprobación de funcionamiento, no decide el umbral):** JJA de 2015 (1 de junio a 31 de agosto), 90–0°S, a las mismas horas.

Nadie abre mapas ni campos de estos periodos antes de ejecutar el protocolo completo.

## 2. Protocolo y regla de decisión (congelados antes de medir)

**Código.** `main` después de corregir la forma del mínimo del Rex (ALG-361). Su hash se anota en §3 antes de la primera ejecución. Se usa `config/params.yaml` sin tocar, salvo `rex_max_offset_km`, con los límites `25 90 -180 180`.

**Ejecuciones** (sobre cada semestre):
- a 0,25°, con `rex_max_offset_km` = 700, 780 y 1060;
- a 1° (decimado ×4 con `recortar_nc`, como en ALG-366), con 1060.

1060 km es el techo de los criterios publicados. **No es candidato**: solo sirve para buscar parejas, de modo que un Rex cerca del borde de 780 no salga penalizado. No se informa de cuántos Rex da.

**Definiciones:**
- **Rex:** formación `REX` con su máximo y su mínimo, identificados por el centroide de cada cluster. `d` = distancia del centroide del mínimo al meridiano del centroide del máximo (la misma función del núcleo).
- **C (núcleo):** Rex de la ejecución de 780 con `d ≤ 700` km.
- **M (marginales):** Rex de la ejecución de 780 con `700 < d ≤ 780` km, sin un Rex con el mismo máximo y el mismo mínimo en la ejecución de 700 (mismo paso y mismos identificadores de cluster; las dos ejecuciones tienen los mismos clusters).
- Las sustituciones de mínimo y las Omega que pasan a Rex entre 700 y 780 se cuentan y se describen, pero **no deciden**.
- **Continuidad de un Rex** (1/0): hay un Rex de la ejecución de 1060 en el paso anterior o en el siguiente con el máximo **y** el mínimo a ≤ 500 km de los suyos.
- **Robustez de un Rex** (1/0): hay un Rex de la ejecución de 1060 a 1°, en el mismo paso, con el máximo y el mínimo a ≤ 1° de latitud y de longitud (con vuelta en ±180°).
- **P y R:** medias de continuidad y robustez en M (`P_M`, `R_M`) y en C (`P_C`, `R_C`). `Δ_P = P_M − P_C` y `Δ_R = R_M − R_C`.
- **Episodio:** componente conexa de los Rex de la ejecución de 780 unidos entre pasos consecutivos por la misma relación de continuidad (máximo y mínimo a ≤ 500 km).
- **Intervalo:** IC del 90 % (percentiles 5 y 95) de `Δ_P` y `Δ_R` por bootstrap de episodios: 2000 réplicas con semilla 368; en cada una se remuestrean episodios con reemplazo y se recalculan P y R con sus Rex.

**Regla de parada** (solo mira el tamaño de la muestra): si en el primer semestre `n_M < 30` o M ocupa menos de 10 episodios, se añade el segundo y se analizan juntos. No se añade un tercer periodo sin un nuevo preregistro.

**Regla de decisión:**
- **Adoptar 780 km** si se cumplen las cuatro: `n_M ≥ 30` en ≥ 10 episodios; límite inferior del IC de `Δ_P` ≥ −0,15; límite inferior del IC de `Δ_R` ≥ −0,15; menos del 25 % de M con el mínimo por debajo de 35°N.
- **Mantener 700 km** si el límite superior del IC de `Δ_P` o de `Δ_R` es < −0,15.
- **Abierta** en cualquier otro caso, o si la muestra no llega tras los dos semestres. Se mantiene 700 km y se documenta como indeterminado.

El margen de 0,15 es un juicio declarado, no un valor de la literatura. **Predicción de coherencia** (no decide): la mediana de φ_min de M será menor que la de C, porque `d` crece al bajar φ_min.

**Qué no se hace:**
- No se prueba ningún otro valor (840 ya se midió como fragilidad en ALG-364).
- No se miran mapas ni campos de los periodos sorteados antes de terminar.
- Si aparece un bug, se corrige con su propio delta sobre los casos ya usados y se repite todo el análisis, informando de las dos versiones.
- 1983 queda como ilustración, fuera de la decisión.
- El resultado vale para DJFMAM del hemisferio norte.

## 3. Código (anotado antes de la primera ejecución)

Commit `d9d03b09831a2aa1f2877266fdb3bf9501c840ec` (ALG-361, PR #132), árbol de `backend/FAST-IBAN_Project/execution/code` = `8e27893d2448c393b029e13d69ad4a37fe896bed`. El hash del árbol depende solo del contenido, así que sirve también para `main` después del merge mientras no cambie ese directorio. Se ejecuta ese árbol extraído con `git archive`, compilado en la imagen `netcdf-base` fijada por digest en el CI.

## 4. Hemisferio sur: comprobación de funcionamiento (JJA 2015)

No decide el umbral: se usa el mismo que en el hemisferio norte, porque la distancia en km ya es simétrica.

- **Que corre:** a 0,25° y a 1° (decimado), con los límites `-90 -25 -180 180`.
- **Espejo real:** el campo reflejado al hemisferio norte (`recortar_nc ... espejo`) debe dar las mismas formaciones con la latitud cambiada de signo. Cualquier diferencia es un bug.
- **Rex:** el mínimo queda siempre hacia el ecuador del máximo.
- **Plausibilidad, solo descriptiva:** distribución de la latitud de los máximos de Omega y Rex, que se espera concentrada en 40–70°S.
- **POLAR_HIGH** sobre la meseta antártica se informa sin interpretarlo: allí 500 hPa queda cerca de la superficie.

## 5. Resultados

Ejecutado el árbol `8e27893d` (§3) sobre los dos semestres sorteados. El primero dio 10 Rex marginales, por debajo del mínimo de 30, así que la regla de parada de §2 pidió el segundo; los dos se analizan juntos, como estaba previsto.

| | DJFMAM 2014-15 | DJFMAM 2006-07 | Juntos |
|---|---|---|---|
| Rex con 700 km | 186 | 221 | 407 |
| Rex con 780 km | 192 | 240 | 432 |
| Marginales (M), 700 < d ≤ 780 | 10 | 21 | **31**, en 27 episodios |
| Núcleo (C), d ≤ 700 | 182 | — | 401, en 194 episodios |

**Muestra suficiente:** sí (31 ≥ 30 en 27 ≥ 10 episodios). Ningún marginal tiene el mínimo por debajo de 35°N.

| Métrica | Marginales (M) | Núcleo (C) | Diferencia M − C, IC 90 % |
|---|---|---|---|
| Continuidad a ±1 paso (6 h) | 0,68 | 0,71 | [−0,20; +0,11] |
| Robustez a 1° | 0,81 | 0,88 | [−0,21; +0,03] |

**Decisión: abierta. Se mantiene `rex_max_offset_km` = 700 km.**

Los dos intervalos incluyen el cero, así que no hay indicio de que los Rex marginales sean peores; pero su límite inferior (−0,20 y −0,21) pasa del margen de −0,15 fijado, así que tampoco se puede descartar que lo sean. Es el resultado que el diseño ya preveía como más probable: con 31 marginales, el intervalo de una proporción mide unos ±0,2. No se añade un tercer periodo sin un preregistro nuevo.

**Otros datos, descriptivos:**
- Pasar de 700 a 780 km cambia el mínimo elegido en 6 Rex y convierte 6 Omega en Rex.
- La **predicción de coherencia falla**: la mediana de φ_min es 53°N en los marginales y 52°N en los núcleo, prácticamente igual, cuando se esperaba menor en los marginales. En el primer semestre por separado era incluso mayor (64°N frente a 51°N). La distancia al meridiano depende tanto de Δλ como de φ_min, así que los marginales no son solo Rex de latitudes bajas.

## 6. Hemisferio sur (JJA 2015): comprobación de funcionamiento

| | 0,25° | 1° |
|---|---|---|
| OMEGA / REX / POLAR_HIGH | 289 / 49 / 66 | 296 / 47 / 68 |

- **Corre** en las dos resoluciones con los límites `-90 -25`, sin recompilar.
- **Rex:** en los 49, el mínimo queda hacia el ecuador del máximo.
- **Espejo real: falla.** El campo reflejado al hemisferio norte no da las mismas detecciones: 43 puntos de 320 595 y 11 formaciones de 397 son distintas, todas entre 22° y 39°. La causa es que el límite hacia el ecuador se toma siempre de `LAT_LIM_MIN`, que en el hemisferio sur es el límite polar: con `-90 -25` se recorren filas y rayos entre 0° y −25°, que en el norte quedan fuera. El test `simetria_hemisferica` no lo detecta porque su fichero del sur ya está recortado en −25°. Queda como tarea aparte (ALG-374) y **bloquea la puerta G3**.
- **Descriptivo, sin interpretar:** 197 de las 338 formaciones Omega y Rex tienen el máximo al sur de 70°S (mediana de las Omega, 73°S), lejos de la franja de 40–70°S de la climatología de bloqueo del hemisferio sur. Allí 500 hPa queda cerca de la superficie de la meseta antártica. Pendiente de consultar (INV-003).
