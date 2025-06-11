#include "lib.h"

int NTIME, NLAT, NLON, LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
char* FILE_NAME, *OUT_DIR_NAME;

void process_entry(int argc, char **argv) {
    char cwd[NC_MAX_CHAR];
    char file_path[NC_MAX_CHAR];
    char* error_catcher_char;
    int error_catcher_int;
    error_catcher_char = getcwd(cwd, sizeof(cwd));

    //extract the last part of the path
    char *p = strrchr(cwd, '/');
    p == NULL ? p = cwd : p++;
    if(strcmp(p, ACTUAL_DIR) == 0) {
        error_catcher_int = chdir("../../");
        error_catcher_char = getcwd(cwd, sizeof(cwd));
    }

    if (argc != 8) {
        //FILE_NAME = "config/data/geopot_500hPa_2019-06-26_00-06-12-18UTC.nc";
        //FILE_NAME = "config/data/geopot_500hPa_2003-08-(01-15)_00-06-12-18UTC.nc";
        // FILE_NAME = "config/data/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc";
        // FILE_NAME = "config/data/temp_850hPa_2019-06-(23-30)_00-06-12-18UTC.nc";
        FILE_NAME = "config/data/temp_850hPa_2024-10-29_18UTC.nc";
        LAT_LIM_MIN = 25;
        LAT_LIM_MAX = 85;
        LON_LIM_MIN = -180;
        LON_LIM_MAX = 180;
        OUT_DIR_NAME = "out/";
        N_THREADS = 1;
    } else {
        FILE_NAME = argv[1];
        LAT_LIM_MIN = atoi(argv[2]);
        LAT_LIM_MAX = atoi(argv[3]);
        LON_LIM_MIN = atoi(argv[4]);
        LON_LIM_MAX = atoi(argv[5]);
        OUT_DIR_NAME = argv[6];
        N_THREADS = atoi(argv[7]);

        printf("FILE_NAME: %s\n", FILE_NAME);
        printf("OUT_DIR_NAME: %s\n", OUT_DIR_NAME);

        if(strlen(FILE_NAME) > 255) {
            printf("Error: El nombre del archivo es demasiado largo.\n");
            exit(1);
        }

        if(LAT_LIM_MIN < -90 || LAT_LIM_MIN > 90 || LAT_LIM_MAX < -90 || LAT_LIM_MAX > 90 || LAT_LIM_MIN > LAT_LIM_MAX) {
            printf("Error: Los límites de latitud son incorrectos.\n");
            exit(1);
        }

        if(LON_LIM_MIN < -180 || LON_LIM_MIN > 180 || LON_LIM_MAX < -180 || LON_LIM_MAX > 180 || LON_LIM_MIN > LON_LIM_MAX) {
            printf("Error: Los límites de longitud son incorrectos.\n");
            exit(1);
        }

        if(N_THREADS <= 0) {
            printf("Error: El número de hilos no puede ser menor de 1.\n");
            exit(1);
        }
    }
}

void extract_nc_data(int ncid) {
    int i, num_vars, varid, vartype, ndims, natts;
    int dimids[NC_MAX_VAR_DIMS];
    size_t var_size;
    char varname[NC_MAX_NAME + 1];

    printf("Extrayendo datos del archivo NetCDF: %s\n", FILE_NAME);

    // Obtener el número de variables en el archivo
    int retval = nc_inq_nvars(ncid, &num_vars);
    if (retval != NC_NOERR) {
        fprintf(stderr, "Error al obtener el número de variables: %s\n", nc_strerror(retval));
        return;
    }

    // printf("Número de variables en el archivo: %d\n", num_vars);

    // Iterar sobre todas las variables y obtener información sobre cada una
    for (varid = 0; varid < num_vars; varid++) {
        // printf("Procesando variable con ID %d...\n", varid);
        // Obtener información sobre la variable
        retval = nc_inq_var(ncid, varid, varname, &vartype, &ndims, dimids, &natts);
        if (retval != NC_NOERR) {
            fprintf(stderr, "Error al obtener información sobre la variable %d: %s\n", varid, nc_strerror(retval));
            continue;
        }

        // Obtener el tamaño total de la variable multiplicando el tamaño de cada dimensión
        var_size = 1;
        for (i = 0; i < ndims; i++) {
            size_t dim_size;
            retval = nc_inq_dimlen(ncid, dimids[i], &dim_size);
            if (retval != NC_NOERR) {
                fprintf(stderr, "Error al obtener el tamaño de la dimensión %d: %s\n", i, nc_strerror(retval));
                return;
            }
            var_size *= dim_size;
        }

        if(var_size > INT_MAX) {
            printf("ERROR: el tamaño de la variable %s con ID %d, supera el tamaño máximo de un entero.\n", varname, varid);
            return;
        }

        if(strcmp(varname, LON_NAME) == 0) NLON = (int)var_size;
        else if(strcmp(varname, LAT_NAME) == 0) NLAT = (int)var_size;
        else if(strcmp(varname, REC_NAME) == 0) NTIME = (int)var_size;
        else if(strcmp(varname, T_NAME) == 0) continue;        
        else {
            printf("Error: Variable %d: Nombre=%s, Tipo=%d, Número de dimensiones=%d, Tamaño=%zu\n", varid, varname, vartype, ndims, var_size);
        }
    }
    printf("NLON: %d, NLAT: %d, NTIME: %d\n", NLON, NLAT, NTIME);
}

void init_nc_variables(int ncid, short*** t_in, float lats[NLAT], float lons[NLON], double *scale_factor, double *offset, char *long_name) {
    int retval, lat_varid, lon_varid, t_varid;

    printf("Extrayendo variables del archivo NetCDF: %s\n", FILE_NAME);
    
    // Get the varids of the latitude and longitude coordinate variables.
    if ((retval = nc_inq_varid(ncid, LAT_NAME, &lat_varid)))
        ERR(retval)

    if ((retval = nc_inq_varid(ncid, LON_NAME, &lon_varid)))
        ERR(retval)

    // Get the varid of t
    if ((retval = nc_inq_varid(ncid, T_NAME, &t_varid)))
        ERR(retval)

    printf("Variable IDs: lat=%d, lon=%d, t=%d\n", lat_varid, lon_varid, t_varid);

    // Read the coordinates variables data.
    if ((retval = nc_get_var_float(ncid, lat_varid, &lats[0])))
        ERR(retval)

    if ((retval = nc_get_var_float(ncid, lon_varid, &lons[0])))
        ERR(retval)

    // Read the data, scale factor, offset and long_name of z.
    if ((retval = nc_get_var_short(ncid, t_varid, &t_in[0][0][0])))
        ERR(retval)

    printf("Latitudes and longitudes read successfully.\n");

    if ((retval = nc_get_att_double(ncid, t_varid, SCALE_FACTOR, scale_factor)))
        ERR(retval)

    printf("scale_factor: %f\n", *scale_factor);

    if ((retval = nc_get_att_double(ncid, t_varid, OFFSET, offset)))
        ERR(retval)

    printf("scale_factor: %f, offset: %f\n", *scale_factor, *offset);
    
    if ((retval = nc_get_att_text(ncid, t_varid, LONG_NAME, long_name)))
        ERR(retval)
}

void check_coords(short*** z_in, float lats[NLAT], float lons[NLON]) {
    int i,j,k;
    
    // Check if the longitudes are in the range [-180, 180] or [0, 360] and correct them if necessary.
    if(lons[NLON-1] > 180) {
        float aux1;
        short aux2;
        
        printf("Corrigiendo longitudes...\n");
        
        for(i=0;i<NLON; i++) {
            if(lons[i] >= 180)
                lons[i] -= 360;
        }

        //intercambiar las dos mitades del array de longitudes.
        for(i=0;i<NLON/2; i++) {
            aux1 = lons[i];
            lons[i] = lons[NLON/2+i];
            lons[NLON/2+i] = aux1;
        }

        for(i=0;i<NTIME;i++)
            for(j=0;j<NLAT;j++)
                for(k=0;k<NLON/2;k++) {
                    aux2 = z_in[i][j][k];
                    z_in[i][j][k] = z_in[i][j][NLON/2+k];
                    z_in[i][j][NLON/2+k] = aux2;
                }
    }
}

void init_file(char* filename, char* long_name) {
    char cwd[NC_MAX_CHAR];
    char* error_catcher_char;
    int error_catcher_int;
    size_t buffer_size;
    error_catcher_char = getcwd(cwd, sizeof(cwd));

    //extract the last part of the path
    char *p = strrchr(cwd, '/');
    p == NULL ? p = cwd : p++;
    if(strcmp(p, ACTUAL_DIR) == 0) {
        error_catcher_int = chdir("..");
        error_catcher_char = getcwd(cwd, sizeof(cwd));
    }

    buffer_size = strlen(cwd) + strlen(OUT_DIR_NAME) + 2;
    char file_path[buffer_size];

    snprintf(file_path, buffer_size, "%s/%s", cwd, OUT_DIR_NAME);
    printf("File path: %s\n", file_path);

    // Check if the directory exists, if not create it.
    if (access(file_path, F_OK) == -1) {
        if (mkdir(file_path, 0777) == -1) {
            perror("Error creating directory");
            exit(EXIT_FAILURE);
        }
    }

    // FILE_NAME extract the last part of the path
    p = strrchr(FILE_NAME, '/');
    p == NULL ? p = FILE_NAME : p++;

    // printf("File name: %s\n", p);
    char temp[NC_MAX_CHAR];
    strncpy(temp, p, strlen(p));

    //delete the extension from p
    char *dot = strrchr(temp, '.');
    if (dot) *dot = '\0';


    // Get the current date and time.
    time_t t = time(NULL);
    struct tm tm = *localtime(&t);

    char fecha[20];
    sprintf(fecha, "%02d-%02d-%04d_%02d-%02d", tm.tm_mday, tm.tm_mon + 1, tm.tm_year + 1900, tm.tm_hour, tm.tm_min);

    sprintf(filename, "%s%s_selected_%s_%sUTC.csv", file_path, long_name, temp, fecha);
    FILE *fp = fopen(filename, "w");
    
    if (fp == NULL) {
        perror("Error opening file");
        exit(EXIT_FAILURE);
    }
    
    fprintf(fp, "time,latitude,longitude,t,cluster,centroid_lat,centroid_lon\n");
    fclose(fp);
}

coord_point create_point(float lat, float lon) {
    coord_point point = {lat, lon};
    return point;
}

// Function to create a selected_point struct.
selected_point create_selected_point(coord_point point, short t,  int cluster) {
    selected_point new_point = {point, t, cluster};
    return new_point;
}

void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id, double eps) {
    int x, y;

    for(x=i-1;x<=i+1;x++) {
        if(x<0 || x>size_x-1)
            continue;
        for(y=j-1;y<=j+1;y++) {
            // printf("x: %d, y: %d\n", x, y);
            if(y<0 || y>size_y-1)
                continue;
            if(x == i && y == j)
                continue;

            if(filtered_points[x][y].cluster != -1) 
                continue;

            if(fabs(filtered_points[x][y].point.lat - filtered_points[i][j].point.lat) <= eps && fabs(filtered_points[x][y].point.lon - filtered_points[i][j].point.lon) <= eps) {
                filtered_points[x][y].cluster = id;
                expandCluster(filtered_points, size_x, size_y, x, y, id, eps);
            }
        }
    }
}