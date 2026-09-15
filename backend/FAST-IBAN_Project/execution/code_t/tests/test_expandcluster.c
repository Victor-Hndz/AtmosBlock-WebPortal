// ALG-112 (B8 en code_t): expandCluster no debe desbordar la pila con clusters grandes, y debe marcar
// exactamente los puntos alcanzables desde la semilla (vecindad 8, dentro de eps). Mismo caso que el
// test de code/, adaptado a code_t, cuyos puntos no tienen tipo.
#include "../lib/lib.h"

#define FILAS 1000
#define COLUMNAS 1000
#define PASO 1.25

int main(void) {
    selected_point *datos = malloc(sizeof(selected_point) * FILAS * COLUMNAS);
    selected_point **puntos = malloc(sizeof(selected_point *) * FILAS);
    if (datos == NULL || puntos == NULL) {
        printf("sin memoria\n");
        return 2;
    }

    // Filas 0..FILAS-2: un bloque conexo de ~1 millón de puntos. Fila FILAS-1: puntos lejos (fuera de eps)
    // que no deben marcarse.
    for (int i = 0; i < FILAS; i++) {
        puntos[i] = datos + i * COLUMNAS;
        for (int j = 0; j < COLUMNAS; j++) {
            float lat = i < FILAS - 1 ? 90.0 - PASO * i : -1000.0;
            puntos[i][j] = create_selected_point(create_point(lat, -180.0 + PASO * j), 0, -1);
        }
    }

    puntos[0][0].cluster = 7;
    expandCluster(puntos, FILAS, COLUMNAS, 0, 0, 7, PASO);

    long marcados = 0, fuera = 0;
    for (int i = 0; i < FILAS; i++)
        for (int j = 0; j < COLUMNAS; j++) {
            if (i < FILAS - 1)
                marcados += puntos[i][j].cluster == 7;
            else
                fuera += puntos[i][j].cluster != -1;
        }

    long esperados = (long)(FILAS - 1) * COLUMNAS;
    printf("Marcados con el id: %ld de %ld; puntos lejanos tocados: %ld\n", marcados, esperados, fuera);

    free(puntos);
    free(datos);
    return !(marcados == esperados && fuera == 0);
}
