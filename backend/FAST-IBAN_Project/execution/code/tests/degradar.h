// ALG-308: promedio de área para degradar una rejilla global de `res` grados a `f·res` (docs/invariancia_resolucion.md §2).
// Filtro separable centrado en cada punto grueso con pesos ½ en los extremos ([½,1,½] con f=2, [½,1,1,1,½] con f=4),
// ponderando cada fila nativa por el área de su banda; en una rejilla alineada equivale al remapeo conservativo de
// primer orden. La fila de ±90° es la media de todas las longitudes de las filas de su celda. Las filas fuera del
// fichero se descartan (renormalizando). Latitudes descendentes desde `lat0`, longitudes globales con vuelta.
#ifndef DEGRADAR_H
#define DEGRADAR_H
#include <math.h>
#include <stdbool.h>
#include <stdlib.h>

static double peso_nucleo(int k, int h) { return abs(k) == h ? 0.5 : 1.0; }

// Área relativa de la banda de latitud de una fila, recortada a ±90°.
static double area_banda(double lat, double res) {
    return sin(fmin(lat + res / 2, 90) * M_PI / 180) - sin(fmax(lat - res / 2, -90) * M_PI / 180);
}

// z: nlat·nlon valores nativos; sal: ((nlat-1)/f+1)·(nlon/f) valores (nlon múltiplo de f, par).
static void promedio_area(const double *z, int nlat, int nlon, double lat0, double res, int f, double *sal) {
    int h = f / 2, nlat_s = (nlat - 1) / f + 1, nlon_s = nlon / f;
    for (int io = 0; io < nlat_s; io++) {
        int i = io * f;
        bool polo = fabs(fabs(lat0 - i * res) - 90) < 1e-6;
        for (int jo = 0; jo < nlon_s; jo++) {
            if (polo && jo > 0) {  // la misma media para toda la fila
                sal[io * nlon_s + jo] = sal[io * nlon_s];
                continue;
            }
            double suma = 0, pesos = 0;
            for (int k = -h; k <= h; k++) {
                int r = i + k;
                if (r < 0 || r >= nlat)
                    continue;
                double wl = peso_nucleo(k, h) * area_banda(lat0 - r * res, res);
                if (polo) {
                    for (int c = 0; c < nlon; c++) { suma += wl * z[r * nlon + c]; pesos += wl; }
                    continue;
                }
                for (int m = -h; m <= h; m++) {
                    int c = ((jo * f + m) % nlon + nlon) % nlon;
                    double w = wl * peso_nucleo(m, h);
                    suma += w * z[r * nlon + c];
                    pesos += w;
                }
            }
            sal[io * nlon_s + jo] = suma / pesos;
        }
    }
}
#endif
