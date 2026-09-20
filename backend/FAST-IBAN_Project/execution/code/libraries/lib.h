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

// ALG-301 (L1): resolución de la rejilla en grados, leída del NetCDF en init_nc_variables.
// ponytail: exacta con pasos diádicos (0,25°, 0,5°, 1°); con pasos como 0,1° el ajuste de esquinas de
// bilinear_interpolation (fmod == 0) y el redondeo de centroides dependen del último bit del float.
extern double RES;
#define TOL_PASO 1e-4 // Tolerancia en grados al comprobar que el paso de la rejilla es uniforme (float32)

// #define LAT_LIM 25
// ALG-302: índice de la fila de LAT_LIM_MIN en las latitudes del fichero; lo fija init_nc_variables.
extern int FILA_LAT_MIN;
// ALG-374: dominio de análisis en latitud. El límite hacia el ecuador es el de menor |lat| y hacia el polo no se
// recorta (el filtro polar de clusters es cluster_lat_max_deg); si el dominio cruza el ecuador, limitan los dos.
extern int DOM_LAT_MIN, DOM_LAT_MAX, FILA_LAT_INICIO, COL_LON_INICIO;
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
// ALG-305 (L4): parámetros del detector, leídos de config/params.yaml por cargar_parametros (init.c) y volcados en la
// cabecera de cada CSV. La unidad va en el nombre de cada campo.
typedef struct {
    double candidate_spacing_deg;  // espaciado de los puntos candidatos; múltiplo entero de RES
    int n_rays;                    // rayos de círculo máximo por punto; múltiplo de 8
    double ray_distance_km;        // longitud de cada rayo
    double pass_fraction;          // fracción de rayos por debajo (MAX) o por encima (MIN) del punto
    int contour_step_m;            // separación entre contornos, en altura geopotencial
    double search_radius_km;       // radio de búsqueda de contornos y de emparejamiento máximo-mínimos
    double contour_ray_step_km;    // paso de muestreo de los rayos geodésicos de contorno (ALG-360)
    double cluster_lat_min_deg;    // el punto más al norte de un cluster debe quedar por encima (estricto)
    double cluster_lat_max_deg;    // y por debajo (estricto) de estas latitudes
    double min_cluster_area_km2;   // área mínima de un cluster, suma de R²·Δλ·Δφ·cos φ de sus celdas (ALG-306)
    double rex_max_offset_km;      // distancia máxima del mínimo de un Rex al meridiano del máximo (ALG-364)
} parametros;
extern parametros PARAMS;

#define BEARING_STEP (360.0 / PARAMS.n_rays) // Bearing step in degrees (5.625 for 64 rays; B2: was integer division = 5)
#define BEARING_START (-180) // Bearing start in degrees to use in the great circle method
#define INF (1.0E+30)

#define EXTRA_STR_SIZE 25

extern int NTIME, NLAT, NLON, LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
extern char* FILE_NAME, *OUT_DIR_NAME;
// ALG-005: diagnóstico de findIndex == -1 (B1); se imprimen por stderr al terminar.
// ALG-208: un contador por hilo, sin "omp atomic" en el camino caliente (frenaba el escalado de
// la fase 1). Cada entrada ocupa su propia línea de caché para que los hilos no se estorben;
// contadores_totales() los suma al terminar, con el mismo resultado exacto.
// Tabla fija, una entrada por hilo: process_entry rechaza más de MAX_HILOS_CONTADORES hilos (ALG-354), así que dos hilos
// nunca comparten entrada.
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
enum Tipo_block{OMEGA, REX, POLAR_HIGH, NO_BLOCK};

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
    bool truncada;  // ALG-376: algún cluster de la formación tiene rayos de contorno cortados por el borde del fichero
} formation;

typedef struct cluster {
    int id, n_points, contour;
    coord_point center;
    selected_point *points;
    selected_point point_izq, point_der, point_sup, point_inf;
    enum Tipo_form type;
    double *extremos;  // ALG-360: extremo de altura de cada rayo geodésico (calcular_extremos_rayos); NULL fuera de search_formation
    double extremo_polo;  // ALG-363: extremo del rayo hacia el polo solo hasta el polo; delimita los niveles de contorno
    double area_km2;      // ALG-306: área del cluster, suma de las áreas de sus celdas de candidatos (fill_clusters)
    bool truncado;        // ALG-376: algún rayo de contorno se quedó sin datos en el borde del fichero (calcular_extremos_rayos)
} points_cluster;

// ALG-303 (L2): hemisferio de una latitud (+1 norte, -1 sur). Las comparaciones de latitud usan hemi·lat, nunca el HN.
static inline int hemisferio(double lat) {
    return lat < 0 ? -1 : 1;
}

// ALG-303: latitud absoluta del punto del cluster más cercano a su polo (el más al norte en el HN, el más al sur en el HS).
static inline double lat_polar_cluster(const points_cluster *c) {
    return hemisferio(c->center.lat) > 0 ? c->point_sup.point.lat : -c->point_inf.point.lat;
}

// ALG-304: el cluster queda fuera del filtro de latitud: su punto más cercano al polo no está por encima (estricto) de
// cluster_lat_min_deg o, si hay límite polar (cluster_lat_max_deg < 90), no está por debajo (estricto) de él.
static inline bool fuera_de_latitudes(const points_cluster *c) {
    double lat = lat_polar_cluster(c);
    return lat <= PARAMS.cluster_lat_min_deg || (PARAMS.cluster_lat_max_deg < 90 && lat >= PARAMS.cluster_lat_max_deg);
}

// ALG-310: latitud a partir de la cual la circunferencia de rayos (radio ray_distance_km) envuelve el polo y la
// lógica direccional degenera: 90 − (ray_distance_km/R)·180/π, unos 85,50° con 500 km.
static inline double guarda_polar_deg(void) { return 90 - PARAMS.ray_distance_km / R * 180 / M_PI; }


// Functions
coord_point create_point(float lat, float lon);
selected_point create_selected_point(coord_point point, short z, enum Tipo_form type, int cluster);
formation create_formation(int max_id, int min1_id, int min2_id, enum Tipo_block type, bool truncada);
points_cluster create_cluster(int id, int n_points, int contour, coord_point center, selected_point *points, selected_point point_izq, selected_point point_der, selected_point point_sup, selected_point point_inf, enum Tipo_form type);
double area_celda_km2(double lat_deg, double paso_deg);
points_cluster *fill_clusters(selected_point **points, int size_x, int size_y, int n_clusters, double offset, double scale_factor);
int compare_selected_points_lat(const void *a, const void *b);
int compare_selected_points_lon(const void *a, const void *b);

#endif // LIB
