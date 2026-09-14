// ALG-006: el muestreo por rayos de círculo máximo no degenera cerca del polo.
// Con la función real y el paso de acimut de producción, los N_BEARINGS*2 rayos a DIST km
// deben caer en celdas distintas de la rejilla de RES grados, en ambos hemisferios, hasta 89,5°.
#include "../libraries/calc.h"

#define N_RAYOS (N_BEARINGS * 2)

int main(void) {
    const double lats[] = {30, 50, 70, 80, 85, 87, 89, 89.5};
    int fallos = 0;

    printf("lat | celdas distintas de %d rayos\n", N_RAYOS);
    for (int hemi = 1; hemi >= -1; hemi -= 2) {
        for (size_t k = 0; k < sizeof(lats) / sizeof(lats[0]); k++) {
            double lat = hemi * lats[k];
            int celdas[N_RAYOS][2], distintas = 0;

            for (int i = 0; i < N_RAYOS; i++) {
                coord_point p = coord_from_great_circle(create_point(lat, 0), DIST, BEARING_START + i * BEARING_STEP);
                double lon = fmod(p.lon + 540.0, 360.0) - 180.0;  // normalizar a [-180, 180)
                int c_lat = (int)round(p.lat / RES), c_lon = (int)round(lon / RES), repetida = 0;

                for (int j = 0; j < distintas && !repetida; j++)
                    repetida = celdas[j][0] == c_lat && celdas[j][1] == c_lon;
                if (!repetida) {
                    celdas[distintas][0] = c_lat;
                    celdas[distintas][1] = c_lon;
                    distintas++;
                }
            }

            printf("%6.1f | %d/%d%s\n", lat, distintas, N_RAYOS, distintas == N_RAYOS ? "" : "  <-- DEGENERA");
            fallos += distintas != N_RAYOS;
        }
    }
    return fallos != 0;
}
