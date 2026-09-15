// ALG-204 (R2): el NetCDF se lee un paso temporal cada vez, y si las longitudes vienen en
// [0, 360) se corrigen a [-180, 180) intercambiando las dos mitades de cada fila del paso.
// Los casos fijos vienen ya en [-180, 180), así que este es el único test de esa vuelta.
#include "../libraries/lib.h"
#include "../libraries/init.h"

#define PASOS 2
#define FILAS 3
#define COLUMNAS 8

static int fallos = 0;

static void comprobar(int condicion, const char *mensaje) {
    if (!condicion) {
        printf("FALLO: %s\n", mensaje);
        fallos++;
    }
}

// Z[t][j][k] = t*100 + j*10 + k: cada celda identifica su paso, fila y columna.
static void crear_caso(const char *ruta, float lon0) {
    int ncid, retval, dims[3], time_id, lat_id, lon_id, z_id;
    int tiempos[PASOS] = {0, 6};
    float lats[FILAS] = {90, 45, 0}, lons[COLUMNAS];
    short z[PASOS][FILAS][COLUMNAS];
    double escala = 1.0, desplazamiento = 0.0;

    for (int k = 0; k < COLUMNAS; k++)
        lons[k] = lon0 + 45.0f * k;
    for (int t = 0; t < PASOS; t++)
        for (int j = 0; j < FILAS; j++)
            for (int k = 0; k < COLUMNAS; k++)
                z[t][j][k] = (short)(t * 100 + j * 10 + k);

    if ((retval = nc_create(ruta, NC_CLOBBER, &ncid))) ERR(retval)
    if ((retval = nc_def_dim(ncid, REC_NAME, PASOS, &dims[0]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LAT_NAME, FILAS, &dims[1]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LON_NAME, COLUMNAS, &dims[2]))) ERR(retval)
    // extract_nc_data toma NTIME, NLAT y NLON de las variables de coordenadas.
    if ((retval = nc_def_var(ncid, REC_NAME, NC_INT, 1, &dims[0], &time_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LAT_NAME, NC_FLOAT, 1, &dims[1], &lat_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LON_NAME, NC_FLOAT, 1, &dims[2], &lon_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, Z_NAME, NC_SHORT, 3, dims, &z_id))) ERR(retval)
    if ((retval = nc_put_att_double(ncid, z_id, SCALE_FACTOR, NC_DOUBLE, 1, &escala))) ERR(retval)
    if ((retval = nc_put_att_double(ncid, z_id, OFFSET, NC_DOUBLE, 1, &desplazamiento))) ERR(retval)
    if ((retval = nc_put_att_text(ncid, z_id, LONG_NAME, 12, "Geopotential"))) ERR(retval)
    if ((retval = nc_enddef(ncid))) ERR(retval)
    if ((retval = nc_put_var_int(ncid, time_id, tiempos))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lat_id, lats))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lon_id, lons))) ERR(retval)
    if ((retval = nc_put_var_short(ncid, z_id, &z[0][0][0]))) ERR(retval)
    if ((retval = nc_close(ncid))) ERR(retval)
}

static void probar(const char *ruta, float lon0, int espera_vuelta) {
    int ncid, retval;
    char nombre_largo[NC_MAX_NAME + 1] = "";
    double escala, desplazamiento;

    crear_caso(ruta, lon0);
    if ((retval = nc_open(ruta, NC_NOWRITE, &ncid))) ERR(retval)
    extract_nc_data(ncid);
    comprobar(NTIME == PASOS && NLAT == FILAS && NLON == COLUMNAS, "dimensiones leídas");

    float lats[NLAT], lons[NLON];
    int z_varid = init_nc_variables(ncid, lats, lons, &escala, &desplazamiento, nombre_largo);
    bool vuelta = check_coords(lons);
    comprobar(vuelta == espera_vuelta, "check_coords decide si hay que intercambiar mitades");
    comprobar(lons[0] == -180.0f && lons[NLON - 1] == 135.0f, "longitudes en [-180, 180)");

    short **z = malloc(NLAT * sizeof(short *));
    z[0] = malloc(sizeof(short) * NLAT * NLON);
    for (int j = 0; j < NLAT; j++)
        z[j] = z[0] + j * NLON;

    read_time_step(ncid, z_varid, 1, vuelta, z);
    for (int j = 0; j < NLAT; j++)
        for (int k = 0; k < NLON; k++) {
            int columna_original = espera_vuelta ? (k + NLON / 2) % NLON : k;
            comprobar(z[j][k] == 100 + j * 10 + columna_original, "valor de la celda del paso 1");
        }

    free(z[0]);
    free(z);
    if ((retval = nc_close(ncid))) ERR(retval)
}

int main(void) {
    probar("lectura_0_360.nc", 0.0f, 1);
    probar("lectura_menos180_180.nc", -180.0f, 0);

    if (fallos) {
        printf("%d comprobaciones fallidas\n", fallos);
        return 1;
    }
    printf("OK: lectura por pasos y corrección de longitudes\n");
    return 0;
}
