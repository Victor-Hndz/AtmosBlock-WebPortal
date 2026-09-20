#if !defined(CALC)
#define CALC

#include "utils.h"
#include "lib.h"


coord_point coord_from_great_circle(coord_point initial, double dist, double bearing);
bool bilinear_interpolation(coord_point p, short **z_mat, float *lats, float *lons, short *z_out);
void calcular_extremos_rayos(points_cluster *cluster, short **z_in, float *lats, float *lons, double scale_factor, double offset);
bool check_closed_contour(points_cluster cluster, int contour);
bool check_contour_dir_rex(points_cluster cluster, int contour, int dir_lat, int dir_lon);
bool check_contour_dir_omega(points_cluster cluster, int contour, int dir_lat, int dir_lon);
int niveles_hacia_el_polo(const points_cluster *cluster, double altura_centro, int *niveles, int max_niveles);
double distancia_al_meridiano(coord_point p, coord_point referencia);
bool minimo_rex_valido(points_cluster minimo, int contour, int abierto_alta);
int lado_del_minimo(coord_point maximo, coord_point minimo);
enum Tipo_form clasificar_candidato(coord_point p, short z0, short **z, float *lats, float *lons);
int lado_flanco_omega(coord_point maximo, coord_point minimo);
void search_formation(points_cluster *clusters, int size, short **z_in, float *lats, float *lons, double scale_factor, double offset, char* filename, int time);
double point_distance(coord_point a, coord_point b);
void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id);
double procesar_paso(int time, short **z, float *lats, float *lons, selected_point **puntos, int size_x, int size_y, int step,
                     double scale_factor, double offset, char *filename, char *filename2, char *speed_file, int n_hilos);
#endif // CALC