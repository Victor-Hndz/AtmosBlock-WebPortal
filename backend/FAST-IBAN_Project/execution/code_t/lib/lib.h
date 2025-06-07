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

#define ACTUAL_DIR "execution"
#define DIR_PERMS 0777
#define RES 0.25 // Resolution of the map in degrees

#define FILT_LAT(g) (360-(g) / RES)

#define OUT_DIR_NAME "out/"

#define LONG_NAME "long_name"
#define REC_NAME "time"
#define LAT_NAME "latitude"
#define LON_NAME "longitude"
#define T_NAME "t"
#define SCALE_FACTOR "scale_factor"
#define OFFSET "add_offset"

#define K_TO_C 273.15


extern int NTIME, NLAT, NLON, LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
extern char* FILE_NAME;


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
void check_coords(short*** z_in, float lats[NLAT], float lons[NLON]);
void init_file(char* filename, char* long_name);
selected_point create_selected_point(coord_point point, short t,  int cluster);
coord_point create_point(float lat, float lon);
void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id, double eps);

#endif // LIB

