# Benchmark de FAST-IBAN (ALG-205)

Mide el rendimiento del núcleo en C antes y después de las optimizaciones de la fase 2
(ALG-201…204). Las optimizaciones **no pueden cambiar la salida**: el hash de regresión debe
seguir igual y el propio benchmark comprueba que todas las ejecuciones producen los mismos CSV.

## Cómo se mide

```bash
# Desde la raíz del repo, con Docker y la imagen del CI fijada por digest
docker run --rm -v "$PWD:/src:ro" -w /src victorhndz/netcdf-base@sha256:6f448a9eda3a12073be2c427d524d984387a85fc408a2f5755b648f59361a429 sh -c '
  E=backend/FAST-IBAN_Project/execution/code
  cmake -S $E -B /tmp/b && cmake --build /tmp/b --parallel --target FAST-IBAN FAST-IBAN_omp
  python3 $E/tests/benchmark/benchmark.py --bin-dir /tmp/b --caso <caso.nc> --hilos 1,2,4,6,12 --reps 5'
```

- **Binarios:** `FAST-IBAN` (serie) y `FAST-IBAN_omp` (OpenMP) compilados en `Release` (`-O3`). Las
  variantes MPI no las compila CMake; su escalado se evalúa en ALG-206.
- **Argumentos:** latitud 25–85, longitud −180–180, como el test de regresión.
- **Repeticiones:** 5 por configuración; se da la **mediana** y el rango del tiempo de pared.
- **Columnas:**
  - *Pared*: tiempo total del proceso, medido desde fuera.
  - *init*: lectura del NetCDF y preparación (lo registra el binario en `speed_*.csv`).
  - *Fase 1*: selección de máximos y mínimos por rayos, sumada sobre los pasos temporales.
  - *Fase 2*: clusters, contornos y formaciones, sumada sobre los pasos temporales.
  - *RSS pico*: memoria residente máxima del proceso (`ru_maxrss`).

## Casos

| Caso | Fichero | Pasos | Tamaño |
|---|---|---:|---:|
| Fijo | `tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc` (versionado) | 4 | 2,4 MB |
| Largo | ERA5 Z500 del 2003-08-01 al 2003-08-15, 00/06/12/18 UTC, 90N–0, 360° (no versionado; se genera con `tests/fixtures/descargar_caso.py`) | 60 | 62 MB |

## Entorno

- AMD Ryzen 5 5600X (6 núcleos, 12 hilos), 16 GB.
- Docker Desktop 29.7.2 sobre WSL2 (kernel 6.6.87.2), en Windows 11.
- gcc 11.4.0, cmake 3.22.1 (imagen `netcdf-base` del CI).

Los tiempos absolutos dependen de la máquina y de Docker Desktop; lo comparable es la
relación antes/después medida en el mismo entorno.

## Resultados

### Antes de las optimizaciones (`main` en `e60e269`, 2026-09-14)

Medianas de 5 ejecuciones. Las 30 ejecuciones de cada caso producen la misma salida.

**Caso fijo (4 pasos)**

| Binario | Hilos | Pared (s) | init (s) | Fase 1 (s) | Fase 2 (s) | RSS pico (MB) | Rango pared (s) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `FAST-IBAN` | 1 | 0,97 | 0,04 | 0,84 | 0,08 | 22 | 0,97–0,99 |
| `FAST-IBAN_omp` | 1 | 0,98 | 0,04 | 0,85 | 0,08 | 23 | 0,98–1,00 |
| `FAST-IBAN_omp` | 2 | 0,74 | 0,04 | 0,61 | 0,08 | 22 | 0,74–0,74 |
| `FAST-IBAN_omp` | 4 | 0,63 | 0,04 | 0,51 | 0,08 | 23 | 0,63–0,64 |
| `FAST-IBAN_omp` | 6 | 0,63 | 0,04 | 0,49 | 0,08 | 23 | 0,62–0,63 |
| `FAST-IBAN_omp` | 12 | 0,58 | 0,04 | 0,44 | 0,09 | 22 | 0,58–0,58 |

**Caso largo (60 pasos)**

| Binario | Hilos | Pared (s) | init (s) | Fase 1 (s) | Fase 2 (s) | RSS pico (MB) | Rango pared (s) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `FAST-IBAN` | 1 | 15,79 | 0,28 | 12,74 | 2,70 | 75 | 15,65–15,87 |
| `FAST-IBAN_omp` | 1 | 15,79 | 0,28 | 12,72 | 2,71 | 75 | 15,62–15,92 |
| `FAST-IBAN_omp` | 2 | 12,15 | 0,25 | 9,11 | 2,73 | 75 | 12,12–12,19 |
| `FAST-IBAN_omp` | 4 | 10,70 | 0,25 | 7,60 | 2,78 | 75 | 10,60–10,78 |
| `FAST-IBAN_omp` | 6 | 10,64 | 0,27 | 7,37 | 2,94 | 75 | 10,61–10,73 |
| `FAST-IBAN_omp` | 12 | 9,85 | 0,27 | 6,61 | 2,93 | 75 | 9,75–10,10 |

### Lectura

- **La fase 1 (selección por rayos) es el 81 % del tiempo en serie** y escala mal: con 12 hilos
  solo baja 1,9× (12,7 → 6,6 s), y a partir de 4 hilos casi no mejora. El bucle es independiente
  por punto, así que debería escalar mucho más. El sospechoso principal son los contadores de
  diagnóstico de `findIndex` (ALG-005), que usan `#pragma omp atomic` en el camino más caliente:
  8 llamadas por interpolación × 64 rayos por punto.
- **La fase 2 (clusters, contornos y formaciones) es secuencial**: unos 2,7 s, el 17 %, y crece
  ligeramente con más hilos por la competencia con la fase 1.
- **La lectura (`init`) es menor del 2 %**, así que permutar el cubo en `check_coords` (ALG-202) o
  leer por *hyperslab* (ALG-204) apenas cambiarán el tiempo en este caso. ALG-204 sí reduciría
  la memoria: el RSS pico (75 MB) sigue al tamaño del fichero (62 MB), porque se carga entero.
- Sin MPI: su escalado se mide en ALG-206.
