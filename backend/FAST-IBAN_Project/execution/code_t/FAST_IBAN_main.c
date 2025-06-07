#include "lib/lib.h"

int main(int argc, char **argv) {
    int ncid, retval, i, j, k, time, lat, lon, size_x, size_y, step, id;
    double scale_factor, offset;
    short ***t_in = NULL;
    char long_name[NC_MAX_NAME+1] = "";
    FILE *fp = NULL;
    selected_point **filtered_points = NULL;
    char *filename = malloc(sizeof(char)*(NC_MAX_NAME+1));

    if(filename == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }

    //Process the entry arguments.
    process_entry(argc, argv);

    //Open the file.
    if ((retval = nc_open(FILE_NAME, NC_NOWRITE, &ncid)))
        ERR(retval)

    //Extract the names and limits of the variables from the netcdf file.
    extract_nc_data(ncid);
    
    printf("\n#0. Successfully opened the file %s.\n", FILE_NAME);

    float lats[NLAT], lons[NLON];

    //Allocate contiguous memory for the data.
    t_in = malloc(NTIME*sizeof(short**));
    t_in[0] = malloc(NTIME*NLAT*sizeof(short*));
    t_in[0][0] = malloc(NTIME*NLAT*NLON*sizeof(short));
    
    for(i = 0; i < NTIME; i++) 
        t_in[i] = t_in[0] + i * NLAT;
    
    for(i = 0; i < NTIME * NLAT; i++) 
        t_in[0][i] = t_in[0][0] + i * NLON;

    step = 3;
    size_x = (int)((FILT_LAT(LAT_LIM_MIN))/step)+1;
    size_y = (int)((NLON)/step);
    
    filtered_points = calloc(size_x, sizeof(selected_point*));
    filtered_points[0] = calloc(size_x*size_y, sizeof(selected_point));

    for(i = 0; i < size_x; i++) 
        filtered_points[i] = filtered_points[0] + i * size_y;

    
    if (t_in == NULL || t_in[0] == NULL || t_in[0][0] == NULL || filtered_points == NULL || filtered_points[0] == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }


    //Extract the data from the netcdf file.
    init_nc_variables(ncid, t_in, lats, lons, &scale_factor, &offset, long_name);   

    // Close the file.
    if ((retval = nc_close(ncid)))
        ERR(retval)

    //Check the coordinates and correct them if necessary.
    check_coords(t_in, lats, lons);

    //Initialize the output files.
    init_file(filename, long_name);
    
    printf("\n#1. Data successfully read and initialized.\n");

    printf("Size_x: %d, Size_y: %d\n", size_x, size_y);
    //Loop for every t value.
    for (time=0; time<NTIME; time++) { 
        for(lat=0;lat<size_x;lat++) {
            // printf("Processing time %d, lat %d\n", time, lat);
            for(lon=0;lon<size_y;lon++) {
                filtered_points[lat][lon] = create_selected_point(create_point(-1, -1), -1, -1);
                if (t_in[time][lat*step][lon*step]*scale_factor+offset-K_TO_C > 28) {
                    filtered_points[lat][lon] = create_selected_point(create_point(lats[lat*step], lons[lon*step]), t_in[time][lat*step][lon*step], -1);
                }
            }
        }
        printf("\n#2. Successful filtering and selection of T.\n");

        
        id=0;
        for(i=0; i<size_x;i++) {
            for(j=0; j< size_y;j++) {
                if(filtered_points[i][j].cluster == -1) {
                    filtered_points[i][j].cluster = id;
                    expandCluster(filtered_points, size_x, size_y, i, j, id, step);
                    id++;
                }
            }
        }
        printf("\n#3. Successful clustering.\n");
        
        fp = fopen(filename, "a");
        for(i=0; i<id; i++) {
            for(i=0; i<size_x;i++) {
                for(j=0; j< size_y;j++) {
                    if (filtered_points[i][j].cluster != -1 && filtered_points[i][j].point.lat != -1 && filtered_points[i][j].point.lon != -1) {
                        //time,latitude,longitude,t,cluster,centroid_lat,centroid_lon
                        fprintf(fp, "%d,%.2f,%.2f,%.2f,%d,%.2f,%.2f\n", time, filtered_points[i][j].point.lat, filtered_points[i][j].point.lon, filtered_points[i][j].t*scale_factor+offset-K_TO_C, i, filtered_points[i][j].point.lat, filtered_points[i][j].point.lon);
                    }
                }
            }
        }
        fclose(fp);
        
        printf("\n#4. Successfully written file.\n");        
        printf("Time %d processed.\n", time);
    }

    free(t_in[0][0]);
    free(t_in[0]);
    free(filtered_points[0]);
    free(filtered_points);
    free(t_in);
    free(filename);

    printf("\n\n*** SUCCESS reading the file %s and writing the data to %s! ***\n", FILE_NAME, OUT_DIR_NAME);
    return 0;
}
