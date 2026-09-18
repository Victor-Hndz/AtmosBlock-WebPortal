// ALG-362: en la Omega, el mínimo va a la izquierda (oeste) o a la derecha (este) del máximo según su longitud. Las
// longitudes auxiliares eran enteras: un mínimo a 10,5° frente a un máximo a 10,9° no quedaba en ningún lado.
#include "../libraries/calc.h"

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
    return fallos != 0;
}
