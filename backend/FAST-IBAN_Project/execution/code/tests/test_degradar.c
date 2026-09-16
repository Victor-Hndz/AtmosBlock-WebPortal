// ALG-308: promedio de área para degradar la resolución (docs/invariancia_resolucion.md §2), sin NetCDF.
#include <math.h>
#include <stdio.h>
#include "degradar.h"

#define N_LAT 361  // 90°N a 0° cada 0,25°
#define N_LON 1440
#define RES 0.25

static double z[N_LAT * N_LON], sal[181 * 720];  // la salida más grande, a 0,5°
static int fallos = 0;

static void comprobar(const char *caso, double obtenido, double esperado) {
    bool bien = fabs(obtenido - esperado) < 1e-9 * fmax(1, fabs(esperado));
    printf("%-55s %.12g (esperado %.12g)%s\n", caso, obtenido, esperado, bien ? "" : "  <-- FALLA");
    fallos += !bien;
}

int main(void) {
    for (int f = 2; f <= 4; f += 2) {
        int nlat_s = (N_LAT - 1) / f + 1, nlon_s = N_LON / f;
        char caso[80];

        // Campo constante: sale constante en todas partes, también en el polo y en el borde de 0°.
        for (int i = 0; i < N_LAT * N_LON; i++) z[i] = 5500;
        promedio_area(z, N_LAT, N_LON, 90, RES, f, sal);
        double peor = 0;
        for (int i = 0; i < nlat_s * nlon_s; i++) peor = fmax(peor, fabs(sal[i] - 5500));
        snprintf(caso, sizeof(caso), "x%d constante: máxima desviación", f);
        comprobar(caso, peor, 0);

        // Lineal en longitud: el núcleo es simétrico, así que se conserva lejos de la discontinuidad de ±180°.
        for (int i = 0; i < N_LAT; i++)
            for (int j = 0; j < N_LON; j++) z[i * N_LON + j] = 5000 + 2.0 * j;
        promedio_area(z, N_LAT, N_LON, 90, RES, f, sal);
        snprintf(caso, sizeof(caso), "x%d lineal en lon: 45°N, 10°E", f);
        comprobar(caso, sal[lround(45 / (f * RES)) * nlon_s + lround(190 / (f * RES))], 5000 + 2.0 * 190 / RES);

        // Polo: la misma media para toda la fila, aunque el campo varíe con la longitud.
        snprintf(caso, sizeof(caso), "x%d polo: fila constante (último - primero)", f);
        comprobar(caso, sal[nlon_s - 1] - sal[0], 0);
        // ... y es la media de longitudes ponderada por área de las filas de la celda polar: aquí 5000 + 2·media(j).
        snprintf(caso, sizeof(caso), "x%d polo: media de todas las longitudes", f);
        comprobar(caso, sal[0], 5000 + 2.0 * (N_LON - 1) / 2);

        // Peso por área en latitud: con z = índice de fila (crece hacia el sur) las filas del sur de la celda pesan más,
        // así que a 45°N la media queda por encima del índice central; sin el peso daría el índice exacto.
        for (int i = 0; i < N_LAT; i++)
            for (int j = 0; j < N_LON; j++) z[i * N_LON + j] = i;
        promedio_area(z, N_LAT, N_LON, 90, RES, f, sal);
        double centro = 45 / RES, obtenido = sal[lround(45 / (f * RES)) * nlon_s];
        snprintf(caso, sizeof(caso), "x%d peso por área: 45°N por encima del centro", f);
        comprobar(caso, obtenido > centro + 1e-6 && obtenido < centro + 0.01, true);
    }
    return fallos != 0;
}
