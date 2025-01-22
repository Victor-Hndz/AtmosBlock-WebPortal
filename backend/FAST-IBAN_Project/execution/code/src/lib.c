#include "../libraries/lib.h"
#include "../libraries/utils.h"

// Function to create a coord_point struct from a latitude and longitude.
coord_point create_point(float lat, float lon) {
    coord_point point = {lat, lon};
    return point;
}

// Function to create a selected_point struct.
selected_point create_selected_point(coord_point point, short z, enum Tipo_form type, int cluster) {
    selected_point new_point = {point, z, type, cluster};
    return new_point;
}

// Function to create a formation struct.
formation create_formation(int max, int min1, int min2, enum Tipo_block type) {
    formation new_formation = {max, min1, min2, type};
    return new_formation;
}

points_cluster create_cluster(int id, int n_points, int contour, coord_point center, selected_point *points, selected_point point_izq, selected_point point_der, selected_point point_sup, selected_point point_inf, enum Tipo_form type) {
    points_cluster new_cluster = {id, n_points, contour, center, points, point_izq, point_der, point_sup, point_inf, type};
    return new_cluster;

}

points_cluster *fill_clusters(selected_point **points, int size_x, int size_y, int n_clusters, double offset, double scale_factor) {
    int i, j, cluster_id, aux_cont;
    double x, y, z;
    points_cluster *clusters = (points_cluster *)malloc(n_clusters * sizeof(points_cluster));
    int *cluster_sizes = (int *)calloc(n_clusters, sizeof(int)), *cluster_indices = (int *)calloc(n_clusters, sizeof(int));

    // Contar el número de puntos en cada cluster
    for (i = 0; i < size_x; i++) 
        for (j = 0; j < size_y; j++) 
            if (points[i][j].cluster != -1 && points[i][j].type != NO_TYPE) 
                cluster_sizes[points[i][j].cluster]++;
            
        
    //Inicializar los clusters
    for(i=0; i<n_clusters; i++) {
        clusters[i].id = i;
        clusters[i].n_points = cluster_sizes[i];
        clusters[i].points = malloc(cluster_sizes[i] * sizeof(selected_point));
        clusters[i].contour = NC_MAX_INT;
        clusters[i].type = NO_TYPE;
        clusters[i].point_izq = create_selected_point(create_point(INF, INF), -1, NO_TYPE, -1);
        clusters[i].point_der = create_selected_point(create_point(-INF, -INF), -1, NO_TYPE, -1);
        clusters[i].point_sup = create_selected_point(create_point(-INF, INF), -1, NO_TYPE, -1);
        clusters[i].point_inf = create_selected_point(create_point(INF, -INF), -1, NO_TYPE, -1);
    }

    //Rellenar los clusters
    for(i=0; i<size_x; i++) {
        for(j=0; j<size_y; j++) {
            cluster_id = points[i][j].cluster;
            if(cluster_id != -1 && points[i][j].type != NO_TYPE) {
                clusters[cluster_id].points[cluster_indices[cluster_id]++] = points[i][j];

                //Actualizar los puntos de referencia
                if(points[i][j].point.lon < clusters[points[i][j].cluster].point_izq.point.lon)
                    clusters[cluster_id].point_izq = points[i][j];
                if(points[i][j].point.lon > clusters[points[i][j].cluster].point_der.point.lon)
                    clusters[cluster_id].point_der = points[i][j];
                if(points[i][j].point.lat > clusters[points[i][j].cluster].point_sup.point.lat)
                    clusters[cluster_id].point_sup = points[i][j];
                if(points[i][j].point.lat < clusters[points[i][j].cluster].point_inf.point.lat)
                    clusters[cluster_id].point_inf = points[i][j];

                //Actualizar el tipo del cluster
                clusters[cluster_id].type = points[i][j].type;

                //Actualizar el contorno del cluster
                aux_cont = (((points[i][j].z * scale_factor) + offset)/g_0) - ((int)(((points[i][j].z * scale_factor) + offset)/g_0) % CONTOUR_STEP);
                if(clusters[cluster_id].type == MAX) {
                    if(aux_cont < clusters[cluster_id].contour)
                        clusters[cluster_id].contour = aux_cont;
                } else {
                    if(clusters[cluster_id].contour == NC_MAX_INT)
                        clusters[cluster_id].contour = -NC_MAX_INT;
                    if(aux_cont > clusters[cluster_id].contour)
                        clusters[cluster_id].contour = aux_cont;
                }
            }
        }
    }

    //Calcular el centro de cada cluster
    for(i=0; i<n_clusters; i++) {
        x = 0, y = 0, z = 0;

        for(j=0; j<clusters[i].n_points; j++) {
            x += cos(clusters[i].points[j].point.lat* M_PI / 180) * cos(clusters[i].points[j].point.lon* M_PI / 180);
            y += cos(clusters[i].points[j].point.lat* M_PI / 180) * sin(clusters[i].points[j].point.lon* M_PI / 180);
            z += sin(clusters[i].points[j].point.lat* M_PI / 180);
        }
        x /= clusters[i].n_points;
        y /= clusters[i].n_points;
        z /= clusters[i].n_points;

        clusters[i].center.lat = round((atan2(z, sqrt(x*x + y*y)) * 180 / M_PI) / RES) * RES;
        clusters[i].center.lon = round((atan2(y, x) * 180 / M_PI) / RES) * RES;
    }

    free(cluster_sizes);
    free(cluster_indices);
    return clusters;
}

int compare_selected_points_lat(const void *a, const void *b) {
    selected_point *pointA = (selected_point *)a;
    selected_point *pointB = (selected_point *)b;
    
    return (pointA->point.lat > pointB->point.lat) ? 1 : (pointA->point.lat < pointB->point.lat) ? -1 : 0;
}


int compare_selected_points_lon(const void *a, const void *b) {
    selected_point *pointA = (selected_point *)a;
    selected_point *pointB = (selected_point *)b;
    
    return (pointA->point.lon > pointB->point.lon) ? 1 : (pointA->point.lon < pointB->point.lon) ? -1 : 0;
}
