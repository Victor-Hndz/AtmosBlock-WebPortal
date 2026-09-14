// ALG-105 (B1): findIndex sobre la rejilla real de ERA5 a 0,25°, tras check_coords.
// Latitudes 90 -> 0 (361), longitudes -180 -> 179.75 (1440, vuelta completa).
#include "../libraries/utils.h"

static int fallos = 0;

static void comprobar(const char *caso, int obtenido, int esperado) {
    int ok = obtenido == esperado;
    printf("%-45s obtenido %5d, esperado %5d%s\n", caso, obtenido, esperado, ok ? "" : "  <-- FALLA");
    fallos += !ok;
}

int main(void) {
    float lats[361], lons[1440];
    for (int i = 0; i < 361; i++) lats[i] = 90.0f - 0.25f * i;
    for (int i = 0; i < 1440; i++) lons[i] = -180.0f + 0.25f * i;

    // Valores de la rejilla
    comprobar("lat 90", findIndex(lats, 361, 90.0f), 0);
    comprobar("lat 45.25", findIndex(lats, 361, 45.25f), 179);
    comprobar("lat 0", findIndex(lats, 361, 0.0f), 360);
    comprobar("lon -180", findIndex(lons, 1440, -180.0f), 0);
    comprobar("lon 179.75", findIndex(lons, 1440, 179.75f), 1439);

    // Vuelta en longitud: la rejilla cubre 360°, así que 180 es -180 y -180.25 es 179.75
    comprobar("lon 180 (vuelta)", findIndex(lons, 1440, 180.0f), 0);
    comprobar("lon 180.25 (vuelta)", findIndex(lons, 1440, 180.25f), 1);
    comprobar("lon -180.25 (vuelta)", findIndex(lons, 1440, -180.25f), 1439);

    // Fuera del dominio en latitud (sin vuelta): -1
    comprobar("lat 90.25 (fuera)", findIndex(lats, 361, 90.25f), -1);
    comprobar("lat -0.25 (fuera)", findIndex(lats, 361, -0.25f), -1);

    // Valor que no está en la rejilla: -1
    comprobar("lat 45.1 (no es nodo)", findIndex(lats, 361, 45.1f), -1);

    return fallos != 0;
}
