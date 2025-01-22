#include "libraries/lib.h"
#include "libraries/utils.h"
#include "libraries/calc.h"
#include "libraries/init.h"
#include <omp.h>


int main(int argc, char **argv) {
    int ncid, retval, i, j, k, time, size_x, size_y, step, id, chunk_size;
    double scale_factor, offset, t_ini, t_fin, t_total;
    short ***z_in;
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
    

    t_ini = omp_get_wtime();

    //Process the entry arguments.
    process_entry(argc, argv);

    //Open the file.
    if ((retval = nc_open(FILE_NAME, NC_NOWRITE, &ncid)))
        ERR(retval)

    //Extract the names and limits of the variables from the netcdf file.
    extract_nc_data(ncid);
    

    float lats[NLAT], lons[NLON];

    //Allocate contiguous memory for the data.
    z_in = malloc(NTIME*sizeof(short**));
    z_in[0] = malloc(NTIME*NLAT*sizeof(short*));
    z_in[0][0] = malloc(NTIME*NLAT*NLON*sizeof(short));
    
    for(i = 0; i < NTIME; i++) 
        z_in[i] = z_in[0] + i * NLAT;
    
    for(i = 0; i < NTIME * NLAT; i++) 
        z_in[0][i] = z_in[0][0] + i * NLON;

    step = STEP;
    size_x = (int)((FILT_LAT(LAT_LIM_MIN))/step)+1;
    size_y = (int)((NLON)/step);

    //Chumk paralelo
    chunk_size = (size_x + N_THREADS - 1) / N_THREADS; // Redondea hacia arriba

    selected_points = malloc((size_x)*sizeof(selected_point*));
    selected_points[0] = malloc((size_x*size_y)*sizeof(selected_point));
    
    filtered_points = calloc(size_x, sizeof(selected_point*));
    filtered_points[0] = calloc(size_x*size_y, sizeof(selected_point));

    for(i = 0; i < size_x; i++) {
        selected_points[i] = selected_points[0] + i * size_y;
        filtered_points[i] = filtered_points[0] + i * size_y;
    }


    if (z_in == NULL || z_in[0] == NULL || z_in[0][0] == NULL || selected_points == NULL || selected_points[0] == NULL || filtered_points == NULL || filtered_points[0] == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }


    //Extract the data from the netcdf file.
    init_nc_variables(ncid, z_in, lats, lons, &scale_factor, &offset, long_name);    

    // Close the file.
    if ((retval = nc_close(ncid)))
        ERR(retval)

    //Check the coordinates and correct them if necessary.
    check_coords(z_in, lats, lons);

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
        t_ini = omp_get_wtime();
        #pragma omp parallel num_threads(N_THREADS) shared(z_in, lats, lons, size_x, size_y, time, selected_points, filtered_points, step, scale_factor, offset, chunk_size) default(none)
        {
            int lat, lon, it, bearing_count, bearing_count2;
            short z_aux_selected;

            #pragma omp for schedule(dynamic, 2)
            for(lat=0;lat<size_x;lat++) {
                printf("Processing time %d, lat %d\n", time, lat);
                for(lon=0;lon<size_y;lon++) {
                    bearing_count = 0, bearing_count2 = 0;
                    selected_points[lat][lon] = create_selected_point(create_point(lats[lat*step], lons[lon*step]), z_in[time][lat*step][lon*step], NO_TYPE, -1);

                    for(it=0; it<N_BEARINGS*2;it++) {
                        z_aux_selected = bilinear_interpolation(coord_from_great_circle(create_point(lats[lat*step], lons[lon*step]), DIST, BEARING_START + it*BEARING_STEP), z_in[time], lats, lons);
                        
                        //Si se sale de la zona delimitada por los límites de latitud y longitud , no se tiene en cuenta.
                        if(z_aux_selected == -1) {
                            bearing_count++;
                            continue;
                        }

                        if((((z_in[time][lat*step][lon*step] * scale_factor) + offset)/g_0) >= (((z_aux_selected * scale_factor) + offset)/g_0))
                            bearing_count++;
                        if((((z_in[time][lat*step][lon*step] * scale_factor) + offset)/g_0) <= (((z_aux_selected * scale_factor) + offset)/g_0))
                            bearing_count2++;                 
                    }
                    if(bearing_count >= (int)(N_BEARINGS*2*PASS_PERCENT)) 
                        selected_points[lat][lon].type = MAX;
                    else if(bearing_count2 >= (int)(N_BEARINGS*2*PASS_PERCENT)) 
                        selected_points[lat][lon].type = MIN;
                    filtered_points[lat][lon] = selected_points[lat][lon];
                }
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
            if(clusters_aux[i].point_sup.point.lat >= 85.00 || clusters_aux[i].point_sup.point.lat <= 30.00 || clusters_aux[i].n_points == 1)
                clusters_cont++;

        points_cluster *clusters = malloc((id-clusters_cont)*sizeof(points_cluster));
        for(i=0, j=0;i<id;i++) {
            if(clusters_aux[i].point_sup.point.lat < 85.00 && clusters_aux[i].point_sup.point.lat > 30.00 && clusters_aux[i].n_points != 1) {
                clusters[j] = clusters_aux[i];
                clusters[j].id = j;
                
                for(k=0;k<clusters[j].n_points;k++) 
                    clusters[j].points[k].cluster = j;
                clusters[j].point_izq.cluster = j;
                clusters[j].point_der.cluster = j;
                clusters[j].point_sup.cluster = j;
                clusters[j].point_inf.cluster = j;
                j++;
            }
        }
        free(clusters_aux);

        t_fin = omp_get_wtime();
        t_total += (t_fin-t_ini);
        t_ini = omp_get_wtime();


        search_formation(clusters, j, z_in[time], lats, lons, scale_factor, offset, filename2, time);
    
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
        free(clusters);
    }

    fp = fopen(speed_file, "a");
        fprintf(fp, "total,-1,%.3f\n", t_total);
    fclose(fp);

    free(z_in[0][0]);
    free(z_in[0]);
    free(selected_points[0]);
    free(selected_points);
    free(filtered_points[0]);
    free(filtered_points);
    free(z_in);
    free(filename);
    free(filename2);
    free(speed_file);
    free(log_file);

    printf("\n\n*** SUCCESS reading the file %s and writing the data to %s! ***\n", FILE_NAME, OUT_DIR_NAME);
    printf("\n## Tiempo total de la ejecución: %.6f s.\n\n", t_total);
    return 0;
}
