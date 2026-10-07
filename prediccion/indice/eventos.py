"""PRD-301: eventos de bloqueo a partir de la máscara DAV diaria, con el comportamiento de blocktrack v1.1 (6e4dc14).

Reimplementa (sin copiar código; blocktrack es GPL-3.0) ContourTracking2D + FilterEvents con sus valores por defecto
(F3-2 del preregistro): objetos diarios con vecindad 4 y vuelta en ±180°; un objeto hereda la etiqueta del de ayer si
comparten más de la mitad de cualquiera de los dos; se descartan los eventos de menos de 5 días, de área media menor
de 5×10⁵ km² o con desplazamiento medio mayor de 1000 km/día. Se conservan sus convenciones, aunque sean discutibles:
área de celda cos φ·(2,5·40075/360)², centro de masas plano, sin distancia al cruzar el meridiano 0 y desplazamiento
medio = distancia total / número de días. test_eventos.py comprueba 0 discrepancias frente a blocktrack en ERA5.
"""
import numpy as np
from scipy.ndimage import label

RESOLUCION = 2.5
VECINDAD = [[0, 1, 0], [1, 1, 1], [0, 1, 0]]
SOLAPE = 0.5
PERSISTENCIA_MIN = 5
AREA_MIN_KM2 = 500000
DESPLAZAMIENTO_MAX_KM_DIA = 1000
AREA_CELDA_ECUADOR_KM2 = (RESOLUCION * 40075 / 360) ** 2


def _objetos_del_dia(m, desplazamiento):
    et, _ = label(m, VECINDAD)
    et[et > 0] += desplazamiento
    for j in range(et.shape[0] - 1):  # blocktrack no une la última fila (90°N, siempre sin DAV)
        if et[j, -1] > 0 and et[j, 0] > 0:
            et[et == et[j, -1]] = et[j, 0]
    return et


def _heredar(ayer, hoy):
    """Un objeto de hoy toma la etiqueta del primer objeto de ayer (en orden de etiqueta) con el que solapa."""
    candidatos = np.unique(hoy[hoy > 0])
    for e1 in np.unique(ayer[ayer > 0]):
        b1 = ayer == e1
        n_ayer = np.count_nonzero(b1)
        for e2 in candidatos:
            b2 = hoy == e2
            comun = np.count_nonzero(b1 & b2)
            if comun > n_ayer * SOLAPE or comun > np.count_nonzero(b2) * SOLAPE:
                hoy[b2] = e1


def _seguir(mascara):
    et = np.zeros(mascara.shape, dtype=np.int64)
    maximo = 0
    for t in range(mascara.shape[0]):
        if t > 0:
            maximo = max(maximo, int(et[t - 1].max()))
        et[t] = _objetos_del_dia(mascara[t], maximo)
        if t > 0:
            _heredar(et[t - 1], et[t])
    return et


def _area(b):
    # mismo orden de suma que blocktrack (longitud por fuera, latitud por dentro), para empates exactos en el umbral
    filas = np.nonzero(b.T)[1]
    return sum(np.cos(np.deg2rad(filas * RESOLUCION)) * AREA_CELDA_ECUADOR_KM2)


def _centro(b):
    """(lat, lon) del centro de masas plano; si toca la columna de −180°, se calcula centrado en ±180°."""
    filas, cols = np.nonzero(b)
    if not b[:, 0].any():
        return filas.mean() * RESOLUCION, cols.mean() * RESOLUCION - 180
    mitad = b.shape[1] // 2
    c = np.nonzero(np.roll(b, -mitad, axis=1))[1].mean()
    return filas.mean() * RESOLUCION, c * RESOLUCION - (0 if c < mitad else 360)


def _desplazamiento_medio(centros):
    lats, lons = zip(*centros)
    dist = 0.0
    for i in range(len(lons) - 1):
        kx = np.cos(np.deg2rad(np.mean([lats[i + 1], lats[i]]))) * 111.320
        dy = (lats[i + 1] - lats[i]) * 110.574
        dx = lons[i + 1] - lons[i]
        if lons[i + 1] * lons[i] > 0:
            dist += ((dx * kx) ** 2 + dy ** 2) ** 0.5
        elif abs(lons[i]) > 100:  # cruce de ±180°; el del meridiano 0 no suma, como en blocktrack
            dx += 360 if lons[i] > 0 else -360
            dist += ((dx * kx) ** 2 + dy ** 2) ** 0.5
    return dist / len(lons)


def etiquetas_filtradas(mascara):
    """Etiqueta de evento por celda (días, lat 0→90 a 2,5°, lon −180→177,5); 0 fuera de los eventos filtrados."""
    et = _seguir(np.asarray(mascara))
    for e in np.unique(et[et > 0]):
        b = et == e
        dias = np.nonzero(b.any(axis=(1, 2)))[0]
        area_media = sum(_area(b[t]) / len(dias) for t in dias)
        if (len(dias) < PERSISTENCIA_MIN or area_media < AREA_MIN_KM2
                or _desplazamiento_medio([_centro(b[t]) for t in dias]) > DESPLAZAMIENTO_MAX_KM_DIA):
            et[b] = 0
    return et


def objetos_grandes(m):
    """Variante V2 de la calma (2026-10-07): objetos de un día (lat, lon) con la conectividad del seguimiento y área
    de ese día ≥ AREA_MIN_KM2; etiqueta por celda, 0 en el resto. Sin persistencia ni desplazamiento (piden días
    futuros)."""
    et = _objetos_del_dia(np.asarray(m), 0)
    for e in np.unique(et[et > 0]):
        if _area(et == e) < AREA_MIN_KM2:
            et[et == e] = 0
    return et


def eventos(mascara):
    """Máscara booleana de las celdas que pertenecen a un evento filtrado."""
    return etiquetas_filtradas(mascara) > 0
