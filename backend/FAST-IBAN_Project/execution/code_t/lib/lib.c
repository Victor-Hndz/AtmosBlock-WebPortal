#include "lib.h"

int NTIME, NLAT, NLON, LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
char* FILE_NAME, *OUT_DIR_NAME;
double RES;  // ALG-301: la fija init_nc_variables a partir de la rejilla del NetCDF
int FILA_LAT_MIN;  // ALG-302

// ALG-301: paso de una coordenada si es uniforme (con la tolerancia de float32); -1 si no lo es.
static double paso_uniforme(const float *v, int n) {
    if (n < 2)
        return -1;
    double paso = fabs((double)v[n - 1] - v[0]) / (n - 1);
    for (int i = 1; i < n; i++)
        if (fabs(fabs((double)v[i] - v[i - 1]) - paso) > TOL_PASO)
            return -1;
    return paso;
}

void process_entry(int argc, char **argv) {
    char cwd[NC_MAX_CHAR];
    if (getcwd(cwd, sizeof(cwd)) == NULL) {
        perror("Error getting current directory");
        exit(EXIT_FAILURE);
    }

    //extract the last part of the path
    char *p = strrchr(cwd, '/');
    p == NULL ? p = cwd : p++;
    if(strcmp(p, ACTUAL_DIR) == 0 && chdir("../../") == -1) {
        perror("Error changing directory");
        exit(EXIT_FAILURE);
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

    // ALG-301 (L1): la resolución sale de la rejilla del fichero, con el mismo paso uniforme en latitud y longitud.
    double paso_lat = paso_uniforme(lats, NLAT), paso_lon = paso_uniforme(lons, NLON);
    if (paso_lat <= 0 || paso_lon <= 0 || fabs(paso_lat - paso_lon) > TOL_PASO) {
        fprintf(stderr, "Error: la rejilla debe tener un paso uniforme e igual en latitud y longitud (latitud %g, longitud %g).\n", paso_lat, paso_lon);
        exit(EXIT_FAILURE);
    }
    RES = paso_lat;

    // ALG-302: índice de la fila de LAT_LIM_MIN en las latitudes del fichero. Sustituye a FILT_LAT, que suponía
    // una rejilla que empieza en 90°N con paso de 0,25°.
    float lat_sup = lats[0] > lats[NLAT - 1] ? lats[0] : lats[NLAT - 1];
    float lat_inf = lats[0] > lats[NLAT - 1] ? lats[NLAT - 1] : lats[0];
    if (LAT_LIM_MIN > lat_sup + TOL_PASO || LAT_LIM_MIN < lat_inf - TOL_PASO) {
        fprintf(stderr, "Error: el límite inferior de latitud (%d) está fuera de las latitudes del fichero (%g a %g).\n", LAT_LIM_MIN, lat_inf, lat_sup);
        exit(EXIT_FAILURE);
    }
    FILA_LAT_MIN = (int)floor(fabs(lats[0] - LAT_LIM_MIN) / RES + TOL_PASO);

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

void check_coords(short*** z_in, float lons[NLON]) {
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
    size_t buffer_size;
    if (getcwd(cwd, sizeof(cwd)) == NULL) {
        perror("Error getting current directory");
        exit(EXIT_FAILURE);
    }

    //extract the last part of the path
    char *p = strrchr(cwd, '/');
    p == NULL ? p = cwd : p++;
    if(strcmp(p, ACTUAL_DIR) == 0) {
        if (chdir("..") == -1 || getcwd(cwd, sizeof(cwd)) == NULL) {
            perror("Error changing directory");
            exit(EXIT_FAILURE);
        }
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
    snprintf(temp, sizeof(temp), "%s", p);

    //delete the extension from p
    char *dot = strrchr(temp, '.');
    if (dot) *dot = '\0';


    // Get the current date and time.
    time_t t = time(NULL);
    struct tm tm = *localtime(&t);

    char fecha[20];
    strftime(fecha, sizeof(fecha), "%d-%m-%Y_%H-%M", &tm);

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

// B8 (ALG-112): recorrido iterativo con pila explícita, como en code/ (ALG-403). El DFS recursivo anterior
// desbordaba la pila con clusters grandes. Marca la misma componente: vecindad 8 y dentro de eps.
void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id, double eps) {
    int capacidad = 64, n = 0;
    int *pila = malloc(2 * capacidad * sizeof(int));
    if (pila == NULL) {
        perror("expandCluster: sin memoria");
        exit(EXIT_FAILURE);
    }
    pila[0] = i;
    pila[1] = j;
    n = 1;

    while (n > 0) {
        n--;
        int ci = pila[2 * n], cj = pila[2 * n + 1];

        for (int x = ci - 1; x <= ci + 1; x++) {
            if (x < 0 || x > size_x - 1)
                continue;
            for (int y = cj - 1; y <= cj + 1; y++) {
                if (y < 0 || y > size_y - 1 || (x == ci && y == cj))
                    continue;
                if (filtered_points[x][y].cluster != -1)
                    continue;
                if (fabs(filtered_points[x][y].point.lat - filtered_points[ci][cj].point.lat) <= eps &&
                    fabs(filtered_points[x][y].point.lon - filtered_points[ci][cj].point.lon) <= eps) {
                    filtered_points[x][y].cluster = id;
                    if (n == capacidad) {
                        capacidad *= 2;
                        int *mayor = realloc(pila, 2 * capacidad * sizeof(int));
                        if (mayor == NULL) {
                            free(pila);
                            perror("expandCluster: sin memoria");
                            exit(EXIT_FAILURE);
                        }
                        pila = mayor;
                    }
                    pila[2 * n] = x;
                    pila[2 * n + 1] = y;
                    n++;
                }
            }
        }
    }
    free(pila);
}

// ALG-114: agrupa solo los puntos seleccionados (cluster == -1); los no seleccionados llevan NOT_SELECTED y
// expandCluster no los recorre. Antes también se agrupaban y formaban un único cluster enorme.
// Devuelve el número de clusters.
int cluster_points(selected_point **filtered_points, int size_x, int size_y, double eps) {
    int id = 0;
    for (int i = 0; i < size_x; i++)
        for (int j = 0; j < size_y; j++)
            if (filtered_points[i][j].cluster == -1) {
                filtered_points[i][j].cluster = id;
                expandCluster(filtered_points, size_x, size_y, i, j, id, eps);
                id++;
            }
    return id;
}

// ALG-114: escribe cada punto seleccionado con el id de su cluster y el centroide del cluster (media vectorial 3D
// redondeada a la rejilla, como en code/). Antes la columna cluster recibía el índice de fila y el centroide era el
// propio punto.
void write_selected_points(FILE *fp, selected_point **filtered_points, int size_x, int size_y, int n_clusters,
                           int time_step, double scale_factor, double offset) {
    if (n_clusters <= 0)
        return;

    double *x = calloc(n_clusters, sizeof(double)), *y = calloc(n_clusters, sizeof(double));
    double *z = calloc(n_clusters, sizeof(double));
    int *n = calloc(n_clusters, sizeof(int));
    coord_point *center = malloc(n_clusters * sizeof(coord_point));
    if (x == NULL || y == NULL || z == NULL || n == NULL || center == NULL) {
        perror("write_selected_points: sin memoria");
        exit(EXIT_FAILURE);
    }

    for (int i = 0; i < size_x; i++)
        for (int j = 0; j < size_y; j++) {
            int c = filtered_points[i][j].cluster;
            if (c < 0)
                continue;
            double lat = filtered_points[i][j].point.lat * M_PI / 180, lon = filtered_points[i][j].point.lon * M_PI / 180;
            x[c] += cos(lat) * cos(lon);
            y[c] += cos(lat) * sin(lon);
            z[c] += sin(lat);
            n[c]++;
        }

    for (int c = 0; c < n_clusters; c++) {
        x[c] /= n[c];
        y[c] /= n[c];
        z[c] /= n[c];
        center[c].lat = round((atan2(z[c], sqrt(x[c] * x[c] + y[c] * y[c])) * 180 / M_PI) / RES) * RES;
        center[c].lon = round((atan2(y[c], x[c]) * 180 / M_PI) / RES) * RES;
    }

    for (int i = 0; i < size_x; i++)
        for (int j = 0; j < size_y; j++) {
            selected_point p = filtered_points[i][j];
            if (p.cluster < 0)
                continue;
            //time,latitude,longitude,t,cluster,centroid_lat,centroid_lon
            fprintf(fp, "%d,%.2f,%.2f,%.2f,%d,%.2f,%.2f\n", time_step, p.point.lat, p.point.lon,
                    p.t * scale_factor + offset - K_TO_C, p.cluster, center[p.cluster].lat, center[p.cluster].lon);
        }

    free(x);
    free(y);
    free(z);
    free(n);
    free(center);
}