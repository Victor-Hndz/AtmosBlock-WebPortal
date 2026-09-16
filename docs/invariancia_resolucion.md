# Invariancia a la resolución (ALG-308): diseño congelado

Este documento fija **antes de medir** cómo se mide si las detecciones de FAST-IBAN dependen de la resolución de la rejilla de entrada. Nada de lo que sigue se cambia a la vista de los resultados. Si hubiera que cambiar algo, se hará en un commit aparte, con el motivo, y se darán las dos versiones.

La pregunta es cuánto cambian las detecciones cuando el mismo campo Z500 llega a 0,5° o a 1° en vez de a 0,25°. No es una comparación con otros métodos: cada método se compara solo consigo mismo.

## 1. Datos

| Conjunto | Pasos | Uso |
|---|---|---|
| ERA5 Z500 2020, 00 UTC, 90°N–0°, todas las longitudes | 366 | Tabla principal. El año se eligió con una regla previa: el último de 1991–2020 |
| Casos de bloqueo a 6 h: 2003-08-01…15, 1983-01-31…02-21, 2019-06-24…07-01 | 60, 88, 32 | Complemento y referencia de persistencia (§6) |

Todos están a 0,25° con el empaquetado int16 del portal. La tabla es **preliminar**: un año y unos casos elegidos por tener bloqueo. Hacen falta más años y el hemisferio sur para darla por cerrada.

## 2. Resoluciones y degradación

La referencia es 0,25°. Se comparan 0,5° y 1°, degradados de dos formas:

- **Decimación** (`recortar_nc`, 1 de cada 2 o de cada 4 puntos). Conserva los valores exactos en los puntos compartidos, así que solo prueba la interpolación bilineal de los rayos entre puntos más separados.
- **Promedio de área** (`degradar_nc`). Filtro separable centrado en cada punto de la rejilla gruesa: pesos [½, 1, ½] para 0,5° y [½, 1, 1, 1, ½] para 1°, en latitud y en longitud (con vuelta en ±180°). En latitud, cada fila nativa pesa además el área de su banda, `sin(φ+δ/2) − sin(φ−δ/2)`, recortada a ±90°. En una rejilla alineada con los enteros esto equivale al remapeo conservativo de primer orden (Jones, 1999, doi:10.1175/1520-0493(1999)127<2204:FASOCR>2.0.CO;2). Casos especiales:
  - **Polo:** la fila de ±90° es la media de todas las longitudes de las filas nativas que caen en su celda (la misma para toda la fila, igual que la vecindad trata el polo como un punto).
  - **Borde del dominio (0°):** los pesos que caen fuera se descartan y se renormaliza. No afecta a nada por encima de 30°.
  - **Salida:** se reempaqueta en int16 con el mismo `scale_factor` y `add_offset`. El error de cuantización es como mucho medio `scale_factor`, igual que en la entrada.

Los parámetros **no** se reescalan con la resolución: ya están en km o en grados físicos, y eso es justo lo que se mide. El resultado vale para candidatos cada 1°. Una densidad de candidatos distinta es otra pregunta.

## 3. Ejecución

`FAST-IBAN_omp <fichero> 25 90 -180 180 out/ <hilos>` con `config/params.yaml` sin tocar, más una segunda ejecución para la fase de candidatos (§4). La salida es la misma con cualquier número de hilos.

## 4. Fases y huellas

Los candidatos están anclados a una retícula de 1°, así que a las tres resoluciones se evalúan los mismos puntos geográficos. Todo se compara sobre esa retícula, sin remapear salidas. Cada punto pesa el área de su celda de 1°: `R²·Δλ·(sin(φ+½°) − sin(φ−½°))`. Los puntos de la fila de ±90° cuentan como **un único punto**, con el área del casquete `2πR²(1 − cos ½°)`.

| Fase | Huella por paso | De dónde sale |
|---|---|---|
| **Candidatos** | Puntos MAX y puntos MIN, por separado | `*_selected_*.csv` de una ejecución con `min_cluster_area_km2: 0` y `cluster_lat_min_deg: 0` (sin filtros, todo candidato está en algún cluster) |
| **Clusters** | Puntos MAX y puntos MIN de los clusters que pasan los filtros, por separado | `*_selected_*.csv` de la ejecución normal |
| **Formaciones** | Puntos del cluster MAX de cada formación, todas las categorías juntas ("bloqueo") | `*_formations_*.csv` + `*_selected_*.csv` de la ejecución normal |

Las huellas de formación no incluyen los mínimos: meterían en la unión ciclones que no están bloqueados.

## 5. Métricas

**IoU agregado** (principal), por fase, tipo y banda: `Σ_pasos área(A∩B) / Σ_pasos área(A∪B)`, con A a 0,25° y B degradado. No se indefine en pasos vacíos.

**Por paso:** mediana y percentil 10 del IoU de los pasos con unión no vacía.

**Intervalo:** bootstrap por bloques de 5 días consecutivos (la autocorrelación del bloqueo es de días), 1000 réplicas, semilla fija 308, intervalo del 95 % por percentiles.

**Bandas** por |latitud| del punto: 30–50°, 50–75° y 75–90°, más el total por encima de 30°. En la banda de 75–90° se da también el número de pasos con detección.

**Objetos** (clusters por tipo y formaciones):
- Un objeto es la huella de un cluster (o del MAX de una formación) en un paso.
- Emparejamiento uno a uno con IoU del par ≥ 0,5, en orden de IoU descendente; empates por menor identificador de 0,25° y después del degradado.
- Se dan: fracción de objetos de 0,25° emparejados, fracción de objetos degradados emparejados, divisiones (un objeto de 0,25° solapa con dos o más degradados), fusiones (al revés) y distancia de centroides de los pares en km (mediana y percentil 90).
- **Formaciones:** matriz de confusión OMEGA / REX / POLAR_HIGH de los pares emparejados.

## 6. Criterio fijado de antemano

La literatura no ofrece un umbral de "IoU alto" para la invariancia a la resolución de un diagnóstico, así que se fijan dos, por fase y tipo, sobre el IoU agregado por encima de 30°:

1. **Relativo:** IoU(0,25° frente a degradado) ≥ IoU(paso *t* frente a *t*+6 h, a 0,25°) en los casos a 6 h. Degradar la resolución debe perturbar menos que 6 horas de evolución real. En 2020 (pasos de 24 h) el IoU entre días consecutivos se da solo como información.
2. **Suelo absoluto:** IoU ≥ 0,5 (la misma convención de solapamiento que el emparejamiento de objetos).

Una fase cumple si cumple los dos. Se informa de cada combinación de resolución, degradación, fase y tipo, cumpla o no.

## 7. Comparación con DAV (ALG-308b, aparte)

El mismo test, con los mismos ficheros degradados, se aplicará a DAV (Davini et al., 2012, doi:10.1175/JCLI-D-12-00032.1) con la función `DAV()` de blocktrack (Filippucci et al., 2024, doi:10.5194/wcd-5-1207-2024), en su variante instantánea (GHGS > 0 y GHGN < −10 m/°), sin extensión en longitud, persistencia ni seguimiento. Con decimación, DAV da IoU 1 por construcción (es puntual), así que solo informa el promedio de área. Cada método se compara consigo mismo, nunca uno contra otro.

## 8. Adenda: controles y variante GHGS2 (añadida antes de calcularlos)

**Motivo.** Con el IoU de §5 ya medido, DAV sale casi insensible al promedio de área (≥ 0,99) y FAST-IBAN algo menos (0,85–0,96). Un IoU alto también puede deberse solo a la geometría: si lo que cambia es el borde, 1 − IoU ≈ (P/A)·δ, así que máscaras grandes y compactas dan IoU alto con el mismo desplazamiento. Antes de leer las dos cifras juntas se fijan estos controles. Se añaden después de ver el IoU de §5, pero **antes de calcularlos**, y no cambian nada de lo anterior.

**Dominio común.** Además de las bandas de §5, se da el total en **30–75°, con 75° incluido**, para los dos métodos. DAV solo es computable con φ₀ entre 30° y 75°. En DAV la banda 75–90° de §5 contiene únicamente la fila de 75° y se informa como **no computable**.

**Controles**, por fase, degradación y dominio (30–75° y total por encima de 30°):
1. **Cociente de persistencia**, solo en los casos a 6 h: `R = (1 − IoU_resolución) / (1 − IoU_6h)`. En primera aproximación el factor P/A se cancela, así que R compara el desplazamiento por resolución con el de 6 h de evolución.
2. **Desplazamiento equivalente del borde:** `δ_eff = Σ_pasos área(A △ B) / Σ_pasos (P_A + P_B)/2`, en km, que se compara con el paso de la retícula (≈ 111 km).
   - **Perímetro de una máscara:** suma de las aristas de celda de 1° entre un punto marcado y un vecino no marcado (4 vecinos) con los dos dentro del dominio. Así el recorte del dominio no cuenta como borde.
   - **Longitud de cada arista:** `R·1°` entre vecinos de la misma fila y `R·1°·cos(φ ± ½°)` entre filas. La fila polar, que es un único punto, tiene por vecinos las 360 celdas de ±89°.
3. **Fracción de área marcada** a 0,25°, `f` (media por paso del área marcada entre el área del dominio en los hemisferios presentes), y el **IoU esperado por azar** entre dos máscaras independientes con esa fracción, `f / (2 − f)`.
4. **Coste del promedio:** `IoU_decimado − IoU_promedio`. Es el único término comparable directamente entre métodos: con decimación, DAV da 1 por construcción.

**Variante declarada de DAV, con GHGS2.** Se repite todo con `mer_gradient_filter=True` de blocktrack, que añade GHGS2 < −5 m/°. Se da junto a la variante de §7, sin sustituirla.

**Qué no se hará.** No se ajusta ningún umbral ni se suaviza la entrada para acercar las cifras. Las dos mediciones no ordenan los métodos por calidad: cada una mide la sensibilidad a la rejilla de un diagnóstico distinto.
