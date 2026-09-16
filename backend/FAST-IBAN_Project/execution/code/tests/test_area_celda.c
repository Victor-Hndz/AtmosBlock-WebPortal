// ALG-306: el área de las celdas de candidatos es R²·Δλ·Δφ·cos φ, así que el tamaño de un cluster no depende de la
// latitud ni del espaciado: la misma superficie da la misma área con cualquier rejilla.
#include "../libraries/lib.h"

static int fallos = 0;

static void comprobar(const char *caso, double obtenido, double esperado, double tolerancia) {
    int bien = fabs(obtenido - esperado) <= tolerancia;
    printf("%-52s %12.1f km² (esperado %12.1f)%s\n", caso, obtenido, esperado, bien ? "" : "  <-- FALLA");
    fallos += !bien;
}

int main(void) {
    double ecuador_1grado = 6371.0 * 6371.0 * (M_PI / 180) * (M_PI / 180);  // ≈ 12 363,9 km²
    comprobar("celda de 1° en el ecuador", area_celda_km2(0, 1), ecuador_1grado, 0.1);
    comprobar("celda de 1° a 60°: la mitad", area_celda_km2(60, 1), ecuador_1grado / 2, 0.1);
    comprobar("celda de 1° a 60°S: igual que a 60°N", area_celda_km2(-60, 1), area_celda_km2(60, 1), 1e-9);
    comprobar("16 celdas de 0,25° a 45° = 1 celda de 1°", 16 * area_celda_km2(45, 0.25), area_celda_km2(45, 1), 1e-6);
    return fallos != 0;
}
