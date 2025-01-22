#include <assert.h>
#include "../libraries/lib.h"
#include "../libraries/utils.h"
#include "../libraries/calc.h"
#include "../libraries/init.h"

int main(void) {
    int retval, ncid, n_conts, prev_n_conts;
    double scale_factor, offset;
    float max_z = -INF, min_z = INF, cont;
    int max_cont, min_cont;
    double **contornos;
    char long_name[NC_MAX_NAME+1];
    FILE* file;

    // Open the file.
    if ((retval = nc_open("../data/geopot_500hPa_2019-06-26_00-06-12-18UTC.nc", NC_NOWRITE, &ncid)))
        ERR(retval)

    extract_nc_data(ncid);
    
    float lats[NLAT], lons[NLON];
    short (*z_in)[NLAT][NLON] = calloc(NTIME, sizeof(*z_in));
    float *cont_lat, *cont_lon;

    init_nc_variables(ncid, z_in, lats, lons, &scale_factor, &offset, long_name);    
    
    // Close the file.
    if ((retval = nc_close(ncid)))
        ERR(retval)

    check_coords(z_in, lats, lons);

    file = fopen("contours.csv", "w");
    fprintf(file, "time,contour,n_points,points\n");
    fclose(file);

    //find min and max z
    for (int time = 0; time < NTIME; time++) {
        n_conts = 0;
        max_z = -INF;
        min_z = INF;

        for (int lat = 0; lat < NLAT; lat++) {
            for (int lon = 0; lon < NLON; lon++) {
                if ((z_in[time][lat][lon]*scale_factor + offset)/g_0 > max_z)
                    max_z = ((z_in[time][lat][lon]*scale_factor + offset)/g_0);

                if ((z_in[time][lat][lon]*scale_factor + offset)/g_0 < min_z)
                    min_z = ((z_in[time][lat][lon]*scale_factor + offset)/g_0);
            }  
        }
        max_cont = max_z - ((int)max_z % 20);
        min_cont = min_z - ((int)min_z % 20);
        max_cont += 20;
        min_cont -= 20;
        
        printf("max: %f\n", max_z);
        printf("min: %f\n", min_z);
        printf("max_cont: %d\n", max_cont);
        printf("min_cont: %d\n", min_cont);

        int n_contornos = (max_cont - min_cont)/20;
        int c;

        contornos = malloc(n_contornos * sizeof(double*));
        float cont_aprox = INF;

        c = min_cont;
        for(int x=0; x<n_contornos; x++) {
            printf("Contorno %d\n", c);
            n_conts = 0;
            for (int lat = 0; lat < NLAT; lat++) {
                for (int lon = 0; lon < NLON; lon++) {
                    if (((z_in[time][lat][lon]*scale_factor + offset)/g_0) >= c && ((z_in[time][lat][lon]*scale_factor + offset)/g_0) < c+20) {
                        n_conts++;
                    }
                }
                // if(n_conts >= 8000)
                //     break;
            }
            
            printf("n_conts: %d\n", n_conts);
            prev_n_conts = n_conts;
            contornos[x] = malloc(n_conts * sizeof(double));
            cont_lat = malloc(n_conts * sizeof(float));
            cont_lon = malloc(n_conts * sizeof(float));
            printf("Memory allocated\n");

            for (int lat = 0; lat < NLAT; lat++) {
                for (int lon = 0; lon < NLON; lon++) {
                    if (((z_in[time][lat][lon]*scale_factor + offset)/g_0) >= c && ((z_in[time][lat][lon]*scale_factor + offset)/g_0) < c+20) {
                        contornos[x][n_conts-1] = ((z_in[time][lat][lon]*scale_factor + offset)/g_0);
                        cont_lat[n_conts-1] = lats[lat];
                        cont_lon[n_conts-1] = lons[lon];
                        n_conts--;
                    }

                }
                // if(n_conts == 0)
                //     break;
            }
            n_conts = prev_n_conts;
            printf("Escribiendo contorno %d\n", c);
            file = fopen("contours.csv", "a");
            fprintf(file, "%d,%d,%d,\"[", time, c, n_conts);

            for(int i=0; i<n_conts; i++) {
                fprintf(file, "(%.2f,%.2f,%.1f)", cont_lat[i], cont_lon[i], contornos[x][i]);
                if(i != n_conts-1)
                    fprintf(file, ",");
            }
            fprintf(file, "]\"\n");
            fclose(file);

            c += 20;
        }

        for(int i=0; i<n_contornos; i++)
            free(contornos[i]);
        free(contornos);
        free(cont_lat);
        free(cont_lon);

        printf("Time: %d\n", time);
    }

    free(z_in);
    
    printf("\033[0;32m");
    printf("\nTest passed.\n\n");
    printf("\033[0m");
    return 0;
}