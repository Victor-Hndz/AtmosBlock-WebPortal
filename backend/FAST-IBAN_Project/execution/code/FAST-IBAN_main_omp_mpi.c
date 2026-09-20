#include "libraries/lib.h"
#include "libraries/utils.h"
#include "libraries/calc.h"
#include "libraries/init.h"
#include <omp.h>
#include <mpi.h>


int main(int argc, char **argv) {
    int ncid, retval, i, j, time, size_x, size_y, step, rank, size, time_start, time_end, base_chunk;
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

    // Inicializar MPI
    MPI_Init(&argc, &argv);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    

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
    // ALG-206: solo el proceso 0 crea el directorio de salida y los CSV finales con su cabecera; el resto
    // recibe sus nombres. Cada proceso escribe su tramo de pasos en ficheros ".parteN" que el proceso 0
    // une en orden al terminar, así que la salida es idéntica a la de la versión en serie.
    if (rank == 0)
        init_files(filename, filename2, log_file, speed_file, long_name);
    char *salidas[4] = {filename, filename2, log_file, speed_file};
    char finales[4][NC_MAX_NAME+1];
    for (i = 0; i < 4; i++) {
        MPI_Bcast(salidas[i], NC_MAX_NAME+1, MPI_CHAR, 0, MPI_COMM_WORLD);
        memcpy(finales[i], salidas[i], NC_MAX_NAME+1);
        if (snprintf(salidas[i], NC_MAX_NAME+1, "%s.parte%d", finales[i], rank) >= NC_MAX_NAME+1) {
            fprintf(stderr, "Error: ruta de salida demasiado larga: %s\n", finales[i]);
            MPI_Abort(MPI_COMM_WORLD, EXIT_FAILURE);
        }
        fp = fopen(salidas[i], "w");
        if (fp == NULL) {
            perror("Error opening file");
            MPI_Abort(MPI_COMM_WORLD, EXIT_FAILURE);
        }
        fclose(fp);
    }
    

    t_fin = omp_get_wtime();
    printf("\n#1. Datos leídos e inicializados con éxito: %.6f s.\n", t_fin-t_ini);
    t_total += (t_fin-t_ini);

    fp = fopen(speed_file, "a");
    fprintf(fp, "init,-1,%.3f\n", t_fin-t_ini);
    fclose(fp);

    // Distribuir el trabajo entre los procesos MPI
    base_chunk = (NTIME / size);
    time_start = base_chunk * rank;
    time_end = (rank == size - 1) ? NTIME : base_chunk * (rank + 1);  // ALG-206: el último proceso se queda con los pasos sobrantes
    fp = fopen(log_file, "a");
    fprintf(fp, "Soy Rank: %d de Size: %d y voy de %d a %d.\n\n", rank, size, time_start, time_end);
    fclose(fp);

    // printf("Soy Rank: %d de Size: %d y voy de %d a %d.\n\n", rank, size, time_start, time_end);

    //Loop for every z value.
    for (time=time_start; time<time_end; time++) {
        read_time_step(ncid, z_varid, time, swap_lon, z);  // ALG-204
        t_total += procesar_paso(time, z, lats, lons, filtered_points, size_x, size_y, step, scale_factor, offset,
                                 filename, filename2, speed_file, N_THREADS);  // ALG-351
    }

    // ALG-206: tiempo total de este proceso en su parte; contadores sumados de todos los procesos; y unión
    // de las partes en orden de proceso (que es el orden temporal) antes de MPI_Finalize.
    fp = fopen(speed_file, "a");
    fprintf(fp, "total,-1,%.3f\n", t_total);
    fclose(fp);

    contadores_hilo propios = contadores_totales();
    long long locales[4] = {propios.findindex_calls, propios.findindex_misses, propios.interp_calls, propios.interp_fails};
    long long totales[4] = {0, 0, 0, 0};
    MPI_Reduce(locales, totales, 4, MPI_LONG_LONG, MPI_SUM, 0, MPI_COMM_WORLD);

    if (rank == 0) {
        char parte[NC_MAX_NAME+1], bufer[65536];
        size_t leidos;
        for (i = 0; i < 4; i++) {
            FILE *destino = fopen(finales[i], "a");
            if (destino == NULL) {
                perror("Error opening file");
                MPI_Abort(MPI_COMM_WORLD, EXIT_FAILURE);
            }
            for (j = 0; j < size; j++) {
                if (snprintf(parte, sizeof(parte), "%s.parte%d", finales[i], j) >= (int)sizeof(parte)) {
                    fprintf(stderr, "Error: ruta de salida demasiado larga: %s\n", finales[i]);
                    MPI_Abort(MPI_COMM_WORLD, EXIT_FAILURE);
                }
                FILE *origen = fopen(parte, "r");
                if (origen == NULL) {
                    perror("Error opening part file");
                    MPI_Abort(MPI_COMM_WORLD, EXIT_FAILURE);
                }
                while ((leidos = fread(bufer, 1, sizeof(bufer), origen)) > 0)
                    fwrite(bufer, 1, leidos, destino);
                fclose(origen);
                remove(parte);
            }
            fclose(destino);
        }
        fprintf(stderr, "findIndex: %lld fallos (-1) de %lld llamadas (%.2f %%)\n", totales[1], totales[0], 100.0 * totales[1] / totales[0]);
        fprintf(stderr, "bilinear_interpolation: %lld fallos (-1) de %lld llamadas (%.2f %%)\n", totales[3], totales[2], 100.0 * totales[3] / totales[2]);
    }
    MPI_Finalize();
    
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


    printf("\n\n*** SUCCESS reading the file %s and writing the data to %s! ***\n", FILE_NAME, OUT_DIR_NAME);
    printf("\n## Tiempo total de la ejecución: %.6f s.\n\n", t_total);
    return 0;
}
