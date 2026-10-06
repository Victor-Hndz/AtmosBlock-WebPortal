"""PRD-302: sectores y regla de sector bloqueado del preregistro de F3 (F3-1 y F3-4, firmado el 2026-09-29).

Rejilla de 2,5° (lat 0→90, lon −180→177,5). Una celda está en un sector si oeste ≤ λ < este; el Pacífico y el LLB del
Pacífico cruzan ±180°. Principales en 40 ≤ φ ≤ 75°N con los límites de Matsueda (2009); LLB en 30 ≤ φ < 40°N
(construcción propia). Un sector está bloqueado si la máscara de evento, colapsada en latitud dentro de sus filas,
tiene ≥ 3 longitudes adyacentes bloqueadas dentro de sus límites (Matsueda 2009). Lo que mide es la ocupación del
sector por eventos DAV. Variante V1 (F3-4-V1, firmada el 2026-09-30): la misma regla solo en las filas de 55–65°N,
las latitudes centrales de Matsueda (2009), en los sectores principales; LLB sin cambio.
"""
import numpy as np

LAT = np.arange(0, 90.01, 2.5)
LON = np.arange(-180, 180, 2.5)
ADYACENTES_MIN = 3

# nombre: (lat mín, lat máx, incluye lat máx, oeste, este)
SECTORES = {
    "GRL": (40, 75, True, -90, -26.25),
    "EA": (40, 75, True, -26.25, 41.25),
    "URA": (40, 75, True, 41.25, 70),
    "PA": (40, 75, True, 120, -140),
    "NAM": (40, 75, True, -140, -90),
    "LLB-Atl": (30, 40, False, -90, 41.25),
    "LLB-Pac": (30, 40, False, 120, -90),
}
PRINCIPALES = ("GRL", "EA", "URA", "PA", "NAM")
LAT_MATSUEDA = (55, 65)


def filas(nombre, matsueda=False):
    s, n, incluye, _, _ = SECTORES[nombre]
    if matsueda and nombre in PRINCIPALES:
        (s, n), incluye = LAT_MATSUEDA, True
    return np.nonzero((LAT >= s) & ((LAT <= n) if incluye else (LAT < n)))[0]


def columnas(nombre):
    """Índices de longitud de oeste a este (continuos a través de ±180° si el sector lo cruza)."""
    _, _, _, oeste, este = SECTORES[nombre]
    if oeste < este:
        return np.nonzero((LON >= oeste) & (LON < este))[0]
    return np.concatenate([np.nonzero(LON >= oeste)[0], np.nonzero(LON < este)[0]])


def sector_bloqueado(ev, nombre, matsueda=False):
    """ev (..., lat, lon) booleana → (...) booleana. matsueda: variante V1 (filas de 55–65°N)."""
    b = ev[..., filas(nombre, matsueda), :][..., columnas(nombre)].any(axis=-2)
    racha = b[..., : b.shape[-1] - ADYACENTES_MIN + 1].copy()
    for k in range(1, ADYACENTES_MIN):
        racha &= b[..., k: b.shape[-1] - ADYACENTES_MIN + 1 + k]
    return racha.any(axis=-1)


def fraccion_area(ev, nombre):
    """Fracción del área del sector (ponderada por cos φ) cubierta por ev (..., lat, lon)."""
    peso = np.cos(np.deg2rad(LAT[filas(nombre)]))[:, None]
    celdas = ev[..., filas(nombre), :][..., columnas(nombre)]
    return (celdas * peso).sum(axis=(-2, -1)) / (peso.sum() * len(columnas(nombre)))
