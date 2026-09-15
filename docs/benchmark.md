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

### Después: ALG-201, ALG-203, ALG-204 y ALG-208 (`main` en `031cf27`, 2026-09-15)

Docker Desktop se actualizó a 29.8.0 entre ambas mediciones, así que el "antes" (`e60e269`) se
volvió a medir en la misma sesión que el "después". Medianas de 5 ejecuciones; las 30 ejecuciones
de cada caso y versión producen la misma salida, y es la misma antes y después (sha256
`6f1c0423…` en el caso fijo y `44a955d2…` en el largo).

**Caso largo (60 pasos)**

| Binario | Hilos | Pared antes (s) | Pared después (s) | Cambio | Fase 1 antes → después (s) | RSS antes → después (MB) |
|---|---:|---:|---:|---:|---:|---:|
| `FAST-IBAN` | 1 | 15,57 | 17,46 | +12 % * | 12,64 → 14,45 | 75 → 17 |
| `FAST-IBAN_omp` | 1 | 15,55 | 17,12 | +10 % * | 12,62 → 14,02 | 75 → 17 |
| `FAST-IBAN_omp` | 2 | 12,00 | 10,27 | −14 % | 9,07 → 7,23 | 75 → 17 |
| `FAST-IBAN_omp` | 4 | 10,64 | 7,25 | −32 % | 7,61 → 3,95 | 75 → 17 |
| `FAST-IBAN_omp` | 6 | 10,48 | 5,55 | −47 % | 7,40 → 2,65 | 75 → 17 |
| `FAST-IBAN_omp` | 12 | 10,19 | **5,07** | **−50 %** | 6,82 → **2,09** | 75 → **17** |

\* Estas repeticiones tuvieron mucho ruido (pared 16,62–18,63 s en serie). **Medición alternada en
serie** (antes y después intercalados, 5 rondas): pared **15,67 → 16,71 s (+6,6 %)**, fase 1
12,65 → 13,85 s (+9,5 %), con rangos 15,61–15,70 y 16,23–16,81 s.

**Caso fijo (4 pasos)**

| Binario | Hilos | Pared antes (s) | Pared después (s) | Cambio | Fase 1 antes → después (s) |
|---|---:|---:|---:|---:|---:|
| `FAST-IBAN` | 1 | 0,97 | 1,01 | +4 % | 0,85 → 0,89 |
| `FAST-IBAN_omp` | 2 | 0,74 | 0,59 | −20 % | 0,61 → 0,46 |
| `FAST-IBAN_omp` | 4 | 0,64 | 0,37 | −42 % | 0,51 → 0,25 |
| `FAST-IBAN_omp` | 6 | 0,63 | 0,30 | −52 % | 0,49 → 0,18 |
| `FAST-IBAN_omp` | 12 | 0,58 | **0,27** | **−53 %** | 0,44 → **0,14** |

La memoria del caso fijo no cambia (22–23 MB): solo tiene 4 pasos.

### Lectura del después

- **Paralelo: el doble de rápido.** Con 12 hilos el caso largo pasa de 10,19 a 5,07 s. La fase 1
  escala ahora 6,9× con 12 hilos (14,45 → 2,09 s), frente a 1,9× antes; el mérito es de ALG-208
  (contadores de diagnóstico por hilo en vez de `omp atomic`).
- **Memoria: −77 %** en el caso largo (75 → 17 MB) gracias a ALG-204, y ya no crece con el número
  de pasos temporales.
- **Serie: +6,6 % más lento.** Es el coste de `omp_get_thread_num()` en cada incremento de los
  contadores (ALG-208). Recuperarlo es la tarea propuesta ALG-209.
- **Fase 2 sin cambios apreciables** (~2,6–2,9 s). ALG-201 la bajó un 3 %, dentro del ruido de esta
  medición; con 12 hilos pasa a ser más de la mitad del tiempo total, así que es el siguiente cuello
  de botella.
- **ALG-203** no cambia el tiempo: elimina fugas (`valgrind` limpio, comprobado en CI).

### Escalado OpenMP, MPI e híbrido (ALG-206, 2026-09-15)

Tras corregir las variantes MPI (reparto de pasos, ficheros de salida y contadores) y compilarlas en
CMake. Caso largo (60 pasos), medianas de 3 repeticiones; las 45 ejecuciones producen la misma
salida que la versión en serie. Rama sobre `main` en `87e7133` (sin ALG-209).

```bash
python3 tests/benchmark/benchmark.py --bin-dir /tmp/b --caso <caso.nc> \
  --hilos 1,2,4,6,12 --procesos 1,2,4,6,12 --hibrido 2x6,3x4,4x3,6x2 --reps 3
```

| Binario | Procesos | Hilos | Pared (s) | Aceleración | Fase 1 (s) † | Fase 2 (s) † | RSS por proceso (MB) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `FAST-IBAN` | 1 | 1 | 17,17 | 1,0× | 14,03 | 2,77 | 16 |
| `FAST-IBAN_omp` | 1 | 2 | 10,40 | 1,7× | 7,29 | 2,78 | 17 |
| `FAST-IBAN_omp` | 1 | 4 | 6,86 | 2,5× | 3,73 | 2,79 | 17 |
| `FAST-IBAN_omp` | 1 | 6 | 5,97 | 2,9× | 2,87 | 2,79 | 17 |
| `FAST-IBAN_omp` | 1 | 12 | 5,33 | 3,2× | 2,19 | 2,83 | 17 |
| `FAST-IBAN_mpi` | 2 | 1 | 9,01 | 1,9× | 14,03 | 2,90 | 27 |
| `FAST-IBAN_mpi` | 4 | 1 | 4,85 | 3,5× | 14,34 | 2,94 | 27 |
| `FAST-IBAN_mpi` | 6 | 1 | 3,64 | 4,7× | 15,83 | 3,16 | 27 |
| `FAST-IBAN_mpi` | 12 | 1 | **2,62** | **6,6×** | 20,95 | 3,95 | 27 |
| `FAST-IBAN_omp_mpi` | 2 | 6 | 3,72 | 4,6× | 3,38 | 3,04 | 27 |
| `FAST-IBAN_omp_mpi` | 3 | 4 | 3,44 | 5,0× | 5,34 | 3,20 | 27 |
| `FAST-IBAN_omp_mpi` | 4 | 3 | 2,98 | 5,8× | 6,64 | 3,24 | 27 |
| `FAST-IBAN_omp_mpi` | 6 | 2 | 2,72 | 6,3× | 9,95 | 3,49 | 27 |

† Con MPI, las fases son la **suma** de los tiempos de todos los procesos (tiempo de CPU acumulado),
no tiempo de pared.

**Lectura**

- **MPI escala mejor que OpenMP en una máquina**: con 12 procesos, 2,62 s (6,6×) frente a 5,33 s
  (3,2×) con 12 hilos. MPI reparte pasos temporales completos, así que paraleliza también la fase 2
  (clusters, contornos y formaciones), que en OpenMP sigue siendo secuencial (~2,8 s, el 53 % del
  tiempo con 12 hilos).
- **Eficiencia**: MPI mantiene un 95 % con 2 procesos y un 88 % con 4; baja al 55 % con 12, en parte
  porque la máquina tiene 6 núcleos físicos (12 hilos lógicos). La suma de CPU de la fase 1 crece de
  13,7 a 21,0 s entre 1 y 12 procesos, la firma del *hyperthreading* y de la competencia por memoria.
- **Híbrido**: con 12 unidades de cómputo, más procesos y menos hilos es mejor (6×2 = 2,72 s; 2×6 =
  3,72 s), por el mismo motivo: los hilos no aceleran la fase 2.
- **Memoria**: cada proceso MPI usa ~27 MB (frente a 17 MB en serie), así que 12 procesos rondan los
  320 MB; asumible, y muy por debajo de los 75 MB por proceso de antes de ALG-204.
- **Límites**: una sola máquina y un caso de 60 pasos. Con pocos pasos por proceso el reparto
  temporal se agota (no se puede usar más procesos que pasos); en climatologías de décadas y varios
  nodos es donde MPI aporta, y eso no está medido aquí.
