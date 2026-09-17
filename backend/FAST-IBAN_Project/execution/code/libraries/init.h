#if !defined(INIT)
#define INIT

#include "lib.h"
#include <limits.h>
#include <unistd.h>
#include <sys/utsname.h>

void cargar_parametros(const char *ruta);
void calcular_dominio_latitudes(void);
int paso_candidatos(void);
void escribir_cabecera(FILE *fp);
void process_entry(int argc, char **argv);
void init_files(char* filename, char* filename2, char* log_file, char* speed_file, char* long_name);
bool check_coords(float lons[NLON]);
void extract_nc_data(int ncid);
int init_nc_variables(int ncid, float lats[NLAT], float lons[NLON], double *scale_factor, double *offset, char *long_name);
void read_time_step(int ncid, int z_varid, int time, bool swap_lon, short **z);
#endif // INIT
