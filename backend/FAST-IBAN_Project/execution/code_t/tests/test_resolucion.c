// ALG-301 (L1): la variante de temperatura lee la resolución de la rejilla del NetCDF, no de un #define.
// Sin argumentos: rejilla de 0,5°; RES debe valer 0,5 (lo usan la fila de LAT_LIM_MIN, eps y el redondeo de centroides).
// "irregular": paso de latitud no uniforme; init_nc_variables termina con un mensaje (PASS_REGULAR_EXPRESSION).
#include "../lib/lib.h"

#define N_LAT 361
#define N_LON 720

static float lats[N_LAT], lons[N_LON];
static short datos[N_LAT][N_LON];

static void crear_nc(const char *ruta) {
    int ncid, retval, dims[3], time_id, lat_id, lon_id, t_id;
    int tiempos[1] = {0};
    double escala = 1.0, desplazamiento = 0.0;

    if ((retval = nc_create(ruta, NC_CLOBBER, &ncid))) ERR(retval)
    if ((retval = nc_def_dim(ncid, REC_NAME, 1, &dims[0]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LAT_NAME, N_LAT, &dims[1]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LON_NAME, N_LON, &dims[2]))) ERR(retval)
    if ((retval = nc_def_var(ncid, REC_NAME, NC_INT, 1, &dims[0], &time_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LAT_NAME, NC_FLOAT, 1, &dims[1], &lat_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LON_NAME, NC_FLOAT, 1, &dims[2], &lon_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, T_NAME, NC_SHORT, 3, dims, &t_id))) ERR(retval)
    if ((retval = nc_put_att_double(ncid, t_id, SCALE_FACTOR, NC_DOUBLE, 1, &escala))) ERR(retval)
    if ((retval = nc_put_att_double(ncid, t_id, OFFSET, NC_DOUBLE, 1, &desplazamiento))) ERR(retval)
    if ((retval = nc_put_att_text(ncid, t_id, LONG_NAME, strlen("Temperature"), "Temperature"))) ERR(retval)
    if ((retval = nc_enddef(ncid))) ERR(retval)
    if ((retval = nc_put_var_int(ncid, time_id, tiempos))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lat_id, lats))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lon_id, lons))) ERR(retval)
    if ((retval = nc_put_var_short(ncid, t_id, &datos[0][0]))) ERR(retval)
    if ((retval = nc_close(ncid))) ERR(retval)
}

int main(int argc, char **argv) {
    bool irregular = argc > 1 && strcmp(argv[1], "irregular") == 0;
    const char *ruta = irregular ? "resolucion_irregular_t.nc" : "resolucion_medio_grado_t.nc";
    int ncid, retval;

    for (int i = 0; i < N_LAT; i++) lats[i] = 90.0f - 0.5f * i;
    for (int j = 0; j < N_LON; j++) lons[j] = -180.0f + 0.5f * j;
    if (irregular) lats[1] = 89.75f;  // un paso de 0,25° seguido de uno de 0,75°
    crear_nc(ruta);

    if ((retval = nc_open(ruta, NC_NOWRITE, &ncid))) ERR(retval)
    extract_nc_data(ncid);

    // Memoria contigua time × lat × lon, como en FAST_IBAN_main.c.
    short ***t_in = malloc(NTIME * sizeof(short **));
    t_in[0] = malloc(sizeof(short *) * NTIME * NLAT);
    t_in[0][0] = malloc(sizeof(short) * NTIME * NLAT * NLON);
    for (int i = 0; i < NTIME * NLAT; i++) t_in[0][i] = t_in[0][0] + i * NLON;

    char nombre_largo[NC_MAX_NAME + 1] = "";
    double escala, desplazamiento;
    static float lats_leidas[N_LAT], lons_leidas[N_LON];
    init_nc_variables(ncid, t_in, lats_leidas, lons_leidas, &escala, &desplazamiento, nombre_largo);

    if (irregular) {
        printf("FALLO: init_nc_variables aceptó una rejilla con paso de latitud no uniforme\n");
        return 1;
    }

    printf("RES=%g sobre una rejilla de 0,5° (esperado 0.5)\n", (double)RES);
    return RES != 0.5;
}
