// ALG-309 (F3.9): la vecindad de expandCluster da la vuelta en ±180° en rejillas globales y trata la fila del polo como un
// único punto; en una rejilla regional los bordes en longitud no son vecinos. Retícula de candidatos de 1°.
#include "../libraries/calc.h"

#define FILAS 11      // 90°N a 80°N
#define COLUMNAS 360  // -180° a 179°

static selected_point datos[FILAS][COLUMNAS];
static selected_point *puntos[FILAS];
static int fallos = 0;

// Rejilla de `columnas` longitudes desde `lon0`, sin candidatos.
static void vaciar(int columnas, double lon0) {
    for (int i = 0; i < FILAS; i++) {
        puntos[i] = datos[i];
        for (int j = 0; j < columnas; j++)
            datos[i][j] = create_selected_point(create_point((float)(90 - i), (float)(lon0 + j)), 0, NO_TYPE, -1);
    }
}

static void maximo(int fila, int columna) {
    datos[fila][columna].type = MAX;
}

static void agrupar(int columnas, int fila, int columna) {
    datos[fila][columna].cluster = 1;
    expandCluster(puntos, FILAS, columnas, fila, columna, 1);
}

static void comprobar(const char *caso, bool obtenido, bool esperado) {
    printf("%-62s %s (esperado %s)%s\n", caso, obtenido ? "cierto" : "falso", esperado ? "cierto" : "falso",
           obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

int main(void) {
    // Antimeridiano: máximos a 85°N (fila 5) en -180° (columna 0) y 179° (columna 359).
    vaciar(COLUMNAS, -180);
    maximo(5, 0);
    maximo(5, 359);
    agrupar(COLUMNAS, 5, 0);
    comprobar("global: máximos en -180° y 179° forman un cluster", datos[5][359].cluster == 1, true);

    // Polo: 89°N en -90° y en 90°, cada uno junto a un candidato de la fila del polo en su longitud.
    vaciar(COLUMNAS, -180);
    maximo(0, 90);   // 90°N, -90°
    maximo(0, 270);  // 90°N,  90°
    maximo(1, 90);   // 89°N, -90°
    maximo(1, 270);  // 89°N,  90°
    agrupar(COLUMNAS, 1, 90);
    comprobar("global: 89°N en -90° y 90° se unen a través del polo", datos[1][270].cluster == 1, true);

    // Control: rejilla regional de 20° (0° a 19°): la primera y la última columna no son vecinas.
    vaciar(20, 0);
    maximo(5, 0);
    maximo(5, 19);
    agrupar(20, 5, 0);
    comprobar("regional: las columnas 0° y 19° no se unen", datos[5][19].cluster == 1, false);

    return fallos != 0;
}
