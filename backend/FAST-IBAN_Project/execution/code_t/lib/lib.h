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
#include <limits.h>
#include <unistd.h>
#include <sys/utsname.h>



#if !defined(M_PI)
    #define M_PI 3.14159265358979323846
#endif

#define ERR(e) {if (e != NC_NOERR) {fprintf(stderr, "Error: %s\n", nc_strerror(e)); exit(EXIT_FAILURE);}}

#define ACTUAL_DIR "build"
#define DIR_PERMS 0777
// ALG-301 (L1): resolución de la rejilla en grados, leída del NetCDF en init_nc_variables.
// ponytail: exacta con pasos diádicos (0,25°, 0,5°, 1°); con pasos como 0,1° el redondeo de centroides
// depende del último bit del float.
extern double RES;
#define TOL_PASO 1e-4 // Tolerancia en grados al comprobar que el paso de la rejilla es uniforme (float32)

// ALG-302: índice de la fila de LAT_LIM_MIN en las latitudes del fichero; lo fija init_nc_variables.
extern int FILA_LAT_MIN;

#define LONG_NAME "long_name"
#define REC_NAME "time"
#define LAT_NAME "latitude"
#define LON_NAME "longitude"
#define T_NAME "t"
#define SCALE_FACTOR "scale_factor"
#define OFFSET "add_offset"

#define K_TO_C 273.15

// Cluster of a point that did not pass the temperature threshold: it belongs to no cluster (ALG-114).
#define NOT_SELECTED -2

// ALG-305 (L4): parámetros de la variante de temperatura, leídos de config/params.yaml por cargar_parametros y
// volcados en la cabecera del CSV. La unidad va en el nombre de cada campo.
typedef struct {
    double candidate_spacing_deg;    // espaciado de los puntos candidatos; múltiplo entero de RES
    double temperature_threshold_c;  // umbral estricto de selección
} parametros;
extern parametros PARAMS;
void cargar_parametros(const char *ruta);
int paso_candidatos(void);
void escribir_cabecera(FILE *fp);


extern int NTIME, NLAT, NLON, LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
extern char* FILE_NAME, *OUT_DIR_NAME;


typedef struct point{
    float lat;
    float lon;
} coord_point;

//Struct that holds a selected point.
typedef struct selected_point_list {
    coord_point point;
    short t;
    int cluster;
} selected_point;


void process_entry(int argc, char **argv);
void extract_nc_data(int ncid);
void init_nc_variables(int ncid, short*** t_in, float lats[NLAT], float lons[NLON], double *scale_factor, double *offset, char *long_name);
void check_coords(short*** z_in, float lons[NLON]);
void init_file(char* filename, char* long_name);
selected_point create_selected_point(coord_point point, short t,  int cluster);
coord_point create_point(float lat, float lon);
void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id, double eps);
int cluster_points(selected_point **filtered_points, int size_x, int size_y, double eps);
void write_selected_points(FILE *fp, selected_point **filtered_points, int size_x, int size_y, int n_clusters,
                           int time_step, double scale_factor, double offset);

#endif // LIB

