"""PRD-502: puntuaciones de la verificación preregistrada (F5 del preregistro firmado el 2026-09-29).

Brier (BS) y su habilidad (BSS) frente a una referencia; BS justo para conjuntos (Ferro 2014); descomposición de Murphy
(1973) en 10 intervalos; diagrama de fiabilidad con barras de consistencia (Bröcker & Smith 2007); área ROC; bootstrap
por bloques de pasadas consecutivas (Wilks 1997; 16 pasadas, 1000 réplicas, IC90) y p-valor bilateral de sus réplicas;
FDR de Benjamini-Hochberg para las pruebas secundarias (Wilks 2016). Todo determinista con semilla fija.
"""
import numpy as np

INTERVALOS = 10
BLOQUE = 16
REPLICAS = 1000
NIVEL = 0.90
SEMILLA = 20260929  # fecha del preregistro


def brier(p, o):
    return float(np.mean((np.asarray(p, float) - np.asarray(o, float)) ** 2))


def brier_justo(k, m, o):
    """Ferro (2014): k de m miembros prevén el suceso; corrige el sesgo del BS de un conjunto finito."""
    k, o = np.asarray(k, float), np.asarray(o, float)
    return float(np.mean((k / m - o) ** 2 - k * (m - k) / (m ** 2 * (m - 1))))


def bss(bs, bs_ref):
    return 1 - bs / bs_ref


def _intervalo_de(p):
    return np.minimum((np.asarray(p, float) * INTERVALOS).astype(int), INTERVALOS - 1)


def murphy(p, o):
    """(fiabilidad, resolución, incertidumbre); BS = fiab − resol + incert si cada intervalo tiene un solo valor de p."""
    p, o = np.asarray(p, float), np.asarray(o, float)
    k, media = _intervalo_de(p), o.mean()
    fiab = resol = 0.0
    for i in np.unique(k):
        sel = k == i
        fiab += sel.sum() * (p[sel].mean() - o[sel].mean()) ** 2
        resol += sel.sum() * (o[sel].mean() - media) ** 2
    return fiab / len(p), resol / len(p), media * (1 - media)


def fiabilidad(p, o, n_rep=REPLICAS, semilla=SEMILLA, nivel=NIVEL):
    """Por intervalo: n, prob_media, frecuencia observada y barras de consistencia (fiabilidad perfecta remuestreada)."""
    p, o = np.asarray(p, float), np.asarray(o, float)
    k = _intervalo_de(p)
    n = np.bincount(k, minlength=INTERVALOS)
    with np.errstate(invalid="ignore"):
        prob_media = np.bincount(k, p, INTERVALOS) / n
        frecuencia = np.bincount(k, o, INTERVALOS) / n
        rng = np.random.default_rng(semilla)
        reps = np.empty((n_rep, INTERVALOS))
        for r in range(n_rep):
            pr = p[rng.integers(len(p), size=len(p))]
            kr = _intervalo_de(pr)
            reps[r] = np.bincount(kr, rng.random(len(p)) < pr, INTERVALOS) / np.bincount(kr, minlength=INTERVALOS)
        cola = (1 - nivel) / 2
        inf, sup = np.nanquantile(reps, [cola, 1 - cola], axis=0)
    return {"n": n, "prob_media": prob_media, "frecuencia": frecuencia, "barra_inf": inf, "barra_sup": sup}


def area_roc(p, o):
    """P(p de un caso con suceso > p de uno sin él), con los empates a medias (Mann-Whitney)."""
    p, o = np.asarray(p, float), np.asarray(o, bool)
    pos, neg = p[o][:, None], p[~o][None, :]
    return float(((pos > neg).sum() + 0.5 * (pos == neg).sum()) / (pos.size * neg.size))


def indices_bloques(n, bloque=BLOQUE, n_rep=REPLICAS, semilla=SEMILLA):
    """(n_rep, n) índices de bloques de pasadas consecutivas con reemplazamiento (sin dar la vuelta al final)."""
    rng = np.random.default_rng(semilla)
    bloque = min(bloque, n)
    nb = -(-n // bloque)
    inicios = rng.integers(0, n - bloque + 1, size=(n_rep, nb))
    return (inicios[:, :, None] + np.arange(bloque)).reshape(n_rep, -1)[:, :n]


def bootstrap(estadistico, *series, bloque=BLOQUE, n_rep=REPLICAS, semilla=SEMILLA):
    """Réplicas de estadistico(*series) remuestreando las mismas pasadas en todas las series (emparejado)."""
    series = [np.asarray(s) for s in series]
    return np.array([estadistico(*(s[i] for s in series))
                     for i in indices_bloques(len(series[0]), bloque, n_rep, semilla)])


def intervalo(reps, nivel=NIVEL):
    cola = (1 - nivel) / 2
    return tuple(np.quantile(reps, [cola, 1 - cola]))


def p_valor(reps):
    """Bilateral frente a 0 a partir de las réplicas."""
    return float(min(1.0, 2 * min(np.mean(reps <= 0), np.mean(reps >= 0))))


def fdr(p, q=0.10):
    """Benjamini-Hochberg: 1 en las hipótesis rechazadas. Wilks (2016) recomienda q = 2·α global (0,10 para 0,05)."""
    p = np.asarray(p, float)
    orden = np.argsort(p)
    bajo = p[orden] <= q * np.arange(1, len(p) + 1) / len(p)
    rechazo = np.zeros(len(p), dtype=int)
    if bajo.any():
        rechazo[orden[: np.nonzero(bajo)[0].max() + 1]] = 1
    return rechazo
