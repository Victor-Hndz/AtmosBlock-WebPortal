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
