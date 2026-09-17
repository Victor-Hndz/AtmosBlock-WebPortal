// ALG-361: el mínimo de un Rex debe tener el contorno abierto hacia el este. En search_formation `contour_der` se ponía
// a false y no se recalculaba, así que un mínimo que cruzaba el contorno también por el este se aceptaba.
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define NIVEL 5500
static double extremos[256];
static int fallos = 0;

// Mínimo en 50°N con todos los rayos cruzando NIVEL salvo los indicados (acimut k·360/n_rays desde el norte).
static points_cluster minimo(int sin_cruzar[], int n) {
    points_cluster c;
    memset(&c, 0, sizeof(c));
    c.type = MIN;
    c.center = create_point(50, 0);
    c.extremos = extremos;
    for (int k = 0; k < PARAMS.n_rays; k++) extremos[k] = NIVEL + 50;   // un MIN cruza si el extremo supera el nivel
    for (int i = 0; i < n; i++) extremos[sin_cruzar[i]] = NIVEL - 50;
    return c;
}

static void comprobar(const char *caso, bool obtenido, bool esperado) {
    printf("%-62s %s (esperado %s)%s\n", caso, obtenido ? "cierto" : "falso", esperado ? "cierto" : "falso",
           obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

int main(void) {
    cargar_parametros(NULL);
    int n = PARAMS.n_rays;
    // Un rayo hacia el polo sin cruzar: no hay contorno cerrado y el sector polar sigue cruzando en mayoría.
    int polo[] = {0};
    comprobar("cruza por ecuador, oeste, polo (mayoría) y ESTE: no es mínimo de Rex", minimo_rex_valido(minimo(polo, 1), NIVEL), false);
    // Control: el mismo mínimo con el rayo central del este abierto sí lo es.
    int polo_y_este[] = {0, n / 4};
    comprobar("abierto hacia el este: mínimo de Rex", minimo_rex_valido(minimo(polo_y_este, 2), NIVEL), true);
    // Control: abierto hacia el oeste no lo es.
    int oeste[] = {3 * n / 4, n / 4};
    comprobar("abierto hacia el oeste: no es mínimo de Rex", minimo_rex_valido(minimo(oeste, 2), NIVEL), false);
    return fallos != 0;
}
