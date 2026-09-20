#include "libraries/lib.h"
#include "libraries/utils.h"
#include "libraries/calc.h"
#include "libraries/init.h"
#include <omp.h>


int main(int argc, char **argv) {
    int ncid, retval, i, time, size_x, size_y, step;
    double scale_factor, offset, t_ini, t_fin, t_total = 0.0;
    short **z = NULL;
    int z_varid;
    bool swap_lon;
    char long_name[NC_MAX_NAME+1] = "";
    FILE *fp;
    selected_point **filtered_points;
    char *filename = malloc(sizeof(char)*(NC_MAX_NAME+1));
    char *filename2 = malloc(sizeof(char)*(NC_MAX_NAME+1));
    char *log_file = malloc(sizeof(char)*(NC_MAX_NAME+1));
    char *speed_file = malloc(sizeof(char)*(NC_MAX_NAME+1));

    if(filename == NULL || filename2 == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }
    

    t_ini = omp_get_wtime();

    //Process the entry arguments.
    process_entry(argc, argv);

    //Open the file.
    if ((retval = nc_open(FILE_NAME, NC_NOWRITE, &ncid)))
        ERR(retval)

    //Extract the names and limits of the variables from the netcdf file.
    extract_nc_data(ncid);
    

    float lats[NLAT], lons[NLON];

    // ALG-301: las coordenadas se leen antes de dimensionar la rejilla, porque RES sale de ellas.
    z_varid = init_nc_variables(ncid, lats, lons, &scale_factor, &offset, long_name);

    //Allocate contiguous memory for the data.
    // ALG-204: memoria para un solo paso temporal; el fichero se lee paso a paso.
    z = malloc(NLAT*sizeof(short*));
    z[0] = malloc(sizeof(short)*NLAT*NLON);
    
    for(i = 0; i < NLAT; i++) 
        z[i] = z[0] + i * NLON;

    step = paso_candidatos();  // ALG-305
    size_x = (FILA_LAT_MIN - FILA_LAT_INICIO)/step + 1;  // ALG-302, ALG-374
    swap_lon = check_coords(lons);  // ALG-369: antes de elegir las columnas de candidatos
    size_y = columnas_candidatas(lons, step);

    
    filtered_points = calloc(size_x, sizeof(selected_point*));
    filtered_points[0] = calloc((size_t)size_x*size_y, sizeof(selected_point));

    for(i = 0; i < size_x; i++) {
        filtered_points[i] = filtered_points[0] + i * size_y;
    }


    if (z == NULL || z[0] == NULL || filtered_points == NULL || filtered_points[0] == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }




    //Initialize the output files.
    init_files(filename, filename2, log_file, speed_file, long_name);
    

    t_fin = omp_get_wtime();
    printf("\n#1. Datos leídos e inicializados con éxito: %.6f s.\n", t_fin-t_ini);
    t_total += (t_fin-t_ini);

    fp = fopen(speed_file, "a");
    fprintf(fp, "init,-1,%.3f\n", t_fin-t_ini);
    fclose(fp);

    //Loop for every z value.
    for (time=0; time<NTIME; time++) {
        read_time_step(ncid, z_varid, time, swap_lon, z);  // ALG-204
        t_total += procesar_paso(time, z, lats, lons, filtered_points, size_x, size_y, step, scale_factor, offset,
                                 filename, filename2, speed_file, N_THREADS);  // ALG-351
    }

    fp = fopen(speed_file, "a");
        fprintf(fp, "total,-1,%.3f\n", t_total);
    fclose(fp);

    // Close the file (ALG-204: it stays open to read each time step).
    if ((retval = nc_close(ncid)))
        ERR(retval)

    free(z[0]);
    free(filtered_points[0]);
    free(filtered_points);
    free(z);
    free(filename);
    free(filename2);
    free(speed_file);
    free(log_file);

    contadores_hilo total = contadores_totales();
    fprintf(stderr, "findIndex: %lld fallos (-1) de %lld llamadas (%.2f %%)\n", total.findindex_misses, total.findindex_calls, 100.0 * total.findindex_misses / total.findindex_calls);
    fprintf(stderr, "bilinear_interpolation: %lld fallos (-1) de %lld llamadas (%.2f %%)\n", total.interp_fails, total.interp_calls, 100.0 * total.interp_fails / total.interp_calls);

    printf("\n\n*** SUCCESS reading the file %s and writing the data to %s! ***\n", FILE_NAME, OUT_DIR_NAME);
    printf("\n## Tiempo total de la ejecución: %.6f s.\n\n", t_total);
    return 0;
}
