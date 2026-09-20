// FAST-IBAN, variante de temperatura (ALG-352): selecciona los puntos por encima de un umbral y los agrupa.
// Usa el mismo núcleo que code/ (lectura, rejilla de candidatos, clusters y exportación); lo único propio es la
// regla de selección. Antes tenía su propia librería, sin ninguna de las correcciones de las fases 1-3.
#include "../code/libraries/calc.h"
#include "../code/libraries/init.h"
#include "../code/libraries/utils.h"

int main(int argc, char **argv) {
    int ncid, retval, i, j, time, size_x, size_y, step, id, z_varid;
    double scale_factor, offset;
    short **t = NULL;
    bool swap_lon;
    char long_name[NC_MAX_NAME + 1] = "";
    selected_point **puntos = NULL;
    char *filename = malloc(sizeof(char) * (NC_MAX_NAME + 1));
    char *filename2 = malloc(sizeof(char) * (NC_MAX_NAME + 1));
    char *speed_file = malloc(sizeof(char) * (NC_MAX_NAME + 1));
    char *log_file = malloc(sizeof(char) * (NC_MAX_NAME + 1));

    if (filename == NULL || filename2 == NULL || speed_file == NULL || log_file == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }

    VARIABLE = VAR_TEMPERATURA;  // antes de leer parámetros y NetCDF: fija el nombre de la variable y las unidades
    process_entry(argc, argv);

    if ((retval = nc_open(FILE_NAME, NC_NOWRITE, &ncid)))
        ERR(retval)

    extract_nc_data(ncid);  // ALG-301: dimensiones y resolución antes de reservar nada
    float *lats = malloc(NLAT * sizeof(float)), *lons = malloc(NLON * sizeof(float));
    t = malloc(NLAT * sizeof(short *));
    t[0] = malloc(sizeof(short) * NLAT * NLON);
    if (lats == NULL || lons == NULL || t == NULL || t[0] == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }
    for (i = 0; i < NLAT; i++)
        t[i] = t[0] + i * NLON;

    z_varid = init_nc_variables(ncid, lats, lons, &scale_factor, &offset, long_name);

    step = paso_candidatos();
    size_x = (FILA_LAT_MIN - FILA_LAT_INICIO) / step + 1;
    swap_lon = check_coords(lons);
    size_y = columnas_candidatas(lons, step);

    puntos = calloc(size_x, sizeof(selected_point *));
    puntos[0] = calloc((size_t)size_x * size_y, sizeof(selected_point));
    if (puntos == NULL || puntos[0] == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        return 2;
    }
    for (i = 0; i < size_x; i++)
        puntos[i] = puntos[0] + i * size_y;

    init_files(filename, filename2, log_file, speed_file, long_name);

    for (time = 0; time < NTIME; time++) {
        read_time_step(ncid, z_varid, time, swap_lon, t);

        for (i = 0; i < size_x; i++)
            for (j = 0; j < size_y; j++) {
                coord_point p = create_point(lats[FILA_LAT_INICIO + i * step], lons[COL_LON_INICIO + j * step]);
                short valor = t[FILA_LAT_INICIO + i * step][COL_LON_INICIO + j * step];
                // La única regla propia de esta variante: por encima del umbral cuenta como máximo.
                enum Tipo_form tipo = valor_fisico(valor, scale_factor, offset) > PARAMS.temperature_threshold_c ? MAX : NO_TYPE;
                puntos[i][j] = create_selected_point(p, valor, tipo, -1);
            }

        id = 0;
        for (i = 0; i < size_x; i++)
            for (j = 0; j < size_y; j++)
                if (puntos[i][j].cluster == -1 && puntos[i][j].type != NO_TYPE) {
                    puntos[i][j].cluster = id;
                    expandCluster(puntos, size_x, size_y, i, j, id);
                    id++;
                }

        points_cluster *clusters = fill_clusters(puntos, size_x, size_y, id, offset, scale_factor);
        export_clusters_to_csv(clusters, id, filename, offset, scale_factor, time);
        for (i = 0; i < id; i++)
            free(clusters[i].points);
        free(clusters);
        printf("Tiempo %d procesado.\n", time);
    }

    if ((retval = nc_close(ncid)))
        ERR(retval)

    free(t[0]);
    free(t);
    free(lats);
    free(lons);
    free(puntos[0]);
    free(puntos);
    free(filename);
    free(filename2);
    free(speed_file);
    free(log_file);

    printf("\n\n*** SUCCESS reading the file %s and writing the data to %s! ***\n", FILE_NAME, OUT_DIR_NAME);
    return 0;
}
