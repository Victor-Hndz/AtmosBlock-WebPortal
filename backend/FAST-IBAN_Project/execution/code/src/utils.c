#include "../libraries/utils.h"

int NLAT, NLON, NTIME;
contadores_hilo CONTADORES[MAX_HILOS_CONTADORES];

contadores_hilo contadores_totales(void) {
    long long calls = 0, misses = 0, interp = 0, fails = 0;
    for (int i = 0; i < MAX_HILOS_CONTADORES; i++) {
        calls += CONTADORES[i].findindex_calls;
        misses += CONTADORES[i].findindex_misses;
        interp += CONTADORES[i].interp_calls;
        fails += CONTADORES[i].interp_fails;
    }
    return (contadores_hilo){.findindex_calls = calls, .findindex_misses = misses, .interp_calls = interp, .interp_fails = fails};
}


// Índice de target en una rejilla regular arr[i] = arr[0] + i*paso, en O(1) (B1, ALG-105).
// target debe ser un nodo de la rejilla (tolerancia de 0,001 pasos). Si la rejilla cubre 360
// grados (longitud), el índice da la vuelta: 180 es -180. Si no, fuera de rango devuelve -1.
// ALG-209: sin contadores. bilinear_interpolation, el camino caliente, la usa y cuenta una sola vez
// por interpolación; el resto del código usa findIndex, que sí cuenta.
int findIndex_sin_contar(float *arr, int n, float target) {
    int idx = -1;

    if (n == 1) {
        idx = arr[0] == target ? 0 : -1;
    } else if (n > 1) {
        double paso = (double)arr[1] - arr[0];
        double pos = ((double)target - arr[0]) / paso;
        double k = floor(pos + 0.5);
        if (fabs(pos - k) < 1e-3) {
            if (fabs(fabs(paso) * n - 360.0) < 1e-6)
                k = fmod(fmod(k, n) + n, n);
            if (k >= 0 && k < n)
                idx = (int)k;
        }
    }

    return idx;
}

// findIndex con los contadores de diagnóstico de ALG-005.
int findIndex(float *arr, int n, float target) {
    int idx = findIndex_sin_contar(arr, n, target);
    contadores_hilo *contador = &CONTADOR_HILO();

    contador->findindex_calls++;
    if (idx == -1)
        contador->findindex_misses++;
    return idx;
}


void export_clusters_to_csv(points_cluster *clusters, int size, char *filename, double offset, double scale_factor, int time) {
    int i,j;
    FILE *fp = fopen(filename, "a");

    for(i=0; i<size; i++) 
        for(j=0; j<clusters[i].n_points; j++) 
            fprintf(fp, "%d,%.2f,%.2f,%.1f,%s,%d,%.2f,%.2f\n", time, clusters[i].points[j].point.lat, clusters[i].points[j].point.lon, valor_fisico(clusters[i].points[j].z, scale_factor, offset), clusters[i].points[j].type == MAX ? "MAX" : clusters[i].points[j].type == MIN ? "MIN" : "NO_TYPE", clusters[i].points[j].cluster, 
            clusters[i].center.lat, clusters[i].center.lon);
    fclose(fp);
}

void export_formation_to_csv(formation formation, char *filename, int time) {
    FILE *fp = fopen(filename, "a");

    // ALG-376: `truncada` avisa de que el contorno de algun cluster se quedo sin datos en el borde del fichero.
    fprintf(fp, "%d,%d,%d,%d,%s,%d\n", time, formation.max_id, formation.min1_id, formation.min2_id, formation.type == OMEGA ? "OMEGA" : formation.type == REX ? "REX" : "POLAR_HIGH", formation.truncada ? 1 : 0);
    fclose(fp);
}

