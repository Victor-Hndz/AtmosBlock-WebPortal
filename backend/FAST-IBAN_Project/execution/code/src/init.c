#include "../libraries/init.h"
#include "../libraries/yaml_plano.h"

int LAT_LIM_MIN, LAT_LIM_MAX, LON_LIM_MIN, LON_LIM_MAX, N_THREADS;
int FILA_LAT_MIN;  // ALG-302
int DOM_LAT_MIN, DOM_LAT_MAX, FILA_LAT_INICIO;  // ALG-374
int COL_LON_INICIO;  // ALG-369
char* FILE_NAME, *OUT_DIR_NAME;

// ALG-305 (L4): parámetros del detector. La ruta por defecto la fija CMake (config/params.yaml del código fuente).
#ifndef FAST_IBAN_PARAMS_DEFECTO
#define FAST_IBAN_PARAMS_DEFECTO "config/params.yaml"
#endif

static const clave_yaml CLAVES_PARAMS[] = {
    {"candidate_spacing_deg", false, &PARAMS.candidate_spacing_deg},
    {"n_rays", true, &PARAMS.n_rays},
    {"ray_distance_km", false, &PARAMS.ray_distance_km},
    {"pass_fraction", false, &PARAMS.pass_fraction},
    {"contour_step_m", true, &PARAMS.contour_step_m},
    {"search_radius_km", false, &PARAMS.search_radius_km},
    {"contour_ray_step_km", false, &PARAMS.contour_ray_step_km},
    {"cluster_lat_min_deg", false, &PARAMS.cluster_lat_min_deg},
    {"cluster_lat_max_deg", false, &PARAMS.cluster_lat_max_deg},
    {"min_cluster_area_km2", false, &PARAMS.min_cluster_area_km2},
    {"rex_max_offset_km", false, &PARAMS.rex_max_offset_km},
};
#define N_CLAVES_PARAMS (sizeof(CLAVES_PARAMS) / sizeof(CLAVES_PARAMS[0]))

// ALG-352: la variante de temperatura usa los mismos parámetros más su umbral de selección.
static clave_yaml CLAVES_TEMPERATURA[N_CLAVES_PARAMS + 1];

static const clave_yaml *claves_de_la_variable(size_t *n) {
    if (VARIABLE != VAR_TEMPERATURA) {
        *n = N_CLAVES_PARAMS;
        return CLAVES_PARAMS;
    }
    for (size_t i = 0; i < N_CLAVES_PARAMS; i++)
        CLAVES_TEMPERATURA[i] = CLAVES_PARAMS[i];
    CLAVES_TEMPERATURA[N_CLAVES_PARAMS] = (clave_yaml){"temperature_threshold_c", false, &PARAMS.temperature_threshold_c};
    *n = N_CLAVES_PARAMS + 1;
    return CLAVES_TEMPERATURA;
}

/**
 * @brief Leer los parámetros del detector y comprobar sus rangos; un valor fuera de rango termina el proceso con un
 * mensaje (los errores de formato los da leer_yaml_plano).
 *
 * @param ruta Fichero; con NULL se usa FAST_IBAN_PARAMS del entorno o, si no está, la ruta por defecto.
 */
void cargar_parametros(const char *ruta) {
    if (ruta == NULL)
        ruta = getenv("FAST_IBAN_PARAMS");
    if (ruta == NULL || *ruta == '\0')  // una variable vacía cuenta como no definida
        ruta = FAST_IBAN_PARAMS_DEFECTO;
    size_t n_claves;
    const clave_yaml *claves = claves_de_la_variable(&n_claves);
    leer_yaml_plano(ruta, claves, n_claves);

    if (PARAMS.n_rays <= 0 || PARAMS.n_rays % 8 != 0) {
        fprintf(stderr, "Error en %s: n_rays (%d) debe ser un múltiplo positivo de 8\n", ruta, PARAMS.n_rays);
        exit(EXIT_FAILURE);
    }
    if (PARAMS.candidate_spacing_deg <= 0 || PARAMS.ray_distance_km <= 0 || PARAMS.pass_fraction <= 0 ||
        PARAMS.pass_fraction > 1 || PARAMS.contour_step_m <= 0 || PARAMS.search_radius_km <= 0 ||
        PARAMS.contour_ray_step_km <= 0 || PARAMS.min_cluster_area_km2 < 0 || PARAMS.rex_max_offset_km < 0 ||
        PARAMS.cluster_lat_min_deg >= PARAMS.cluster_lat_max_deg || PARAMS.cluster_lat_max_deg > 90) {
        // ALG-360: con el centro en el polo los rayos geodésicos degeneran (todos siguen el mismo meridiano).
        fprintf(stderr, "Error en %s: hay valores fuera de rango (positivos, pass_fraction en (0, 1], "
                        "cluster_lat_min_deg < cluster_lat_max_deg <= 90)\n", ruta);
        exit(EXIT_FAILURE);
    }
}

/**
 * @brief ALG-374: dominio de análisis en latitud a partir de los límites pedidos. El límite hacia el ecuador es el de
 * menor |lat| y hacia el polo se llega hasta ±90°, porque el límite polar no recorta el análisis (ALG-304). Un dominio
 * que cruza el ecuador queda limitado por los dos.
 */
void calcular_dominio_latitudes(void) {
    DOM_LAT_MIN = LAT_LIM_MIN >= 0 || LAT_LIM_MAX > 0 ? LAT_LIM_MIN : -90;
    DOM_LAT_MAX = LAT_LIM_MAX <= 0 || LAT_LIM_MIN < 0 ? LAT_LIM_MAX : 90;
}

/**
 * @brief ALG-369 (ALG-358): columnas de candidatos dentro de [LON_LIM_MIN, LON_LIM_MAX], con la retícula anclada a la
 * primera columna del fichero. Deja la primera en COL_LON_INICIO y devuelve cuántas hay. Con un fichero global y el
 * círculo completo pedido son todas; el portal descarga un margen alrededor del área y solo se informa dentro de ella.
 * Se llama con las longitudes ya en -180…180 (check_coords).
 */
int columnas_candidatas(const float *lons, int paso) {
    int inicio = 0;
    while (inicio < NLON && lons[inicio] < LON_LIM_MIN - TOL_PASO)
        inicio += paso;
    int n = 0;
    while (inicio + n * paso < NLON && lons[inicio + n * paso] <= LON_LIM_MAX + TOL_PASO)
        n++;
    if (inicio >= NLON || n == 0) {
        fprintf(stderr, "Error: ninguna longitud de candidatos entre %d y %d en el fichero.\n", LON_LIM_MIN, LON_LIM_MAX);
        exit(EXIT_FAILURE);
    }
    COL_LON_INICIO = inicio;
    return n;
}

/**
 * @brief Espaciado de los puntos candidatos en celdas de la rejilla; candidate_spacing_deg debe ser múltiplo entero de RES.
 *
 * ponytail: la retícula empieza en la primera fila y columna del fichero; queda anclada a 0° cuando la primera latitud
 * y longitud son múltiplos del espaciado (rejillas globales y áreas enteras del portal con espaciado de 1°).
 */
int paso_candidatos(void) {
    int paso = (int)lround(PARAMS.candidate_spacing_deg / RES);
    if (paso < 1 || fabs(paso * RES - PARAMS.candidate_spacing_deg) > TOL_PASO) {
        fprintf(stderr, "Error: candidate_spacing_deg (%g) debe ser un múltiplo entero de la resolución del fichero (%g).\n",
                PARAMS.candidate_spacing_deg, RES);
        exit(EXIT_FAILURE);
    }
    return paso;
}

// ALG-305 (L4): configuración completa al principio de cada CSV, en líneas de comentario. Sin el número de hilos ni de
// procesos, para que la salida siga siendo idéntica con cualquiera de ellos.
void escribir_cabecera(FILE *fp) {
    const char *base = strrchr(FILE_NAME, '/');
    fprintf(fp, "# input_file: %s\n", base != NULL ? base + 1 : FILE_NAME);
    fprintf(fp, "# grid_resolution_deg: %g\n", RES);
    fprintf(fp, "# lat_limits_deg: %d %d\n", LAT_LIM_MIN, LAT_LIM_MAX);
    fprintf(fp, "# lon_limits_deg: %d %d\n", LON_LIM_MIN, LON_LIM_MAX);
    size_t n_claves;
    const clave_yaml *claves = claves_de_la_variable(&n_claves);
    escribir_claves_yaml(fp, claves, n_claves);
    fprintf(fp, "# polar_guard_deg: %.3f\n", guarda_polar_deg());  // ALG-310: derivada, no se lee
}


/**
 * @brief Procesar la entrada de argumentos de la línea de comandos.
 * 
 * @param argc Número de argumentos.
 * @param argv Argumentos.
 */
void process_entry(int argc, char **argv) {
    // ALG-305: antes de cambiar de directorio, para que una ruta relativa en FAST_IBAN_PARAMS funcione.
    cargar_parametros(NULL);

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
        FILE_NAME = "config/data/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc";
        LAT_LIM_MIN = 25;
        LAT_LIM_MAX = 85;
        LON_LIM_MIN = -180;
        LON_LIM_MAX = 180;
        OUT_DIR_NAME = "out/";
        N_THREADS = 40;
    } else {
        // char* input_file_name = argv[1];
        // FILE_NAME = "/app/config/data/geopotential_500hPa_2003-08-(01-15)_00-06-12-18UTC.nc";
        FILE_NAME = argv[1];
        LAT_LIM_MIN = atoi(argv[2]);
        LAT_LIM_MAX = atoi(argv[3]);
        LON_LIM_MIN = atoi(argv[4]);
        LON_LIM_MAX = atoi(argv[5]);
        OUT_DIR_NAME = argv[6];
        N_THREADS = atoi(argv[7]);

        // char temp[strlen(BASE_PATH) + strlen(input_file_name) +1];
        // snprintf(temp, sizeof(temp), "%s%s", BASE_PATH, input_file_name);

        // FILE_NAME = temp;

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

        // ALG-354: una entrada de contadores de diagnóstico por hilo; con más hilos, dos compartirían entrada.
        if(N_THREADS > MAX_HILOS_CONTADORES) {
            printf("Error: se admiten como mucho %d hilos (se pidieron %d).\n", MAX_HILOS_CONTADORES, N_THREADS);
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
    char *p;
    size_t buffer_size;
    if (getcwd(cwd, sizeof(cwd)) == NULL) {
        perror("Error getting current directory");
        exit(EXIT_FAILURE);
    }

    //extract the last part of the path
    p = strrchr(cwd, '/');
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

    buffer_size = strlen(file_path) + strlen(long_name) + strlen(temp) + strlen(fecha) + EXTRA_STR_SIZE;
    snprintf(filename, buffer_size, "%s%s_selected_%s_%sUTC.csv", file_path, long_name, temp, fecha);
    FILE *fp = fopen(filename, "w");
    if (fp == NULL) {
        perror("Error opening file");
        exit(EXIT_FAILURE);
    }
    escribir_cabecera(fp);  // ALG-305
    fprintf(fp, "time,latitude,longitude,%s,type,cluster,centroid_lat,centroid_lon\n", nombre_variable());  // ALG-352
    fclose(fp);
    
    buffer_size = strlen(file_path) + strlen(long_name) + strlen(temp) + strlen(fecha) + EXTRA_STR_SIZE;
    snprintf(filename2, buffer_size, "%s%s_formations_%s_%sUTC.csv", file_path, long_name, temp, fecha);
    fp = fopen(filename2, "w");
    if (fp == NULL) {
        perror("Error opening file");
        exit(EXIT_FAILURE);
    }
    escribir_cabecera(fp);  // ALG-305
    fprintf(fp, "time,max_id,min1_id,min2_id,type,truncada\n");  // ALG-376
    fclose(fp);

    buffer_size = strlen(file_path) + strlen(temp) + strlen(fecha) + EXTRA_STR_SIZE;
    snprintf(log_file, buffer_size, "%slog_%s_%sUTC_%dhilos.txt", file_path, temp, fecha, N_THREADS);
    fp = fopen(log_file, "w");
    if (fp == NULL) {
        perror("Error opening file");
        exit(EXIT_FAILURE);
    }
    fprintf(fp, "Log prints and errors of the execution:\n");
    fclose(fp);

    buffer_size = strlen(file_path) + strlen(temp) + strlen(fecha) + EXTRA_STR_SIZE;
    snprintf(speed_file, buffer_size, "%sspeed_%s_%sUTC_%dhilos.csv", file_path, temp, fecha, N_THREADS);
    fp = fopen(speed_file, "w");
    if (fp == NULL) {
        perror("Error opening file");
        exit(EXIT_FAILURE);
    }
    fprintf(fp, "part,instant,time_elapsed\n");
    fclose(fp);
}


/**
 * @brief Corregir las longitudes si vienen en [0, 360) para que queden en [-180, 180).
 * 
 * @param lons Longitudes; se corrigen in-place.
 * @return true si los datos deben intercambiar sus dos mitades de longitud al leer cada paso (read_time_step).
 */
bool check_coords(float lons[NLON]) {
    int i;
    float aux;

    if(lons[NLON-1] <= 180)
        return false;

    printf("Corrigiendo longitudes...\n");

    for(i=0;i<NLON; i++) {
        if(lons[i] >= 180)
            lons[i] -= 360;
    }

    //intercambiar las dos mitades del array de longitudes.
    for(i=0;i<NLON/2; i++) {
        aux = lons[i];
        lons[i] = lons[NLON/2+i];
        lons[NLON/2+i] = aux;
    }
    return true;
}


/**
 * @brief Leer un paso temporal de z (ALG-204, R2): NLAT×NLON en vez del cubo NTIME×NLAT×NLON.
 * 
 * @param z Matriz contigua NLAT×NLON de destino.
 * @param swap_lon Intercambiar las dos mitades de longitud (lo decide check_coords).
 */
void read_time_step(int ncid, int z_varid, int time, bool swap_lon, short **z) {
    int retval, j, k;
    short aux;
    size_t start[3] = {(size_t)time, 0, 0}, count[3] = {1, (size_t)NLAT, (size_t)NLON};

    if ((retval = nc_get_vara_short(ncid, z_varid, start, count, &z[0][0])))
        ERR(retval)

    if(swap_lon)
        for(j=0;j<NLAT;j++)
            for(k=0;k<NLON/2;k++) {
                aux = z[j][k];
                z[j][k] = z[j][NLON/2+k];
                z[j][NLON/2+k] = aux;
            }
}


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

//Function to initialize the netcdf variables. Returns the varid of z, whose data is read per time step.
int init_nc_variables(int ncid, float lats[NLAT], float lons[NLON], double *scale_factor, double *offset, char *long_name) {
    int retval, lat_varid, lon_varid, z_varid, ndims;

    
    // Get the varids of the latitude and longitude coordinate variables.
    if ((retval = nc_inq_varid(ncid, LAT_NAME, &lat_varid)))
        ERR(retval)

    if ((retval = nc_inq_varid(ncid, LON_NAME, &lon_varid)))
        ERR(retval)

    // Get the varid of z
    if ((retval = nc_inq_varid(ncid, nombre_variable(), &z_varid)))
        ERR(retval)

    // z must be (time, latitude, longitude): read_time_step reads one time step at a time.
    if ((retval = nc_inq_varndims(ncid, z_varid, &ndims)))
        ERR(retval)
    if (ndims != 3) {
        fprintf(stderr, "Error: %s debe tener 3 dimensiones (tiempo, latitud, longitud) y tiene %d.\n", Z_NAME, ndims);
        exit(EXIT_FAILURE);
    }

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

    // ALG-374, ALG-369: primera fila de candidatos, la de LAT_LIM_MAX (el área pedida), que no tiene por qué ser la
    // primera del fichero: en el hemisferio sur, o cuando el portal descarga un margen alrededor del área.
    calcular_dominio_latitudes();
    // El techo pedido puede quedar por encima del fichero (el portal pide 90): entonces se empieza en su primera fila.
    FILA_LAT_INICIO = LAT_LIM_MAX >= lat_sup - TOL_PASO ? 0 : (int)ceil(fabs(lats[0] - LAT_LIM_MAX) / RES - TOL_PASO);

    // Read the scale factor, offset and long_name of z.
    if ((retval = nc_get_att_double(ncid, z_varid, SCALE_FACTOR, scale_factor)))
        ERR(retval)

    if ((retval = nc_get_att_double(ncid, z_varid, OFFSET, offset)))
        ERR(retval)
    
    if ((retval = nc_get_att_text(ncid, z_varid, LONG_NAME, long_name)))
        ERR(retval)

    return z_varid;
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
