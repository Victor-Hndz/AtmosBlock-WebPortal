# Guía de pruebas

[English](TESTING.md) · **Español**

Cómo compilar, probar y ejecutar AtmosBlock en tu propio equipo, desde el núcleo científico hasta el
portal web completo. Cada nivel es independiente: quédate en el que necesites.

| Nivel | Qué compruebas | Requisitos | Tiempo |
|---|---|---|---|
| [1. Núcleo científico](#1-núcleo-científico) | Compilación, tests unitarios y de regresión, ejecución del detector, determinismo, benchmark | Docker | ~5 min |
| [2. Comprobaciones automáticas del portal](#2-comprobaciones-automáticas-del-portal) | Tests de la API, el frontend y los servicios de Python | Node.js 22, Python 3.10+ | ~5 min |
| [3. Pila completa](#3-pila-completa) | El portal de principio a fin con datos ERA5 reales | Docker, Node.js 22, cuenta de Copernicus CDS | ~30 min |

Todos los comandos se lanzan desde la raíz del repositorio.

## 0. Requisitos previos

- [Git](https://git-scm.com/) y [Docker](https://docs.docker.com/get-docker/) (Docker Desktop en
  Windows y macOS; arráncalo antes de lanzar cualquier comando).
- Para los niveles 2 y 3: [Node.js 22](https://nodejs.org/) con npm, y Python 3.10 o posterior.
- Para el nivel 3: una cuenta gratuita en el [Climate Data Store de Copernicus](https://cds.climate.copernicus.eu).

No hace falta instalar un compilador de C ni NetCDF. El núcleo se compila dentro de la misma imagen
de Docker que usa el CI, fijada por digest:

```bash
IMAGE=victorhndz/netcdf-base@sha256:6f448a9eda3a12073be2c427d524d984387a85fc408a2f5755b648f59361a429
```

## 1. Núcleo científico

### 1.1 Abrir una terminal en la imagen de compilación

El repositorio se monta en `/src` en solo lectura; todo se compila y escribe en `/tmp` dentro del
contenedor, así que tu copia de trabajo no se ensucia.

Linux y macOS:

```bash
docker run --rm -it -v "$PWD:/src:ro" -w /src "$IMAGE" bash
```

Windows (Git Bash):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -it -v "$(cygpath -w "$PWD"):/src:ro" -w /src "$IMAGE" bash
```

Si Git Bash responde `the input device is not a TTY`, antepón `winpty` al comando.

Windows (PowerShell): define `$IMAGE` con el mismo valor y ejecuta:

```powershell
docker run --rm -it -v "${PWD}:/src:ro" -w /src $IMAGE bash
```

El resto del nivel 1 se ejecuta **dentro** de esa terminal.

### 1.2 Compilar y lanzar los tests

```bash
C=/src/backend/FAST-IBAN_Project/execution/code
cmake -S $C -B /tmp/build -DFAST_IBAN_WERROR=ON
cmake --build /tmp/build --parallel
ctest --test-dir /tmp/build --output-on-failure
```

Resultado esperado: `100% tests passed, 0 tests failed out of 16`. Los tests cubren:

| Tests | Qué garantizan |
|---|---|
| `test_*` (geometría, interpolación, contornos, agrupamiento, lectura NetCDF) | El comportamiento de cada pieza, incluida la geometría de los rayos a latitudes altas |
| `regresion_hash`, `regresion_hash_2003` | La salida CSV sobre dos casos ERA5 reales coincide con un SHA-256 guardado |
| `invariancia_omp_{1,4,16}` | Salida idéntica con 1, 4 y 16 hilos OpenMP |
| `invariancia_mpi_{1,2,3}`, `invariancia_omp_mpi_3x2` | Salida idéntica con 1–3 procesos MPI y con MPI + OpenMP |
| `invariancia_orden` | La clasificación no depende del orden en que se procesan los clusters |

La compilación genera cuatro ejecutables: `FAST-IBAN` (serie), `FAST-IBAN_omp` (OpenMP),
`FAST-IBAN_mpi` (MPI) y `FAST-IBAN_omp_mpi` (híbrido).

### 1.3 Ejecutar el detector sobre el caso de ejemplo

El repositorio incluye dos casos pequeños de Z500 de ERA5 en `tests/fixtures/` (su README explica
su origen y licencia).

```bash
FIX=$C/tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc
mkdir -p /tmp/run && cd /tmp/run
/tmp/build/FAST-IBAN_omp $FIX 25 85 -180 180 out/ 4
ls out/
head -3 out/*_formations_*.csv
```

Argumentos, en orden:

| # | Argumento | Ejemplo |
|---|---|---|
| 1 | Fichero NetCDF de entrada | `$FIX` |
| 2–3 | Latitud mínima y máxima (grados) | `25 85` |
| 4–5 | Longitud mínima y máxima (grados) | `-180 180` |
| 6 | Directorio de salida, con barra final (se crea si no existe) | `out/` |
| 7 | Número de hilos OpenMP (lo ignoran las versiones serie y MPI) | `4` |

La ejecución imprime `SUCCESS` y el tiempo total, y escribe cuatro ficheros cuyo nombre incluye la
fecha de ejecución:

| Fichero | Columnas |
|---|---|
| `Geopotential_selected_*.csv` | `time,latitude,longitude,z,type,cluster,centroid_lat,centroid_lon` |
| `Geopotential_formations_*.csv` | `time,max_id,min1_id,min2_id,type` |
| `speed_*.csv` | `part,instant,time_elapsed` (segundos por etapa) |
| `log_*.txt` | Registro de la ejecución |

En el caso de ejemplo, el primer patrón detectado es `0,13,17,18,OMEGA`.

Las ejecuciones MPI e híbridas usan `mpirun`:

```bash
mpirun -np 2 /tmp/build/FAST-IBAN_mpi $FIX 25 85 -180 180 out_mpi/ 1
mpirun -np 2 /tmp/build/FAST-IBAN_omp_mpi $FIX 25 85 -180 180 out_hibrido/ 2
```

### 1.4 Comprobar el determinismo por tu cuenta

`run_baseline.sh` ejecuta un binario sobre el caso de ejemplo y compara el SHA-256 del contenido de
sus CSV (no de los nombres, que llevan la fecha) con la línea base guardada:

```bash
S=$C/tests/regression
sh $S/run_baseline.sh /tmp/build/FAST-IBAN_omp 12
LANZADOR="mpirun -np 3" sh $S/run_baseline.sh /tmp/build/FAST-IBAN_mpi
```

Cada comando imprime `Salida idéntica a la línea base` y termina con código 0.

### 1.5 Benchmark

```bash
python3 $C/tests/benchmark/benchmark.py --bin-dir /tmp/build --caso $FIX --hilos 1,4 --reps 3
```

Muestra una tabla con la mediana del tiempo de pared, el tiempo por etapa y la memoria pico, y
comprueba que todas las ejecuciones dan la misma salida. Con `--help` verás las opciones para MPI
(`--procesos`) e híbrido (`--hibrido`). Los tiempos absolutos dependen de tu máquina; las mediciones
de referencia y su metodología están en [`benchmark.md`](benchmark.md).

### 1.6 Con tus propios datos

El detector espera el formato NetCDF que genera el portal:

- Una variable `z` con dimensiones `(time, latitude, longitude)`, guardada como `int16` con
  `scale_factor` y `add_offset`.
- Coordenadas `latitude` y `longitude` en una rejilla regular de 0,25° (longitudes en `[-180, 180)`
  o `[0, 360)`).

La forma más sencilla de obtener un fichero así es `tests/fixtures/descargar_caso.py`. Descarga ERA5
del CDS y lo convierte con el mismo código que el portal; su cabecera explica cómo ejecutarlo en
Docker con tu clave del CDS. Cambia en el script las fechas y el área, y también el nombre de salida
para no sobrescribir el caso de ejemplo.

## 2. Comprobaciones automáticas del portal

Son las mismas comprobaciones que ejecuta el CI en cada pull request. Se lanzan en tu equipo, fuera
de Docker.

### 2.1 API (NestJS)

```bash
cd backend/nestjs
npm ci
npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0
npx jest --ci
```

Resultado esperado: todas las suites pasan. Los tests de integración (`*.int-spec.ts`) necesitan
PostgreSQL y no forman parte del CI; la cabecera de cada fichero explica cómo levantar uno con Docker
y lanzarlos.

### 2.2 Frontend (React)

```bash
cd frontend
npm ci
npm run lint
npm run build
```

### 2.3 Servicios de Python

```bash
for t in $(git ls-files 'backend/FAST-IBAN_Project/*test_*.py'); do
  echo "== $t"; python3 "$t" || break
done
```

Los tests no necesitan dependencias externas. Líneas como `❌ Variable no soportada` forman parte de
los escenarios que se prueban; lo importante es que ningún test termine con código de error. En
Windows, define antes `PYTHONIOENCODING=utf-8`, porque los servicios imprimen emojis.

### 2.4 Fichero de entorno

```bash
python3 .github/scripts/check_env_example.py
```

Comprueba que `.env.example` documenta todas las variables que usan los servicios.

## 3. Pila completa

### 3.1 Acceso a Copernicus CDS

1. Regístrate o inicia sesión en <https://cds.climate.copernicus.eu>.
2. Copia tu **token personal de acceso** desde la página de tu perfil.
3. Abre la página del conjunto de datos *ERA5 hourly data on pressure levels from 1940 to present* y
   acepta su licencia una vez. Sin este paso, las descargas se rechazan.

### 3.2 Configurar el entorno

```bash
cp .env.example .env
```

Edita `.env` y sustituye **todos** los valores `change-me`:

- `JWT_SECRET`: una cadena larga y aleatoria, por ejemplo la salida de `openssl rand -hex 32`.
- `DB_PASSWORD`, `RABBITMQ_DEFAULT_PASS` y `MINIO_PASSWORD`, este último de al menos 8 caracteres.
  `RABBITMQ_URL` debe repetir el usuario y la contraseña de RabbitMQ.
- `CDSAPI_KEY`: tu token del CDS.

Toma `.env.example` como referencia. El script antiguo `generate_env.sh` no genera todas las
variables que necesitan los servicios. No subas nunca `.env` al repositorio.

### 3.3 Levantar los servicios

```bash
docker compose up -d --build
docker compose ps
```

La primera compilación tarda varios minutos. Cuando `nest_api` aparezca como `healthy`:

```bash
curl -i http://localhost:3000/api/health
```

Devuelve `200` si la API llega a la base de datos. Solo se publica el puerto de la API (3000); la
base de datos, RabbitMQ y MinIO quedan en la red interna de Docker. Para inspeccionar la base de datos
en desarrollo, arranca Adminer con `docker compose --profile dev up -d adminer` y abre
<http://localhost:8082>.

### 3.4 Levantar el frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm ci
npm run dev
```

Abre <http://localhost:5173>. La interfaz está disponible en inglés y en español.

### 3.5 Recorrido de principio a fin

- [ ] Registra un usuario e inicia sesión.
- [ ] Crea una petición pequeña: variable geopotencial, nivel de 500 hPa, un año, mes y día, una hora,
      área y opciones de mapa por defecto. Con peticiones pequeñas la descarga de ERA5 es corta.
- [ ] Sigue la barra de progreso mientras la petición pasa por la descarga, la detección y los mapas.
- [ ] Abre los resultados: los mapas y los ficheros generados se cargan y se pueden descargar.
- [ ] Repite la misma petición: se sirve desde los resultados guardados, sin volver a descargar.
- [ ] Si una petición falla, la página de resultados muestra un error en lugar de quedarse esperando.
- [ ] Abre <http://localhost:3000/api/docs>: la documentación de la API (Swagger UI) está disponible
      mientras `NODE_ENV` no sea `production`.

Comandos útiles:

```bash
docker compose logs -f nest_api configurator_module handler_module execution_module visualization_module
docker compose down        # parar, conservando los datos
docker compose down -v     # parar y borrar volúmenes: base de datos, resultados y datos descargados
```

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `Cannot connect to the Docker daemon` / error de `npipe` | Docker Desktop no está arrancado: arráncalo y vuelve a intentarlo |
| `docker compose` avisa de variables sin definir | No existe `.env` en la raíz del repositorio: ver 3.2 |
| Rutas como `C:/Program Files/Git/src` dentro del contenedor (Git Bash) | Añade `MSYS_NO_PATHCONV=1` delante de `docker run`, como en 1.1 |
| `the input device is not a TTY` (Git Bash) | Antepón `winpty` al comando |
| `UnicodeEncodeError` en los tests de Python (Windows) | Define `PYTHONIOENCODING=utf-8` |
| La petición se queda en la descarga | Revisa `docker compose logs configurator_module`: token del CDS incorrecto, licencia del conjunto de datos sin aceptar o cola del CDS |
| El frontend no llega a la API (error de CORS) | `CORS_ORIGINS` en `.env` debe incluir la URL del frontend (`http://localhost:5173`) |

¿Has encontrado un problema que no aparece aquí? [Abre una issue](https://github.com/Victor-Hndz/AtmosBlock-WebPortal/issues).
