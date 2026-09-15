#if !defined(LIB)
    #define LIB

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <netcdf.h>
#include <sys/stat.h>
#include <math.h>
#include <time.h>
#include <stdbool.h>

/*DEFINES*/

#if !defined(M_PI)
    #define M_PI 3.14159265358979323846
#endif


// Handle errors by printing an error message and exiting with a non-zero status.
#define ERR(e) {if (e != NC_NOERR) {fprintf(stderr, "Error: %s\n", nc_strerror(e)); exit(EXIT_FAILURE);}}

#define RES 0.25 // Resolution of the map in degrees

// #define LAT_LIM 25
#define FILT_LAT(g) (360-(g) / RES)
#define REC_NAME "time"
#define LAT_NAME "latitude"
#define LON_NAME "longitude"
#define Z_NAME "z"

#define SCALE_FACTOR "scale_factor"
#define OFFSET "add_offset"
#define LONG_NAME "long_name"

#define CONFIG_DIR_NAME "config/"
#define CONFIG_FILE_NAME_LIN "config.yaml"
#define CONFIG_FILE_NAME_WIN "config.conf"
#define ACTUAL_DIR "build"


#define g_0 9.80665 // Standard gravity in m/s^2
#define R 6371 // Earth's radius in km
#define STEP 5 // Number of neighbours to use in the res. change
#define N_BEARINGS 32 // Number of bearings to use in the great circle method
#define DIST 500 // Distance in km to use in the great circle method
#define PASS_PERCENT 0.9 // Percentage of points to pass in the bearing method
#define BEARING_STEP (360.0/(N_BEARINGS*2)) // Bearing step in degrees (5.625 for 64 rays; B2: was integer division = 5)
#define BEARING_START (-180) // Bearing start in degrees to use in the great circle method
#define CONTOUR_STEP 20
#define INF (1.0E+30)

#define EXTRA_STR_SIZE 25

extern int NTIME, NLAT, NLON, LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
extern char* FILE_NAME, *OUT_DIR_NAME;
// ALG-005: diagnóstico de findIndex == -1 (B1); se imprimen por stderr al terminar.
// ALG-208: un contador por hilo, sin "omp atomic" en el camino caliente (frenaba el escalado de
// la fase 1). Cada entrada ocupa su propia línea de caché para que los hilos no se estorben;
// contadores_totales() los suma al terminar, con el mismo resultado exacto.
// ponytail: tabla fija; con más de MAX_HILOS_CONTADORES hilos dos comparten entrada y el total
// podría perder incrementos (solo el diagnóstico, nunca las detecciones).
#include <omp.h>
#define MAX_HILOS_CONTADORES 256
typedef struct {
    _Alignas(64) long long findindex_calls;
    long long findindex_misses, interp_calls, interp_fails;
} contadores_hilo;
extern contadores_hilo CONTADORES[MAX_HILOS_CONTADORES];
#define CONTADOR_HILO() (CONTADORES[omp_get_thread_num() % MAX_HILOS_CONTADORES])
contadores_hilo contadores_totales(void);

/*STRUCTS*/
enum Tipo_form{MAX, MIN, NO_TYPE};
enum Tipo_block{OMEGA, REX, NO_BLOCK};

//Struct that holds a point (lat, lon).
typedef struct point{
    float lat;
    float lon;
} coord_point;

//Struct that holds a selected point.
typedef struct selected_point_list {
    coord_point point;
    short z;
    enum Tipo_form type;
    int cluster;
} selected_point;

typedef struct formation_list {
    int max_id, min1_id, min2_id;
    enum Tipo_block type;
} formation;

typedef struct cluster {
    int id, n_points, contour;
    coord_point center;
    selected_point *points;
    selected_point point_izq, point_der, point_sup, point_inf;
    enum Tipo_form type;
} points_cluster;


// Functions
coord_point create_point(float lat, float lon);
selected_point create_selected_point(coord_point point, short z, enum Tipo_form type, int cluster);
formation create_formation(int max_id, int min1_id, int min2_id, enum Tipo_block type);
points_cluster create_cluster(int id, int n_points, int contour, coord_point center, selected_point *points, selected_point point_izq, selected_point point_der, selected_point point_sup, selected_point point_inf, enum Tipo_form type);
points_cluster *fill_clusters(selected_point **points, int size_x, int size_y, int n_clusters, double offset, double scale_factor);
int compare_selected_points_lat(const void *a, const void *b);
int compare_selected_points_lon(const void *a, const void *b);

#endif // LIB
