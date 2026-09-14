#include "../libraries/utils.h"

int NLAT, NLON, NTIME;
long long FINDINDEX_CALLS = 0, FINDINDEX_MISSES = 0;


// Índice de target en una rejilla regular arr[i] = arr[0] + i*paso, en O(1) (B1, ALG-105).
// target debe ser un nodo de la rejilla (tolerancia de 0,001 pasos). Si la rejilla cubre 360
// grados (longitud), el índice da la vuelta: 180 es -180. Si no, fuera de rango devuelve -1.
int findIndex(float *arr, int n, float target) {
    int idx = -1;
    #pragma omp atomic
    FINDINDEX_CALLS++;

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

    if (idx == -1) {
        #pragma omp atomic
        FINDINDEX_MISSES++;
    }
    return idx;
}


//Order the selected points.
void order_selected_points(selected_point *points, int size) {
    int x,y;
    
    for(x=0; x<size;x++) {
        //Maximos delante de minimos en el array
        if(points[x].type == MIN) {
            for(y=x+1; y<size;y++) {
                if(points[y].type == MAX) {
                    selected_point aux = points[x];
                    points[x] = points[y];
                    points[y] = aux;
                    break;
                } else {
                    //los mínimos con lat menor, delante
                    if(points[x].point.lat > points[y].point.lat) {
                        selected_point aux = points[x];
                        points[x] = points[y];
                        points[y] = aux;
                    }
                }
            }
        }
    }
}


// Function to export the data of the selected points to a csv file.
void export_selected_points_to_csv(selected_point **selected_points, int size_x, int size_y, char *filename, double offset, double scale_factor, int time) {
    int i,j;
    FILE *fp = fopen(filename, "a");

    for(i=0; i<size_x; i++)
        for(j=0; j<size_y; j++) 
            if(selected_points[i][j].type != NO_TYPE)
                fprintf(fp, "%d,%.2f,%.2f,%.1f,%s,%d\n", time, selected_points[i][j].point.lat, selected_points[i][j].point.lon, (((selected_points[i][j].z* scale_factor) + offset)/g_0), selected_points[i][j].type == MAX ? "MAX" : selected_points[i][j].type == MIN ? "MIN" : "NO_TYPE", selected_points[i][j].cluster);
    fclose(fp);
}


// Function to export the data of the filtered points to a csv file.
void export_filtered_points_to_csv(selected_point *selected_points, int size, char *filename, double offset, double scale_factor, int time) {
    int i;
    FILE *fp = fopen(filename, "a");

    for(i=0; i<size; i++) 
        fprintf(fp, "%d,%.2f,%.2f,%.1f,%s,%d\n", time, selected_points[i].point.lat, selected_points[i].point.lon, (((selected_points[i].z* scale_factor) + offset)/g_0), selected_points[i].type == MAX ? "MAX" : selected_points[i].type == MIN ? "MIN" : "NO_TYPE", selected_points[i].cluster);
    fclose(fp);
}

void export_clusters_to_csv(points_cluster *clusters, int size, char *filename, double offset, double scale_factor, int time) {
    int i,j;
    FILE *fp = fopen(filename, "a");

    for(i=0; i<size; i++) 
        for(j=0; j<clusters[i].n_points; j++) 
            fprintf(fp, "%d,%.2f,%.2f,%.1f,%s,%d,%.2f,%.2f\n", time, clusters[i].points[j].point.lat, clusters[i].points[j].point.lon, (((clusters[i].points[j].z* scale_factor) + offset)/g_0), clusters[i].points[j].type == MAX ? "MAX" : clusters[i].points[j].type == MIN ? "MIN" : "NO_TYPE", clusters[i].points[j].cluster, 
            clusters[i].center.lat, clusters[i].center.lon);
    fclose(fp);
}

void export_formation_to_csv(formation formation, char *filename, int time) {
    FILE *fp = fopen(filename, "a");

    fprintf(fp, "%d,%d,%d,%d,%s\n", time, formation.max_id, formation.min1_id, formation.min2_id, formation.type == OMEGA ? "OMEGA" : "REX");
    fclose(fp);
}

// Function to export the data of the formations to a csv file.
// void export_formation_to_csv(formation *formations, int size, char *filename, double offset, double scale_factor, int time) {
//     FILE *fp = fopen(filename, "a");

//     for(int i=0; i<size; i++) {
//         fprintf(fp, "%d,%.2f,%.2f,%d,%s\n", time, formations[i].max.lat, formations[i].max.lon, formations[i].id, formations[i].type == OMEGA ? "OMEGA" : "REX");
//         fprintf(fp, "%d,%.2f,%.2f,%d,%s\n", time, formations[i].min1.lat, formations[i].min1.lon, formations[i].id, formations[i].type == OMEGA ? "OMEGA" : "REX");
        
//         if(formations[i].type == OMEGA)
//             fprintf(fp, "%d,%.2f,%.2f,%d,%s\n", time, formations[i].min2.lat, formations[i].min2.lon, formations[i].id, formations[i].type == OMEGA ? "OMEGA" : "REX");
//     }
//     fclose(fp);
// }
