// ALG-403 (B8): expandCluster no debe desbordar la pila con clusters grandes, y debe marcar
// exactamente la componente conexa del punto semilla (mismo tipo, vecindad 8).
#include "../libraries/calc.h"

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

    // Filas 0..FILAS-2: un bloque MAX conexo de ~1 millón de puntos. Fila FILAS-1: NO_TYPE separa
    // un segundo bloque MIN en la columna 0 de la última fila... que no debe tocarse.
    for (int i = 0; i < FILAS; i++) {
        puntos[i] = datos + i * COLUMNAS;
        for (int j = 0; j < COLUMNAS; j++) {
            enum Tipo_form tipo = i < FILAS - 1 ? MAX : NO_TYPE;
            puntos[i][j] = create_selected_point(create_point(90.0 - PASO * i, -180.0 + PASO * j), 0, tipo, -1);
        }
    }
    puntos[FILAS - 1][0].type = MIN;

    puntos[0][0].cluster = 7;
    expandCluster(puntos, FILAS, COLUMNAS, 0, 0, 7);

    long marcados = 0, fuera = 0;
    for (int i = 0; i < FILAS; i++)
        for (int j = 0; j < COLUMNAS; j++) {
            if (puntos[i][j].type == MAX)
                marcados += puntos[i][j].cluster == 7;
            else
                fuera += puntos[i][j].cluster != -1;
        }

    long esperados = (long)(FILAS - 1) * COLUMNAS;
    printf("MAX marcados con el id: %ld de %ld; puntos de otro tipo tocados: %ld\n", marcados, esperados, fuera);

    free(puntos);
    free(datos);
    return !(marcados == esperados && fuera == 0);
}
