#include "../libraries/init.h"

int LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
char* FILE_NAME;


/**
 * @brief Procesar la entrada de argumentos de la línea de comandos.
 * 
 * @param argc Número de argumentos.
 * @param argv Argumentos.
 */
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
        error_catcher_int = chdir("..");
        error_catcher_char = getcwd(cwd, sizeof(cwd));
    }

    if (argc != 7) {
        //FILE_NAME = "config/data/geopot_500hPa_2019-06-26_00-06-12-18UTC.nc";
        //FILE_NAME = "config/data/geopot_500hPa_2003-08-(01-15)_00-06-12-18UTC.nc";
        FILE_NAME = "config/data/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc";
        LAT_LIM_MIN = 25;
        LAT_LIM_MAX = 85;
        LON_LIM_MIN = -180;
        LON_LIM_MAX = 180;
        N_THREADS = 40;
    } else {
        // char* input_file_name = argv[1];
        // FILE_NAME = "/app/config/data/geopotential_500hPa_2003-08-(01-15)_00-06-12-18UTC.nc";
        FILE_NAME = argv[1];
        LAT_LIM_MIN = atoi(argv[2]);
        LAT_LIM_MAX = atoi(argv[3]);
        LON_LIM_MIN = atoi(argv[4]);
        LON_LIM_MAX = atoi(argv[5]);
        N_THREADS = atoi(argv[6]);

        // char temp[strlen(BASE_PATH) + strlen(input_file_name) +1];
        // snprintf(temp, sizeof(temp), "%s%s", BASE_PATH, input_file_name);

        // FILE_NAME = temp;

        printf("FILE_NAME: %s\n", FILE_NAME);

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


/**
 * @brief Inicializar los archivos de salida con nombre y cabecera correcta.
 * 
 * @param filename Archivo de salida de los puntos seleccionados.
 * @param filename2 Archivo de salida de las formaciones.
 * @param log_file Archivo de salida de los logs. Este será un .txt
 * @param speed_file Archivo de salida de los tiempos de ejecución.
 * @param long_name Nombre largo de la variable z. Proviene del NetCDF.
 */
void init_files(char* filename, char* filename2, char* log_file, char* speed_file, char* long_name) {
    char cwd[NC_MAX_CHAR];
    char file_path[NC_MAX_CHAR];
    char* error_catcher_char, *p;
    int error_catcher_int;
    error_catcher_char = getcwd(cwd, sizeof(cwd));

    //extract the last part of the path
    p = strrchr(cwd, '/');
    p == NULL ? p = cwd : p++;
    if(strcmp(p, ACTUAL_DIR) == 0) {
        error_catcher_int = chdir("..");
        error_catcher_char = getcwd(cwd, sizeof(cwd));
    }

    snprintf(file_path, sizeof(file_path), "%s/%s", cwd, OUT_DIR_NAME);

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
    fprintf(fp, "time,latitude,longitude,z,type,cluster,centroid_lat,centroid_lon\n");
    fclose(fp);

    sprintf(filename2, "%s%s_formations_%s_%sUTC.csv", file_path, long_name, temp, fecha);
    fp = fopen(filename2, "w");
    fprintf(fp, "time,max_id,min1_id,min2_id,type\n");
    fclose(fp);

    sprintf(log_file, "%slog_%s_%sUTC_%dhilos.txt", file_path, temp, fecha, N_THREADS);
    fp = fopen(log_file, "w");
    fprintf(fp, "Log prints and errors of the execution:\n");
    fclose(fp);

    sprintf(speed_file, "%sspeed_%s_%sUTC_%dhilos.csv", file_path, temp, fecha, N_THREADS);
    fp = fopen(speed_file, "w");
    fprintf(fp, "part,instant,time_elapsed\n");
    fclose(fp);
}


/**
 * @brief Comprobar si las coordenadas están en el rango [-180, 180] o [0, 360] y corregirlas si es necesario.
 * 
 * @param z_in Matriz de alturas.
 * @param lats 
 * @param lons 
 */
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


//Function to initialize the netcdf variables.
void init_nc_variables(int ncid, short*** z_in, float lats[NLAT], float lons[NLON], double *scale_factor, double *offset, char *long_name) {
    int retval, lat_varid, lon_varid, z_varid;

    
    // Get the varids of the latitude and longitude coordinate variables.
    if ((retval = nc_inq_varid(ncid, LAT_NAME, &lat_varid)))
        ERR(retval)

    if ((retval = nc_inq_varid(ncid, LON_NAME, &lon_varid)))
        ERR(retval)

    // Get the varid of z
    if ((retval = nc_inq_varid(ncid, Z_NAME, &z_varid)))
        ERR(retval)

    // Read the coordinates variables data.
    if ((retval = nc_get_var_float(ncid, lat_varid, &lats[0])))
        ERR(retval)

    if ((retval = nc_get_var_float(ncid, lon_varid, &lons[0])))
        ERR(retval)

    // Read the data, scale factor, offset and long_name of z.
    if ((retval = nc_get_var_short(ncid, z_varid, &z_in[0][0][0])))
        ERR(retval)

    if ((retval = nc_get_att_double(ncid, z_varid, SCALE_FACTOR, scale_factor)))
        ERR(retval)

    if ((retval = nc_get_att_double(ncid, z_varid, OFFSET, offset)))
        ERR(retval)
    
    if ((retval = nc_get_att_text(ncid, z_varid, LONG_NAME, long_name)))
        ERR(retval)
}


//Function to extract the data from the netcdf file
void extract_nc_data(int ncid) {
    int i, num_vars, varid, vartype, ndims, natts;
    int dimids[NC_MAX_VAR_DIMS];
    size_t var_size;
    char varname[NC_MAX_NAME + 1];

    // Obtener el número de variables en el archivo
    int retval = nc_inq_nvars(ncid, &num_vars);
    if (retval != NC_NOERR) {
        fprintf(stderr, "Error al obtener el número de variables: %s\n", nc_strerror(retval));
        return;
    }

    // Iterar sobre todas las variables y obtener información sobre cada una
    for (varid = 0; varid < num_vars; varid++) {
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
        else if(strcmp(varname, Z_NAME) == 0) continue;        
        else {
            printf("Error: Variable %d: Nombre=%s, Tipo=%d, Número de dimensiones=%d, Tamaño=%zu\n", varid, varname, vartype, ndims, var_size);
            // return;
        }
    }
    printf("NLON: %d, NLAT: %d, NTIME: %d\n", NLON, NLAT, NTIME);
}
