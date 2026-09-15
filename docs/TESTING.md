# Testing guide

**English** · [Español](TESTING.es.md)

How to build, test and run AtmosBlock on your own machine, from the scientific core alone to the
complete web portal. Each level is independent: stop at the one you need.

| Level | What you check | Requirements | Time |
|---|---|---|---|
| [1. Scientific core](#1-scientific-core) | Build, unit and regression tests, run the detector, determinism, benchmark | Docker | ~5 min |
| [2. Automated portal checks](#2-automated-portal-checks) | API, frontend and Python service tests | Node.js 22, Python 3.10+ | ~5 min |
| [3. Full stack](#3-full-stack) | The portal end to end with real ERA5 data | Docker, Node.js 22, Copernicus CDS account | ~30 min |

All commands run from the repository root.

## 0. Prerequisites

- [Git](https://git-scm.com/) and [Docker](https://docs.docker.com/get-docker/) (Docker Desktop on
  Windows and macOS; start it before running any command).
- For levels 2 and 3: [Node.js 22](https://nodejs.org/) with npm, and Python 3.10 or newer.
- For level 3: a free account on the [Copernicus Climate Data Store](https://cds.climate.copernicus.eu).

**One procedure for every system.** On Linux and macOS use your usual terminal. On Windows use
**Git Bash** (installed with [Git for Windows](https://gitforwindows.org/)): the commands in this guide
are the same, and the few places where Git Bash needs an extra flag are noted. If `python3` is not
found on Windows, use `python`.

You do not need a C compiler or NetCDF installed. The core is built inside the same Docker image
the CI uses, pinned by digest:

```bash
IMAGE=victorhndz/netcdf-base@sha256:6f448a9eda3a12073be2c427d524d984387a85fc408a2f5755b648f59361a429
```

## 1. Scientific core

### 1.1 Open a shell in the build image

The repository is mounted read-only in `/src`; everything is built and written under `/tmp` inside
the container, so your working copy stays clean.

Linux and macOS:

```bash
docker run --rm -it -v "$PWD:/src:ro" -w /src "$IMAGE" bash
```

Windows (Git Bash):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -it -v "$(cygpath -w "$PWD"):/src:ro" -w /src "$IMAGE" bash
```

If Git Bash answers `the input device is not a TTY`, prefix the command with `winpty`.

Windows (PowerShell): define `$IMAGE` with the same value and run:

```powershell
docker run --rm -it -v "${PWD}:/src:ro" -w /src $IMAGE bash
```

The rest of level 1 runs **inside** that shell.

### 1.2 Build and run the test suite

```bash
C=/src/backend/FAST-IBAN_Project/execution/code
cmake -S $C -B /tmp/build -DFAST_IBAN_WERROR=ON
cmake --build /tmp/build --parallel
ctest --test-dir /tmp/build --output-on-failure
```

Expected result: `100% tests passed, 0 tests failed out of 16`. The suite covers:

| Tests | What they guarantee |
|---|---|
| `test_*` (geometry, interpolation, contours, clustering, NetCDF reading) | Unit behaviour of each building block, including ray geometry at high latitudes |
| `regresion_hash`, `regresion_hash_2003` | The CSV output on two real ERA5 cases matches a stored SHA-256 |
| `invariancia_omp_{1,4,16}` | Identical output with 1, 4 and 16 OpenMP threads |
| `invariancia_mpi_{1,2,3}`, `invariancia_omp_mpi_3x2` | Identical output with 1–3 MPI processes and hybrid MPI + OpenMP |
| `invariancia_orden` | Pattern classification does not depend on the order clusters are processed |

The build produces four executables: `FAST-IBAN` (serial), `FAST-IBAN_omp` (OpenMP),
`FAST-IBAN_mpi` (MPI) and `FAST-IBAN_omp_mpi` (hybrid).

### 1.3 Run the detector on the sample case

The repository ships two small ERA5 Z500 cases in `tests/fixtures/` (see its README for provenance
and licence).

```bash
FIX=$C/tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc
mkdir -p /tmp/run && cd /tmp/run
/tmp/build/FAST-IBAN_omp $FIX 25 85 -180 180 out/ 4
ls out/
head -3 out/*_formations_*.csv
```

Arguments, in order:

| # | Argument | Example |
|---|---|---|
| 1 | Input NetCDF file | `$FIX` |
| 2–3 | Minimum and maximum latitude (degrees) | `25 85` |
| 4–5 | Minimum and maximum longitude (degrees) | `-180 180` |
| 6 | Output directory, with trailing slash (created if missing) | `out/` |
| 7 | Number of OpenMP threads (ignored by the serial and MPI builds) | `4` |

The run prints `SUCCESS` and the total time, and writes four files whose names include the run
date:

| File | Columns |
|---|---|
| `Geopotential_selected_*.csv` | `time,latitude,longitude,z,type,cluster,centroid_lat,centroid_lon` |
| `Geopotential_formations_*.csv` | `time,max_id,min1_id,min2_id,type` |
| `speed_*.csv` | `part,instant,time_elapsed` (seconds per stage) |
| `log_*.txt` | Run log |

For the sample case, the first detected pattern is `0,13,17,18,OMEGA`.

MPI and hybrid runs use `mpirun`:

```bash
mpirun -np 2 /tmp/build/FAST-IBAN_mpi $FIX 25 85 -180 180 out_mpi/ 1
mpirun -np 2 /tmp/build/FAST-IBAN_omp_mpi $FIX 25 85 -180 180 out_hybrid/ 2
```

### 1.4 Check determinism yourself

`run_baseline.sh` runs a binary on the sample case and compares the SHA-256 of its CSV content
(not the file names, which contain the run date) with the stored baseline:

```bash
S=$C/tests/regression
sh $S/run_baseline.sh /tmp/build/FAST-IBAN_omp 12
LANZADOR="mpirun -np 3" sh $S/run_baseline.sh /tmp/build/FAST-IBAN_mpi
```

Each command prints `Salida idéntica a la línea base` (*output identical to the baseline*) and
exits with code 0.

### 1.5 Benchmark

```bash
python3 $C/tests/benchmark/benchmark.py --bin-dir /tmp/build --caso $FIX --hilos 1,4 --reps 3
```

It prints a table with the median wall time, the time per stage and the peak memory, and checks
that every run produced the same output. Use `--help` for MPI (`--procesos`) and hybrid
(`--hibrido`) options. Absolute times depend on your machine; the reference measurements and their
methodology are in [`benchmark.md`](benchmark.md) (in Spanish).

### 1.6 Using your own data

The detector expects the NetCDF layout the portal produces:

- A variable `z` with dimensions `(time, latitude, longitude)`, stored as `int16` with
  `scale_factor` and `add_offset`.
- Coordinates `latitude` and `longitude` on a regular 0.25° grid (longitudes in `[-180, 180)` or
  `[0, 360)`).

The easiest way to obtain such a file is `tests/fixtures/descargar_caso.py`. It downloads ERA5 from
the CDS and converts it with the same code as the portal; its header shows how to run it in Docker
with your CDS key. Edit the dates and area in the script, and change the output name so you do not
overwrite the sample case.

## 2. Automated portal checks

These are the same checks the CI runs on every pull request. Run them on your machine, outside
Docker.

### 2.1 API (NestJS)

```bash
cd backend/nestjs
npm ci
npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0
npx jest --ci
```

Expected result: all test suites pass. Integration tests (`*.int-spec.ts`) need a PostgreSQL
instance and are not part of the CI; the header of each file explains how to start one with Docker
and run them.

### 2.2 Frontend (React)

```bash
cd frontend
npm ci
npm run lint
npm run build
```

### 2.3 Python services

```bash
for t in $(git ls-files 'backend/FAST-IBAN_Project/*test_*.py'); do
  echo "== $t"; python3 "$t" || break
done
```

The tests need no external dependencies. Lines such as `❌ Variable no soportada` are part of the
scenarios being tested; what matters is that no test ends with an error code. On Windows, set
`PYTHONIOENCODING=utf-8` first, because the services print emoji.

### 2.4 Environment file

```bash
python3 .github/scripts/check_env_example.py
```

It checks that `.env.example` documents every variable the services use.

## 3. Full stack

### 3.1 Copernicus CDS access

1. Register or sign in at <https://cds.climate.copernicus.eu>.
2. Copy your **personal access token** from your profile page.
3. Open the dataset page *ERA5 hourly data on pressure levels from 1940 to present* and accept its
   licence once. Without this step, downloads are rejected.

### 3.2 Configure the environment

```bash
cp .env.example .env
```

Edit `.env` and replace **every** `change-me` value:

- `JWT_SECRET`: a long random string, for example the output of `openssl rand -hex 32`.
- `DB_PASSWORD`, `RABBITMQ_DEFAULT_PASS` and `MINIO_PASSWORD`, the last one with at least 8
  characters. `RABBITMQ_URL` must repeat the RabbitMQ user and password.
- `CDSAPI_KEY`: your CDS token.

`.env.example` documents every variable (the CI checks it). Never commit `.env`.

### 3.3 Start the services

```bash
docker compose up -d --build
docker compose ps
```

The first build takes several minutes. When `nest_api` reports `healthy`:

```bash
curl -i http://localhost:3000/api/health
```

It returns `200` when the API can reach the database. Only the API port (3000) is published; the
database, RabbitMQ and MinIO stay on the internal Docker network. To inspect the database during
development, start Adminer with `docker compose --profile dev up -d adminer` and open
<http://localhost:8082>.

### 3.4 Start the frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. The interface is available in English and Spanish.

### 3.5 End-to-end walkthrough

- [ ] Register a user and sign in.
- [ ] Create a small request: variable geopotential, pressure level 500 hPa, one year, month and day,
      one hour, default area and map options. Small requests keep the ERA5 download short.
- [ ] Follow the progress bar while the request goes through download, detection and map generation.
- [ ] Open the results: maps and generated files load and can be downloaded.
- [ ] Repeat the same request: it is served from the stored results without downloading again.
- [ ] If a request fails, the results page shows an error instead of waiting indefinitely.
- [ ] Open <http://localhost:3000/api/docs>: the API documentation (Swagger UI) is available while
      `NODE_ENV` is not `production`.

Useful commands:

```bash
docker compose logs -f nest_api configurator_module handler_module execution_module visualization_module
docker compose down        # stop, keeping data
docker compose down -v     # stop and delete volumes: database, stored results and downloaded data
```

## 4. Browser end-to-end tests (Playwright)

The `e2e/` project drives a real browser and the API against the running stack. It uses the texts of
the frontend translations, so it does not depend on literal strings.

| Project | What it checks | Requirements | In CI |
|---|---|---|---|
| `portal` | Home, language switch, footer and links, 404, session gates, registration, logout and login, profile and request history; API health, security headers, CORS, Swagger UI with the CSP, 401 without a token and 400 for unsupported variables | API stack (level 3.3) and frontend | `e2e` job on every pull request |
| `pipeline` | A real request from start to finish (configurator, C core, maps, results page, cache) using the sample case, without the CDS | Full stack and the sample case copied into the configurator volume | `E2E pipeline` workflow: manual, weekly and on changes to the pipeline |

With the stack running (3.3) and the frontend on <http://localhost:5173> (3.4):

```bash
cd e2e
npm ci
npx playwright install chromium
npm test                    # portal project
```

The first run registers a disposable test user through the API. If the frontend is not running,
Playwright starts it. To run the full pipeline, copy the sample case into the configurator volume first:

```bash
docker compose cp backend/FAST-IBAN_Project/execution/code/tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc \
  "configurator_module:/app/config/data/geopotential_500hPa_2022-03-(14)_00-06-12-18UTC.nc"
cd e2e && npm run test:pipeline
```

In Git Bash, prefix `docker compose cp` with `MSYS_NO_PATHCONV=1`. `npm run report` opens the HTML report
of the last run. The authentication API allows 5 requests per minute: wait a minute before running the
suite twice in a row.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Cannot connect to the Docker daemon` / `npipe` error | Docker Desktop is not running: start it and retry |
| `docker compose` complains about missing variables | `.env` does not exist in the repository root: see 3.2 |
| Paths like `C:/Program Files/Git/src` inside the container (Git Bash) | Add `MSYS_NO_PATHCONV=1` before `docker run`, as in 1.1 |
| `the input device is not a TTY` (Git Bash) | Prefix the command with `winpty` |
| `UnicodeEncodeError` in Python tests (Windows) | Set `PYTHONIOENCODING=utf-8` |
| The request stays at the download step | Check `docker compose logs configurator_module`: wrong CDS token, dataset licence not accepted or CDS queue |
| The frontend cannot reach the API (CORS error) | `CORS_ORIGINS` in `.env` must include the frontend URL (`http://localhost:5173`) |

Found a problem that is not listed here? [Open an issue](https://github.com/Victor-Hndz/AtmosBlock-WebPortal/issues).
