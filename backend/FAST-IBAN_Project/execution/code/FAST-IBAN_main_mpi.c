#include "libraries/lib.h"
#include "libraries/utils.h"
#include "libraries/calc.h"
#include "libraries/init.h"
#include <omp.h>
#include <mpi.h>


int main(int argc, char **argv) {
    int ncid, retval, i, j, k, time, lat, lon, size_x, size_y, step, bearing_count, bearing_count2, id, rank, size, time_start, time_end, base_chunk;
    double scale_factor, offset, t_ini, t_fin, t_total = 0.0;
    short z_aux_selected; bool interp_ok;
    short **z = NULL;
    int z_varid;
    bool swap_lon;
    char long_name[NC_MAX_NAME+1] = "";
    FILE *fp;
    selected_point **selected_points, **filtered_points;
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
    size_x = FILA_LAT_MIN/step + 1;  // ALG-302
    size_y = (int)((NLON)/step);

    selected_points = malloc((size_x)*sizeof(selected_point*));
    selected_points[0] = malloc(sizeof(selected_point)*size_x*size_y);
    
    filtered_points = calloc(size_x, sizeof(selected_point*));
    filtered_points[0] = calloc((size_t)size_x*size_y, sizeof(selected_point));

    for(i = 0; i < size_x; i++) {
        selected_points[i] = selected_points[0] + i * size_y;
        filtered_points[i] = filtered_points[0] + i * size_y;
    }


    if (z == NULL || z[0] == NULL || selected_points == NULL || selected_points[0] == NULL || filtered_points == NULL || filtered_points[0] == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }


    //Check the coordinates and correct them if necessary.
    swap_lon = check_coords(lons);

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

    //Loop for every z value.
    for (time=time_start; time<time_end; time++) {
        read_time_step(ncid, z_varid, time, swap_lon, z);  // ALG-204
        t_ini = omp_get_wtime();

        for(lat=0;lat<size_x;lat++) {
            printf("Processing time %d, lat %d\n", time, lat);
            for(lon=0;lon<size_y;lon++) {
                bearing_count = 0, bearing_count2 = 0;
                selected_points[lat][lon] = create_selected_point(create_point(lats[lat*step], lons[lon*step]), z[lat*step][lon*step], NO_TYPE, -1);

                for(i=0; i<PARAMS.n_rays;i++) {
                    interp_ok = bilinear_interpolation(coord_from_great_circle(create_point(lats[lat*step], lons[lon*step]), PARAMS.ray_distance_km, BEARING_START + i*BEARING_STEP), z, lats, lons, &z_aux_selected);
                    
                    //Si se sale de la zona delimitada por los límites de latitud y longitud , no se tiene en cuenta.
                    if(!interp_ok) {
                        bearing_count++;
                        continue;
                    }

                    if((((z[lat*step][lon*step] * scale_factor) + offset)/g_0) >= (((z_aux_selected * scale_factor) + offset)/g_0))
                        bearing_count++;
                    if((((z[lat*step][lon*step] * scale_factor) + offset)/g_0) <= (((z_aux_selected * scale_factor) + offset)/g_0))
                        bearing_count2++;                 
                }
                if(bearing_count >= (int)(PARAMS.n_rays*PARAMS.pass_fraction)) 
                    selected_points[lat][lon].type = MAX;
                else if(bearing_count2 >= (int)(PARAMS.n_rays*PARAMS.pass_fraction)) 
                    selected_points[lat][lon].type = MIN;
                filtered_points[lat][lon] = selected_points[lat][lon];
            }
        }

        t_fin = omp_get_wtime();
        printf("\n#2-%d. Filtrado y selección de máximos y mínimos realizada con éxito: %.6f s.\n", time, t_fin-t_ini);
        fp = fopen(speed_file, "a");
           fprintf(fp, "1,%d,%.3f\n", time, t_fin-t_ini);
        fclose(fp);
        t_total += (t_fin-t_ini);
        t_ini = omp_get_wtime();
        
        id=0;
        for(i=0; i<size_x;i++) {
            for(j=0; j< size_y;j++) {
                if(filtered_points[i][j].cluster == -1 && filtered_points[i][j].type != NO_TYPE) {
                    filtered_points[i][j].cluster = id;
                    expandCluster(filtered_points, size_x, size_y, i, j, id, RES*step);
                    id++;
                }
            }
        }

        points_cluster *clusters_aux = fill_clusters(filtered_points, size_x, size_y, id, offset, scale_factor);
        int clusters_cont=0;
        for(i=0;i<id;i++) 
            if(clusters_aux[i].point_sup.point.lat >= PARAMS.cluster_lat_max_deg || clusters_aux[i].point_sup.point.lat <= PARAMS.cluster_lat_min_deg || clusters_aux[i].n_points < PARAMS.min_cluster_points)
                clusters_cont++;

        points_cluster *clusters = malloc((id-clusters_cont)*sizeof(points_cluster));
        for(i=0, j=0;i<id;i++) {
            if(clusters_aux[i].point_sup.point.lat < PARAMS.cluster_lat_max_deg && clusters_aux[i].point_sup.point.lat > PARAMS.cluster_lat_min_deg && clusters_aux[i].n_points >= PARAMS.min_cluster_points) {
                clusters[j] = clusters_aux[i];
                clusters[j].id = j;
                
                for(k=0;k<clusters[j].n_points;k++) 
                    clusters[j].points[k].cluster = j;
                clusters[j].point_izq.cluster = j;
                clusters[j].point_der.cluster = j;
                clusters[j].point_sup.cluster = j;
                clusters[j].point_inf.cluster = j;
                j++;
            } else {
                free(clusters_aux[i].points);  // R5 (ALG-203): cluster descartado por el filtro
            }
        }
        free(clusters_aux);

        t_fin = omp_get_wtime();
        t_total += (t_fin-t_ini);
        t_ini = omp_get_wtime();


        search_formation(clusters, j, z, lats, lons, scale_factor, offset, filename2, time);
    
        t_fin = omp_get_wtime();
        printf("\n#4-%d. Búsqueda de formaciones realizada con éxito: %.6f s.\n", time, t_fin-t_ini);
        fp = fopen(speed_file, "a");
           fprintf(fp, "2,%d,%.3f\n", time, t_fin-t_ini);
        fclose(fp);
        t_total += (t_fin-t_ini);
        
        t_ini = omp_get_wtime();
        
        export_clusters_to_csv(clusters, j, filename, offset, scale_factor, time);
        
        t_fin = omp_get_wtime();
        printf("\n#5-%d. Archivo escrito con éxito: %.6f s.\n", time, t_fin-t_ini);
        t_total += (t_fin-t_ini);
        
        printf("Tiempo %d procesado.\n", time);
        for(i=0; i<j; i++)
            free(clusters[i].points);  // R5 (ALG-203)
        free(clusters);
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
    free(selected_points[0]);
    free(selected_points);
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
