# Cómo funciona FAST-IBAN, paso a paso

Material para explicar el algoritmo: la columna **En llano** sirve para cualquier persona; la columna **En técnico** usa los términos del campo. El diagrama que acompaña a este documento es [`algoritmo_paso_a_paso.svg`](algoritmo_paso_a_paso.svg).

> **Este documento y el diagrama se actualizan siempre que cambie el algoritmo.** Cualquier cambio en `execution/code` que altere los pasos, los parámetros por defecto o las categorías de salida se refleja aquí en el mismo PR, junto a `delta_correcciones.md`.

Revisado con el agente físico del proyecto y contrastado con el código (2026-09-17).

## La idea en tres frases

1. **Se mide con distancias reales, no con casillas de la rejilla.** Desde cada punto se lanzan 64 rayos de 500 km sobre la esfera, así que un sector de ±45° significa lo mismo a 40° que a 85° de latitud.
2. **Clasifica la forma, no solo detecta una anomalía.** Distingue una Omega (alta con dos bajas a los lados) de un Rex (alta sobre baja).
3. **Llega hasta el polo.** Los índices basados en diferencias de altura a ±15° de latitud no se pueden calcular por encima de 75°; este método sí, porque no necesita mirar tan lejos en latitud.

## Los pasos

| # | En llano | En técnico |
|---|---|---|
| 1. Datos | Una “foto” del aire a unos 5,5 km de altura, cada 6 horas. | Geopotencial de ERA5 en 500 hPa, convertido a altura geopotencial dividiendo por `g₀`. Se lee un paso temporal cada vez. Si las longitudes vienen de 0 a 360 se pasan a −180…180. |
| 2. Zona | Se elige qué parte del mundo se mira. Se descarga un poco más de lo pedido para que los puntos del borde puedan mirar a su alrededor, pero solo se informa dentro de la zona pedida. | El portal descarga el área con un margen de `ray_distance_km` + una celda (5° en latitud; 4,5°/cos φ en longitud). Los candidatos se toman solo dentro de los límites pedidos, en latitud y longitud; los rayos de contorno llegan hasta ±90° desde el límite hacia el ecuador. |
| 3. Puntos de prueba | Una cuadrícula de puntos de prueba, uno cada grado (unos 100 km). | Retícula de candidatos de 1° (`candidate_spacing_deg`), múltiplo entero de la resolución y anclada a la primera fila y columna del fichero. |
| 4. ¿Cima o valle? | Desde cada punto se mira en 64 direcciones a 500 km: si casi todo lo que hay alrededor está más bajo, es una cima; si está más alto, un valle. | 64 rayos de círculo máximo a 500 km (`n_rays`, `ray_distance_km`) con interpolación bilineal en el extremo. Con 57 de 64 (`pass_fraction` 0,9) por debajo → MAX; por encima → MIN. |
| 4b. Si falta información | Si una dirección cae fuera de los datos, no cuenta ni a favor ni en contra; con más de 7 direcciones sin datos, el punto no se clasifica. | Un rayo que no se puede interpolar no vota; el umbral sigue siendo 57 de 64 rayos. Con el margen de descarga no llega a ocurrir dentro del área pedida. |
| 5. Agrupar | Las cimas pegadas forman una sola “montaña”; el mapa se cierra sobre sí mismo y el polo es un único punto. | Componentes conexas (vecindad 8) entre candidatos del mismo tipo, con periodicidad en ±180° y la fila polar colapsada. Centroide por media vectorial 3D, redondeado al nodo de rejilla. |
| 6. Descartar | Fuera lo demasiado pequeño y lo demasiado tropical. | Área del cluster (suma de las áreas de banda de sus celdas, R²·Δλ·(sin φ₂ − sin φ₁), con el casquete en la fila del polo) ≥ 22 000 km² y punto más cercano al polo por encima de 30°. Sin límite polar por defecto. |
| 7. ¿Qué forma tiene? | Se miran sus curvas de nivel: si tiene dos valles a los lados es una Omega; si tiene uno justo debajo, un Rex. | Isohipsas múltiplos de 20 m desde la altura del centro hasta el mínimo del rayo hacia el polo. En cada nivel, rayos geodésicos de 25 km y sectores de ±45° dicen por dónde cruza el contorno. Los niveles con contorno cerrado se descartan: un máximo aislado no es un bloqueo. |
| 8. Resultado | Una tabla con lo detectado y la receta exacta que se usó. Lo que se ha mirado con datos incompletos se marca. | CSV de puntos y de formaciones, con toda la configuración en la cabecera; figuras en Python. La columna `truncada` vale 1 cuando algún rayo de contorno se quedó sin datos porque el fichero se acaba (ALG-376): en una petición regional pequeña es lo normal, porque los rayos de contorno llegan a `search_radius_km` = 3000 km. En el mapa esas formaciones salen con el contorno a trazos y un asterisco. Parar en el límite de latitud pedido no cuenta como truncar. |
| 9. Siempre igual | Los mismos datos dan siempre el mismo resultado. | Determinista: salida idéntica con cualquier número de hilos o procesos, comprobado en los tests de invariancia. |

## Las tres categorías de salida

| | En llano | En técnico |
|---|---|---|
| **Omega (Ω)** | Una zona de aire alto con una zona baja a cada lado; el aire la rodea dibujando una omega y la circulación se queda parada. | Alta cerrada al este y al oeste y abierta hacia el ecuador, con dos mínimos flanqueantes, uno a cada lado en longitud, no más cerca del polo que ella, a menos de 3000 km (`search_radius_km`) y **a más de 700 km de su meridiano** (`rex_max_offset_km`): un mínimo más cerca del meridiano está bajo la alta, en la franja del Rex, y no cuenta como flanco (ALG-362). |
| **Rex** | Una zona alta con una sola zona baja justo debajo, hacia el ecuador: el dipolo clásico descrito por Rex en 1950. | Alta cerrada hacia el ecuador y abierta por un lado en longitud; mínimo hacia el ecuador, a ≤ 700 km del meridiano de la alta (`rex_max_offset_km`) y abierto por el lado contrario al de la alta. Valen las dos orientaciones: alta abierta al oeste y baja al este, o al revés (ALG-377). |
| **Alta polar** | Una zona alta tan cerca del polo que ya no tiene sentido hablar de “hacia el norte” o “hacia el sur”. Se marca aparte. | Máximo con el centroide a menos de `ray_distance_km` del polo (guarda de 85,5°): categoría de exclusión, exportada sin mínimos. |

Si un mismo máximo admite las dos configuraciones, gana la más compacta (la de menor distancia media entre sus centros).

## Qué NO dice este método

- **No predice.** Diagnostica un campo que ya existe. Si ese campo es una previsión, diagnostica la previsión, pero el algoritmo no predice nada por sí mismo.
- **Es instantáneo.** Todavía no exige que la estructura dure varios días, que es lo que pide la definición al uso de bloqueo. El seguimiento temporal es un paso posterior del proyecto.
- **La “alta polar” no es un bloqueo.** Es la etiqueta de los casos en los que la geometría de direcciones deja de tener sentido, y se documenta como estructura anticiclónica instantánea del casquete polar.
- **Los umbrales no están ajustados a otro método.** Cada uno sale de la literatura o de una medición propia preregistrada, y las validaciones se documentan aunque queden indeterminadas.

## Para hacer figuras con datos reales

Convenciones habituales que conviene respetar al ilustrar un caso: Z500 en contornos cada 60 m (los 20 m son el paso interno del algoritmo, no el de la figura), anomalías en escala divergente centrada en cero, A/B (o H/L) para los centros, y proyección polar estereográfica u ortográfica si se muestra la franja de 75–90°, que Mercator deforma por completo.

## Fuentes

- Rex, D. F. (1950). *Blocking action in the middle troposphere and its effect upon regional climate.* Tellus 2(3), 196–211. [doi:10.3402/tellusa.v2i3.8546](https://doi.org/10.3402/tellusa.v2i3.8546)
- Tibaldi, S. y Molteni, F. (1990). *On the operational predictability of blocking.* Tellus A 42(3). [doi:10.3402/tellusa.v42i3.11882](https://doi.org/10.3402/tellusa.v42i3.11882)
- Davini, P. et al. (2012). *Bidimensional diagnostics, variability and trends of Northern Hemisphere blocking.* J. Climate. [doi:10.1175/JCLI-D-12-00032.1](https://doi.org/10.1175/JCLI-D-12-00032.1)
- Sousa, P. M. et al. (2021). *A new combined detection algorithm for blocking and subtropical ridges.* J. Climate. [doi:10.1175/JCLI-D-20-0658.1](https://doi.org/10.1175/JCLI-D-20-0658.1)
- Pinheiro, M. C., Ullrich, P. A. y Grotjahn, R. (2019). *Atmospheric blocking and intercomparison of objective detection methods.* Clim. Dyn. [doi:10.1007/s00382-019-04782-5](https://doi.org/10.1007/s00382-019-04782-5)
- AMS Glossary of Meteorology, entrada «blocking» (consultada el 17-09-2026).
