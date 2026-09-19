// ALG-306, ALG-373: el área de las celdas de candidatos es la de su banda, R²·Δλ·(sin(φ+Δ/2) − sin(φ−Δ/2)), recortada
// a ±90°: el tamaño de un cluster no depende de la latitud ni del espaciado, y la fila del polo reparte el casquete.
#include "../libraries/lib.h"

static int fallos = 0;

static void comprobar(const char *caso, double obtenido, double esperado, double tolerancia) {
    int bien = fabs(obtenido - esperado) <= tolerancia;
    printf("%-52s %12.1f km² (esperado %12.1f)%s\n", caso, obtenido, esperado, bien ? "" : "  <-- FALLA");
    fallos += !bien;
}

int main(void) {
    double ecuador_1grado = 6371.0 * 6371.0 * (M_PI / 180) * 2 * sin(0.5 * M_PI / 180);  // banda exacta, ≈ 12 364,2 km²
    comprobar("celda de 1° en el ecuador", area_celda_km2(0, 1), ecuador_1grado, 0.1);
    comprobar("celda de 1° a 60°: la mitad", area_celda_km2(60, 1), ecuador_1grado / 2, 0.1);
    comprobar("celda de 1° a 60°S: igual que a 60°N", area_celda_km2(-60, 1), area_celda_km2(60, 1), 1e-9);
    // ALG-373: en la fila del polo cada candidato representa una porción del casquete; las 360 de 1° suman el casquete
    // entero, 2πR²(1 − cos ½°) ≈ 9 710 km², en vez de 0 (cos 90° = 0).
    double casquete_1grado = 2 * M_PI * 6371.0 * 6371.0 * (1 - cos(0.5 * M_PI / 180));
    comprobar("fila del polo a 1°: 360 celdas = casquete", 360 * area_celda_km2(90, 1), casquete_1grado, 0.1);
    comprobar("fila del polo sur igual que la del norte", area_celda_km2(-90, 1), area_celda_km2(90, 1), 1e-9);
    // La fórmula de banda es aditiva: 4 filas de 0,25° dentro de una celda de 1° suman esa celda.
    double cuatro_filas = 0;
    for (int k = 0; k < 4; k++) cuatro_filas += 4 * area_celda_km2(44.625 + 0.25 * k, 0.25);
    comprobar("4×4 celdas de 0,25° = la celda de 1° que cubren", cuatro_filas, area_celda_km2(45, 1), 1e-6);
    return fallos != 0;
}
