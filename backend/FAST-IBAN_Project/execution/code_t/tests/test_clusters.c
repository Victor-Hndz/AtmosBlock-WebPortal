// ALG-114: la variante de temperatura agrupa solo los puntos seleccionados y escribe cada punto con el id de
// su cluster y el centroide de ese cluster. Antes, los puntos no seleccionados formaban un único cluster enorme
// y la columna "cluster" recibía el índice de fila (el bucle de escritura reutilizaba i).
#include "../lib/lib.h"

#define FILAS 6
#define COLUMNAS 10
#define PASO 0.75

static int fallos = 0;

static void comprobar(int condicion, const char *mensaje) {
    if (!condicion) {
        printf("FALLO: %s\n", mensaje);
        fallos++;
    }
}

int main(void) {
    RES = 0.25;  // ALG-301: sin NetCDF, la resolución de los centroides se fija a mano
    selected_point *datos = malloc(sizeof(selected_point) * FILAS * COLUMNAS);
    selected_point **puntos = malloc(sizeof(selected_point *) * FILAS);
    if (datos == NULL || puntos == NULL)
        return 2;

    // Dos grupos de puntos seleccionados que no se tocan: A (filas 0-1, columnas 0-1) y B (filas 3-4, columnas 6-8).
    int seleccionados = 0;
    for (int i = 0; i < FILAS; i++) {
        puntos[i] = datos + i * COLUMNAS;
        for (int j = 0; j < COLUMNAS; j++) {
            int en_a = i <= 1 && j <= 1, en_b = i >= 3 && i <= 4 && j >= 6 && j <= 8;
            if (en_a || en_b) {
                puntos[i][j] = create_selected_point(create_point(90.0 - PASO * i, -180.0 + PASO * j), 100, -1);
                seleccionados++;
            } else {
                puntos[i][j] = create_selected_point(create_point(-1, -1), -1, NOT_SELECTED);
            }
        }
    }

    int clusters = cluster_points(puntos, FILAS, COLUMNAS, 3);
    comprobar(clusters == 2, "dos clusters: los puntos no seleccionados no forman ninguno");
    comprobar(puntos[0][0].cluster != puntos[3][6].cluster, "los grupos A y B tienen ids distintos");
    comprobar(puntos[1][1].cluster == puntos[0][0].cluster && puntos[4][8].cluster == puntos[3][6].cluster,
              "todos los puntos de un grupo comparten id");

    FILE *fp = tmpfile();
    if (fp == NULL)
        return 2;
    write_selected_points(fp, puntos, FILAS, COLUMNAS, clusters, 0, 1.0, 0.0);
    rewind(fp);

    int filas = 0, tiempo, cluster;
    float lat, lon, t, clat, clon;
    float centroide_lat[2] = {0}, centroide_lon[2] = {0};
    int visto[2] = {0};
    while (fscanf(fp, "%d,%f,%f,%f,%d,%f,%f\n", &tiempo, &lat, &lon, &t, &cluster, &clat, &clon) == 7) {
        filas++;
        comprobar(cluster >= 0 && cluster < clusters, "la columna cluster es un id de cluster");
        if (cluster < 0 || cluster >= clusters)
            continue;
        if (!visto[cluster]) {
            visto[cluster] = 1;
            centroide_lat[cluster] = clat;
            centroide_lon[cluster] = clon;
        }
        comprobar(clat == centroide_lat[cluster] && clon == centroide_lon[cluster],
                  "todos los puntos de un cluster llevan el mismo centroide");
    }
    comprobar(filas == seleccionados, "solo se escriben los puntos seleccionados");

    // Centroide de A: entre 89.25 y 90 de latitud y entre -180 y -179.25 de longitud (rejilla de 0,25°).
    int id_a = puntos[0][0].cluster;
    comprobar(centroide_lat[id_a] >= 89.25 && centroide_lat[id_a] <= 90.0 && centroide_lon[id_a] >= -180.0 &&
                  centroide_lon[id_a] <= -179.25,
              "el centroide de A está dentro de A");

    fclose(fp);
    free(puntos);
    free(datos);
    if (fallos) {
        printf("%d comprobaciones fallidas\n", fallos);
        return 1;
    }
    printf("OK: clusters solo con puntos seleccionados, ids y centroides por cluster\n");
    return 0;
}
