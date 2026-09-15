#!/usr/bin/env python3
"""ALG-205: benchmark reproducible de FAST-IBAN (serie y OpenMP) sobre un caso NetCDF.

Uso (dentro de la imagen netcdf-base, con los binarios ya compilados):
    python3 benchmark.py --bin-dir /tmp/b --caso caso.nc --hilos 1,2,4,6,12 --reps 5 --csv resultados.csv

Por configuración (binario × hilos) ejecuta --reps veces y da la mediana de:
  - tiempo de pared del proceso completo;
  - fases que registra el propio binario en speed_*.csv: init (lectura), 1 (selección de
    máximos/mínimos, suma sobre pasos), 2 (clusters y formaciones, suma sobre pasos);
  - memoria pico (ru_maxrss del proceso hijo).
Comprueba además que todas las ejecuciones producen los mismos CSV (determinismo).
"""
import argparse
import csv
import hashlib
import os
import pathlib
import statistics
import subprocess
import sys
import tempfile
import time


def ejecutar(binario, caso, hilos, procesos=None, mpiexec="mpirun"):
    """Una ejecución en un directorio temporal (el binario hace chdir si el actual se llama "build")."""
    lanzador = [mpiexec, "-np", str(procesos)] if procesos else []
    with tempfile.TemporaryDirectory() as tmp:
        inicio = time.perf_counter()
        with open(pathlib.Path(tmp, "ejecucion.log"), "w") as log:
            proceso = subprocess.Popen(
                lanzador + [binario, caso, "25", "85", "-180", "180", "out/", str(hilos)],
                cwd=tmp, stdout=log, stderr=subprocess.STDOUT,
            )
            _, estado, uso = os.wait4(proceso.pid, 0)
        pared = time.perf_counter() - inicio
        if os.waitstatus_to_exitcode(estado) != 0:
            print(pathlib.Path(tmp, "ejecucion.log").read_text()[-2000:])
            sys.exit(f"ERROR: {binario} con {hilos} hilos terminó con código {os.waitstatus_to_exitcode(estado)}")

        salida = pathlib.Path(tmp, "out")
        fases = {"init": 0.0, "1": 0.0, "2": 0.0}
        with open(next(salida.glob("speed_*.csv")), newline="") as f:
            for fila in csv.DictReader(f):
                if fila["part"] in fases:
                    fases[fila["part"]] += float(fila["time_elapsed"])

        huella = hashlib.sha256()
        for patron in ("*_selected_*.csv", "*_formations_*.csv"):
            huella.update(next(salida.glob(patron)).read_bytes())

        return {"pared": pared, **fases, "rss_mb": uso.ru_maxrss / 1024, "hash": huella.hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bin-dir", required=True)
    parser.add_argument("--caso", required=True)
    parser.add_argument("--hilos", default="1,2,4,6,12", help="hilos de FAST-IBAN_omp; vacío para omitirlo")
    parser.add_argument("--procesos", default="", help="procesos de FAST-IBAN_mpi (ALG-206), p. ej. 1,2,4,6,12")
    parser.add_argument("--hibrido", default="", help="procesos x hilos de FAST-IBAN_omp_mpi, p. ej. 2x6,3x4")
    parser.add_argument("--sin-serie", action="store_true", help="no medir FAST-IBAN en serie")
    parser.add_argument("--mpiexec", default="mpirun")
    parser.add_argument("--reps", type=int, default=5)
    parser.add_argument("--csv", help="fichero donde guardar todas las ejecuciones")
    args = parser.parse_args()

    # Rutas absolutas: cada ejecución corre en su propio directorio temporal.
    caso = str(pathlib.Path(args.caso).resolve())
    bin_dir = pathlib.Path(args.bin_dir).resolve()
    lista = lambda texto: [x for x in texto.split(",") if x]
    configuraciones = [] if args.sin_serie else [("FAST-IBAN", 1, None)]
    configuraciones += [("FAST-IBAN_omp", int(h), None) for h in lista(args.hilos)]
    configuraciones += [("FAST-IBAN_mpi", 1, int(p)) for p in lista(args.procesos)]
    for combinacion in lista(args.hibrido):
        p, h = combinacion.split("x")
        configuraciones.append(("FAST-IBAN_omp_mpi", int(h), int(p)))
    todas, hashes = [], set()

    # Con MPI, init y las fases son la suma de todos los procesos y el RSS es el del mayor proceso.
    print(f"| Binario | Procesos | Hilos | Pared (s) | init (s) | Fase 1 (s) | Fase 2 (s) | RSS pico (MB) | Rango pared (s) |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for nombre, hilos, procesos in configuraciones:
        binario = str(bin_dir / nombre)
        ejecuciones = [ejecutar(binario, caso, hilos, procesos, args.mpiexec) for _ in range(args.reps)]
        for i, e in enumerate(ejecuciones):
            todas.append({"binario": nombre, "procesos": procesos or 1, "hilos": hilos, "rep": i, **e})
            hashes.add(e["hash"])
        med = {k: statistics.median(e[k] for e in ejecuciones) for k in ("pared", "init", "1", "2", "rss_mb")}
        paredes = [e["pared"] for e in ejecuciones]
        print(
            f"| `{nombre}` | {procesos or 1} | {hilos} | {med['pared']:.2f} | {med['init']:.2f} | {med['1']:.2f} | {med['2']:.2f} "
            f"| {med['rss_mb']:.0f} | {min(paredes):.2f}–{max(paredes):.2f} |",
            flush=True,
        )

    if args.csv:
        with open(args.csv, "w", newline="") as f:
            escritor = csv.DictWriter(f, fieldnames=list(todas[0].keys()))
            escritor.writeheader()
            escritor.writerows(todas)

    if len(hashes) != 1:
        sys.exit(f"ERROR: las ejecuciones no producen la misma salida ({len(hashes)} hashes distintos)")
    print(f"\nSalida idéntica en las {len(todas)} ejecuciones (sha256 {hashes.pop()[:16]}…)")


if __name__ == "__main__":
    main()
