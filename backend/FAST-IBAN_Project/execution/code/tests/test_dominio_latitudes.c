// ALG-374: el dominio de análisis llega del límite hacia el ecuador al polo de su hemisferio. En el hemisferio sur ese
// límite es LAT_LIM_MAX, no LAT_LIM_MIN; antes se usaba siempre LAT_LIM_MIN y el sur procesaba hasta el ecuador.
#include "../libraries/init.h"
#include "../libraries/lib.h"

static int fallos = 0;

static void comprobar(const char *caso, int min_esperado, int max_esperado) {
    bool bien = DOM_LAT_MIN == min_esperado && DOM_LAT_MAX == max_esperado;
    printf("%-46s dominio [%d, %d] (esperado [%d, %d])%s\n", caso, DOM_LAT_MIN, DOM_LAT_MAX, min_esperado, max_esperado,
           bien ? "" : "  <-- FALLA");
    fallos += !bien;
}

static void caso(int lim_min, int lim_max, const char *nombre, int min_esperado, int max_esperado) {
    LAT_LIM_MIN = lim_min;
    LAT_LIM_MAX = lim_max;
    calcular_dominio_latitudes();
    comprobar(nombre, min_esperado, max_esperado);
}

int main(void) {
    caso(25, 90, "norte (25, 90)", 25, 90);
    caso(25, 85, "norte con límite polar (25, 85)", 25, 90);      // el límite polar no recorta (ALG-304)
    caso(-90, -25, "sur (-90, -25)", -90, -25);
    caso(-85, -25, "sur con límite polar (-85, -25)", -90, -25);
    caso(-30, 30, "a caballo del ecuador (-30, 30)", -30, 30);    // los dos limitan
    return fallos != 0;
}
