"""ALG-207: coste de cálculo de FAST-IBAN y TempestExtremes en las mismas condiciones.

Se ejecuta dentro de netcdf-base, con los binarios de FAST-IBAN en /tmp/fi y los de TempestExtremes
(v2.4.2, enlazados con la misma NetCDF de apt) en /s/te/bin-apt-{nompi,mpi}. Entradas copiadas en /tmp/in.
Una ronda de calentamiento descartada y RONDAS rondas intercaladas; mediana y rango del tiempo de pared.
El umbral de DetectBlobs es SOLO de temporización (media + max(980, 1.5*sigma) sobre los propios pasos).
"""
import os
import pathlib
import shutil
import statistics
import subprocess
import sys
import tempfile
import time

RONDAS = int(sys.argv[1]) if len(sys.argv) > 1 else 5
CODE = "/src/backend/FAST-IBAN_Project/execution/code"
IN = pathlib.Path("/tmp/in")
FI = "/tmp/fi"
TE = "/s/te/bin-apt-nompi"
TE_MPI = "/s/te/bin-apt-mpi"
UMBRAL_CMD = "_DIFF(z,z_threshold),>=,0,0"
COMUNES_TE = ["--latname", "latitude", "--lonname", "longitude"]

IN.mkdir(parents=True, exist_ok=True)
shutil.copy(f"{CODE}/tests/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc", IN / "fijo.nc")
shutil.copy("/s/caso_largo/geopot_500hPa_2003-08-01-15_00-06-12-18UTC.nc", IN / "largo.nc")
for f in pathlib.Path("/s/te/entradas").glob("*.nc"):
    shutil.copy(f, IN / f.name)

# Máscara del caso largo para StitchBlobs (se genera una vez y no se mide).
subprocess.run([f"{TE}/DetectBlobs", "--in_data", f"{IN}/largo.nc;{IN}/largo_umbral.nc", "--out", f"{IN}/mask_largo.nc",
                "--thresholdcmd", UMBRAL_CMD, "--geofiltercmd", "area,>=,1000000km2", "--minlat", "25", "--maxlat", "85",
                *COMUNES_TE], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
# Listas de los 15 ficheros diarios para DetectBlobs con MPI.
(IN / "dias_in.txt").write_text("".join(f"{IN}/largo_dia_{d:02d}.nc;{IN}/largo_dia_{d:02d}_umbral.nc\n" for d in range(1, 16)))


def fastiban(binario, caso, hilos=1, procesos=None):
    lanzador = ["mpirun", "-np", str(procesos)] if procesos else []
    return lambda tmp: lanzador + [f"{FI}/{binario}", f"{IN}/{caso}.nc", "25", "85", "-180", "180", "out/", str(hilos)]


def detect(caso):
    return lambda tmp: [f"{TE}/DetectBlobs", "--in_data", f"{IN}/{caso}.nc;{IN}/{caso}_umbral.nc", "--out", f"{tmp}/mask.nc",
                        "--thresholdcmd", UMBRAL_CMD, "--geofiltercmd", "area,>=,1000000km2", "--minlat", "25", "--maxlat", "85",
                        *COMUNES_TE]


def detect_mpi(procesos):
    def cmd(tmp):
        pathlib.Path(tmp, "dias_out.txt").write_text("".join(f"{tmp}/mask_dia_{d:02d}.nc\n" for d in range(1, 16)))
        return ["mpirun", "-np", str(procesos), f"{TE_MPI}/DetectBlobs", "--in_data_list", f"{IN}/dias_in.txt",
                "--out_list", f"{tmp}/dias_out.txt", "--thresholdcmd", UMBRAL_CMD,
                "--geofiltercmd", "area,>=,1000000km2", "--minlat", "25", "--maxlat", "85", *COMUNES_TE]
    return cmd


def stitch(aplanar):
    extra = ["--flatten"] if aplanar else []
    return lambda tmp: [f"{TE}/StitchBlobs", "--in", f"{IN}/mask_largo.nc", "--out", f"{tmp}/stitch.nc", "--var", "binary_tag",
                        "--mintime", "12", "--min_overlap_prev", "0", *extra, *COMUNES_TE]


CONFIGURACIONES = [
    ("fijo", 4, "FAST-IBAN total", "serie", fastiban("FAST-IBAN", "fijo")),
    ("fijo", 4, "FAST-IBAN total", "OpenMP 12 hilos", fastiban("FAST-IBAN_omp", "fijo", 12)),
    ("fijo", 4, "DetectBlobs", "serie, 1 fichero", detect("fijo")),
    ("largo", 60, "FAST-IBAN total", "serie", fastiban("FAST-IBAN", "largo")),
    ("largo", 60, "FAST-IBAN total", "OpenMP 12 hilos", fastiban("FAST-IBAN_omp", "largo", 12)),
    ("largo", 60, "FAST-IBAN total", "MPI 6 procesos", fastiban("FAST-IBAN_mpi", "largo", 1, 6)),
    ("largo", 60, "DetectBlobs", "serie, 1 fichero", detect("largo")),
    ("largo", 60, "DetectBlobs", "MPI 1 proceso, 15 ficheros", detect_mpi(1)),
    ("largo", 60, "DetectBlobs", "MPI 2 procesos, 15 ficheros", detect_mpi(2)),
    ("largo", 60, "DetectBlobs", "MPI 4 procesos, 15 ficheros", detect_mpi(4)),
    ("largo", 60, "DetectBlobs", "MPI 6 procesos, 15 ficheros", detect_mpi(6)),
    ("largo", 60, "StitchBlobs", "serie (IDs)", stitch(False)),
    ("largo", 60, "StitchBlobs", "serie (--flatten)", stitch(True)),
]


def medir(generar):
    with tempfile.TemporaryDirectory() as tmp:
        cmd = generar(tmp)
        with open(pathlib.Path(tmp, "log.txt"), "w") as log:
            inicio = time.perf_counter()
            proceso = subprocess.Popen(cmd, cwd=tmp, stdout=log, stderr=subprocess.STDOUT)
            _, estado, uso = os.wait4(proceso.pid, 0)
            pared = time.perf_counter() - inicio
        if os.waitstatus_to_exitcode(estado) != 0:
            print(pathlib.Path(tmp, "log.txt").read_text()[-1500:])
            sys.exit(f"ERROR en {' '.join(cmd)[:200]}")
        return pared, uso.ru_maxrss / 1024


resultados = {i: [] for i in range(len(CONFIGURACIONES))}
for ronda in range(RONDAS + 1):
    for i, (_, _, _, _, generar) in enumerate(CONFIGURACIONES):
        pared, rss = medir(generar)
        if ronda > 0:
            resultados[i].append((pared, rss))
    print(f"ronda {ronda} {'(calentamiento) ' if ronda == 0 else ''}hecha", flush=True)

print("\n| Caso | Herramienta | Paralelismo | Pasos | Pared mediana (s) | Rango (s) | s/paso | RSS pico por proceso (MB) |")
print("|---|---|---|---:|---:|---:|---:|---:|")
for i, (caso, pasos, herramienta, modo, _) in enumerate(CONFIGURACIONES):
    paredes = [r[0] for r in resultados[i]]
    mediana = statistics.median(paredes)
    rss = statistics.median(r[1] for r in resultados[i])
    print(f"| {caso} | {herramienta} | {modo} | {pasos} | {mediana:.2f} | {min(paredes):.2f}–{max(paredes):.2f} | {mediana / pasos:.3f} | {rss:.0f} |")
