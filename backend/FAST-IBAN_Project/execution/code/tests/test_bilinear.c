// ALG-106 (B7): bilinear_interpolation no puede usar -1 como centinela, porque -1 es un valor
// empaquetado válido (unos 5271 m de Z500). El éxito se devuelve aparte y el valor por puntero.
#include "../libraries/calc.h"

#define N_LAT 361
#define N_LON 1440

static int fallos = 0;

static void comprobar(const char *caso, bool ok, bool ok_esperado, short z, short z_esperado) {
    bool bien = ok == ok_esperado && (!ok || z == z_esperado);
    printf("%-40s ok=%d z=%6d (esperado ok=%d z=%6d)%s\n", caso, ok, ok ? z : 0, ok_esperado, z_esperado, bien ? "" : "  <-- FALLA");
    fallos += !bien;
}

int main(void) {
    static float lats[N_LAT], lons[N_LON];
    static short datos[N_LAT][N_LON];
    static short *filas[N_LAT];
    short z = 0;

    NLAT = N_LAT;
    NLON = N_LON;
    RES = 0.25;  // ALG-301: sin NetCDF, la resolución se fija a mano como NLAT y NLON
    for (int i = 0; i < N_LAT; i++) { lats[i] = 90.0f - 0.25f * i; filas[i] = datos[i]; }
    for (int j = 0; j < N_LON; j++) lons[j] = -180.0f + 0.25f * j;

    // Campo constante -1: -1 es un dato válido y la interpolación debe tener éxito.
    for (int i = 0; i < N_LAT; i++) for (int j = 0; j < N_LON; j++) datos[i][j] = -1;
    bool ok = bilinear_interpolation(create_point(45.1f, 10.1f), filas, lats, lons, &z);
    comprobar("campo constante -1", ok, true, z, -1);

    // Campo constante 1234.
    for (int i = 0; i < N_LAT; i++) for (int j = 0; j < N_LON; j++) datos[i][j] = 1234;
    ok = bilinear_interpolation(create_point(45.1f, 10.1f), filas, lats, lons, &z);
    comprobar("campo constante 1234", ok, true, z, 1234);

    // Punto fuera del dominio en latitud: fallo explícito.
    ok = bilinear_interpolation(create_point(90.1f, 10.1f), filas, lats, lons, &z);
    comprobar("lat 90.1 (fuera del dominio)", ok, false, z, 0);

    return fallos != 0;
}
