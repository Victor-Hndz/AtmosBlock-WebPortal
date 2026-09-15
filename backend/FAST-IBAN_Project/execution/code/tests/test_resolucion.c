// ALG-301 (L1): la resolución de la rejilla se lee del NetCDF, no de un #define.
// Sin argumentos: rejilla de 0,5° con un campo plano, en el que la interpolación bilineal es exacta.
// "irregular": paso de latitud no uniforme; init_nc_variables termina con un mensaje (PASS_REGULAR_EXPRESSION).
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define N_LAT 361
#define N_LON 720

static float lats[N_LAT], lons[N_LON];
static short datos[N_LAT][N_LON];

static void crear_nc(const char *ruta) {
    int ncid, retval, dims[3], time_id, lat_id, lon_id, z_id;
    int tiempos[1] = {0};
    double escala = 1.0, desplazamiento = 0.0;

    if ((retval = nc_create(ruta, NC_CLOBBER, &ncid))) ERR(retval)
    if ((retval = nc_def_dim(ncid, REC_NAME, 1, &dims[0]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LAT_NAME, N_LAT, &dims[1]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LON_NAME, N_LON, &dims[2]))) ERR(retval)
    if ((retval = nc_def_var(ncid, REC_NAME, NC_INT, 1, &dims[0], &time_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LAT_NAME, NC_FLOAT, 1, &dims[1], &lat_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LON_NAME, NC_FLOAT, 1, &dims[2], &lon_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, Z_NAME, NC_SHORT, 3, dims, &z_id))) ERR(retval)
    if ((retval = nc_put_att_double(ncid, z_id, SCALE_FACTOR, NC_DOUBLE, 1, &escala))) ERR(retval)
    if ((retval = nc_put_att_double(ncid, z_id, OFFSET, NC_DOUBLE, 1, &desplazamiento))) ERR(retval)
    if ((retval = nc_put_att_text(ncid, z_id, LONG_NAME, strlen("Geopotential"), "Geopotential"))) ERR(retval)
    if ((retval = nc_enddef(ncid))) ERR(retval)
    if ((retval = nc_put_var_int(ncid, time_id, tiempos))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lat_id, lats))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lon_id, lons))) ERR(retval)
    if ((retval = nc_put_var_short(ncid, z_id, &datos[0][0]))) ERR(retval)
    if ((retval = nc_close(ncid))) ERR(retval)
}

int main(int argc, char **argv) {
    bool irregular = argc > 1 && strcmp(argv[1], "irregular") == 0;
    const char *ruta = irregular ? "resolucion_irregular.nc" : "resolucion_medio_grado.nc";
    int ncid, retval;

    for (int i = 0; i < N_LAT; i++) lats[i] = 90.0f - 0.5f * i;
    for (int j = 0; j < N_LON; j++) lons[j] = -180.0f + 0.5f * j;
    if (irregular) lats[1] = 89.75f;  // un paso de 0,25° seguido de uno de 0,75°

    // Campo plano z = 100·lat + 10·lon: la interpolación bilineal lo reproduce exactamente.
    for (int i = 0; i < N_LAT; i++)
        for (int j = 0; j < N_LON; j++)
            datos[i][j] = (short)(100 * lats[i] + 10 * lons[j]);
    crear_nc(ruta);

    char nombre_largo[NC_MAX_NAME + 1] = "";
    double escala, desplazamiento;
    if ((retval = nc_open(ruta, NC_NOWRITE, &ncid))) ERR(retval)
    extract_nc_data(ncid);
    static float lats_leidas[N_LAT], lons_leidas[N_LON];
    init_nc_variables(ncid, lats_leidas, lons_leidas, &escala, &desplazamiento, nombre_largo);

    if (irregular) {
        printf("FALLO: init_nc_variables aceptó una rejilla con paso de latitud no uniforme\n");
        return 1;
    }

    static short *filas[N_LAT];
    for (int i = 0; i < N_LAT; i++) filas[i] = datos[i];

    // Punto con la misma fracción de celda en latitud y en longitud (0,6): aísla la resolución.
    short z = 0, esperado = (short)round(100 * 45.3 + 10 * 10.3);
    bool ok = bilinear_interpolation(create_point(45.3f, 10.3f), filas, lats_leidas, lons_leidas, &z);
    printf("RES=%g; interpolación en (45.3, 10.3) sobre 0,5°: ok=%d z=%d (esperado RES=0.5 ok=1 z=%d)\n",
           (double)RES, ok, ok ? z : 0, esperado);

    return !(RES == 0.5 && ok && z == esperado);
}
