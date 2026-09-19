// ALG-362: en la Omega, el mínimo va a la izquierda (oeste) o a la derecha (este) del máximo según su longitud. Las
// longitudes auxiliares eran enteras: un mínimo a 10,5° frente a un máximo a 10,9° no quedaba en ningún lado.
#include "../libraries/calc.h"
#include "../libraries/init.h"

static int fallos = 0;

static void comprobar(const char *caso, double lon_max, double lon_min, int esperado) {
    int lado = lado_del_minimo(create_point(60, (float)lon_max), create_point(50, (float)lon_min));
    printf("%-52s lado %2d (esperado %2d)%s\n", caso, lado, esperado, lado == esperado ? "" : "  <-- FALLA");
    fallos += lado != esperado;
}

int main(void) {
    comprobar("máx 10,9° / mín 10,5°: oeste", 10.9, 10.5, -1);
    comprobar("máx 10,5° / mín 10,9°: este", 10.5, 10.9, 1);
    comprobar("máx -10,5° / mín -10,9°: oeste", -10.5, -10.9, -1);
    comprobar("máx 20° / mín 10°: oeste", 20, 10, -1);
    comprobar("máx 170° / mín -170°: este (vuelta en ±180°)", 170, -170, 1);
    comprobar("máx -170° / mín 170°: oeste (vuelta en ±180°)", -170, 170, -1);
    comprobar("máx 179,75° / mín -179,75°: este", 179.75, -179.75, 1);
    comprobar("mismo meridiano: ningún lado", 30, 30, 0);

    // Flanco de Omega: además del lado, a más de rex_max_offset_km del meridiano del máximo (el complemento del Rex).
    cargar_parametros(NULL);
    struct { const char *caso; double lat_min, lon_min; int esperado; } flancos[] = {
        {"flanco: mín 50N 5E, d ≈ 358 km → no (franja del Rex)", 50, 5, 0},
        {"flanco: mín 71N 0,5E, casi en el meridiano → no", 71, 0.5, 0},
        {"flanco: mín 50N 12E, d ≈ 854 km → este", 50, 12, 1},
        {"flanco: mín 50N 12W, d ≈ 854 km → oeste", 50, -12, -1},
    };
    for (size_t k = 0; k < sizeof(flancos) / sizeof(flancos[0]); k++) {
        int lado = lado_flanco_omega(create_point(60, 0), create_point((float)flancos[k].lat_min, (float)flancos[k].lon_min));
        printf("%-52s lado %2d (esperado %2d)%s\n", flancos[k].caso, lado, flancos[k].esperado, lado == flancos[k].esperado ? "" : "  <-- FALLA");
        fallos += lado != flancos[k].esperado;
    }
    return fallos != 0;
}
