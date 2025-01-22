#if !defined(CALC)
#define CALC

#include "utils.h"
#include "lib.h"


coord_point coord_from_great_circle(coord_point initial, double dist, double bearing);
short bilinear_interpolation(coord_point p, short **z_mat, float *lats, float *lons);
void generateDirections(int *dx, int *dy, int n_dirs);
bool check_contour_dir_rex(points_cluster cluster, int contour, int dir_lat, int dir_lon, short **z_in, float *lats, float *lons, double scale_factor, double offset);
bool check_contour_dir_omega(points_cluster cluster, int contour, int dir_lat, int dir_lon, short **z_in, float *lats, float *lons, double scale_factor, double offset);
void search_formation(points_cluster *clusters, int size, short **z_in, float *lats, float *lons, double scale_factor, double offset, char* filename, int time);
double point_distance(coord_point a, coord_point b);
void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id, double eps);
#endif // CALC