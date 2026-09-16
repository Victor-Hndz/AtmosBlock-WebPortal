// ALG-308: degrada un NetCDF global a `factor`·resolución con el promedio de área de degradar.h y reempaqueta en int16
// con el mismo scale_factor y add_offset (docs/invariancia_resolucion.md §2). Lee y escribe paso a paso.
// Uso: degradar_nc <origen.nc> <destino.nc> <variable> <factor 2|4>
#include <netcdf.h>
#include <stdio.h>
#include <string.h>
#include "degradar.h"

#define ERR(e) {if (e != NC_NOERR) {fprintf(stderr, "Error: %s\n", nc_strerror(e)); exit(EXIT_FAILURE);}}

static size_t longitud_dim(int ncid, const char *nombre) {
    int retval, dimid;
    size_t n;
    if ((retval = nc_inq_dimid(ncid, nombre, &dimid))) ERR(retval)
    if ((retval = nc_inq_dimlen(ncid, dimid, &n))) ERR(retval)
    return n;
}

int main(int argc, char **argv) {
    if (argc != 5 || (atoi(argv[4]) != 2 && atoi(argv[4]) != 4)) {
        fprintf(stderr, "Uso: %s <origen.nc> <destino.nc> <variable> <factor 2|4>\n", argv[0]);
        return 2;
    }
    const char *variable = argv[3];
    int f = atoi(argv[4]), retval, ent, sal, varid, lat_id, lon_id, dims[3], time_id, lat_out, lon_out, var_out;

    if ((retval = nc_open(argv[1], NC_NOWRITE, &ent))) ERR(retval)
    size_t n_time = longitud_dim(ent, "time"), n_lat = longitud_dim(ent, "latitude"), n_lon = longitud_dim(ent, "longitude");
    float *lats = malloc(n_lat * sizeof(float)), *lons = malloc(n_lon * sizeof(float));
    if ((retval = nc_inq_varid(ent, "latitude", &lat_id))) ERR(retval)
    if ((retval = nc_inq_varid(ent, "longitude", &lon_id))) ERR(retval)
    if ((retval = nc_get_var_float(ent, lat_id, lats))) ERR(retval)
    if ((retval = nc_get_var_float(ent, lon_id, lons))) ERR(retval)
    double res = lats[0] - lats[1];
    if (res <= 0 || fabs(n_lon * res - 360) > 1e-3 || n_lon % f != 0) {
        fprintf(stderr, "Error: hace falta una rejilla global con latitudes descendentes y %zu longitudes múltiplo de %d\n", n_lon, f);
        return 1;
    }
    size_t filas = (n_lat - 1) / f + 1, columnas = n_lon / f;

    double escala, desplazamiento;
    char nombre_largo[NC_MAX_NAME + 1] = "";
    if ((retval = nc_inq_varid(ent, variable, &varid))) ERR(retval)
    if ((retval = nc_get_att_double(ent, varid, "scale_factor", &escala))) ERR(retval)
    if ((retval = nc_get_att_double(ent, varid, "add_offset", &desplazamiento))) ERR(retval)
    if ((retval = nc_get_att_text(ent, varid, "long_name", nombre_largo))) ERR(retval)

    float *lats_out = malloc(filas * sizeof(float)), *lons_out = malloc(columnas * sizeof(float));
    for (size_t i = 0; i < filas; i++) lats_out[i] = lats[i * f];
    for (size_t j = 0; j < columnas; j++) lons_out[j] = lons[j * f];

    int *tiempos = calloc(n_time, sizeof(int));  // el núcleo solo usa el número de pasos
    if ((retval = nc_create(argv[2], NC_CLOBBER, &sal))) ERR(retval)
    if ((retval = nc_def_dim(sal, "time", n_time, &dims[0]))) ERR(retval)
    if ((retval = nc_def_dim(sal, "latitude", filas, &dims[1]))) ERR(retval)
    if ((retval = nc_def_dim(sal, "longitude", columnas, &dims[2]))) ERR(retval)
    if ((retval = nc_def_var(sal, "time", NC_INT, 1, &dims[0], &time_id))) ERR(retval)
    if ((retval = nc_def_var(sal, "latitude", NC_FLOAT, 1, &dims[1], &lat_out))) ERR(retval)
    if ((retval = nc_def_var(sal, "longitude", NC_FLOAT, 1, &dims[2], &lon_out))) ERR(retval)
    if ((retval = nc_def_var(sal, variable, NC_SHORT, 3, dims, &var_out))) ERR(retval)
    if ((retval = nc_put_att_double(sal, var_out, "scale_factor", NC_DOUBLE, 1, &escala))) ERR(retval)
    if ((retval = nc_put_att_double(sal, var_out, "add_offset", NC_DOUBLE, 1, &desplazamiento))) ERR(retval)
    if ((retval = nc_put_att_text(sal, var_out, "long_name", strlen(nombre_largo), nombre_largo))) ERR(retval)
    if ((retval = nc_enddef(sal))) ERR(retval)
    if ((retval = nc_put_var_int(sal, time_id, tiempos))) ERR(retval)
    if ((retval = nc_put_var_float(sal, lat_out, lats_out))) ERR(retval)
    if ((retval = nc_put_var_float(sal, lon_out, lons_out))) ERR(retval)

    short *paso = malloc(n_lat * n_lon * sizeof(short)), *paso_out = malloc(filas * columnas * sizeof(short));
    double *z = malloc(n_lat * n_lon * sizeof(double)), *z_out = malloc(filas * columnas * sizeof(double));
    for (size_t t = 0; t < n_time; t++) {
        size_t inicio[3] = {t, 0, 0}, cuenta[3] = {1, n_lat, n_lon}, cuenta_out[3] = {1, filas, columnas};
        if ((retval = nc_get_vara_short(ent, varid, inicio, cuenta, paso))) ERR(retval)
        for (size_t k = 0; k < n_lat * n_lon; k++) z[k] = paso[k] * escala + desplazamiento;
        promedio_area(z, (int)n_lat, (int)n_lon, lats[0], res, f, z_out);
        for (size_t k = 0; k < filas * columnas; k++)
            paso_out[k] = (short)fmin(32767, fmax(-32768, lround((z_out[k] - desplazamiento) / escala)));
        if ((retval = nc_put_vara_short(sal, var_out, inicio, cuenta_out, paso_out))) ERR(retval)
    }
    if ((retval = nc_close(sal))) ERR(retval)
    if ((retval = nc_close(ent))) ERR(retval)

    printf("%s: %zu pasos, %zu filas (%.2f a %.2f), %zu columnas, factor %d\n", argv[2], n_time, filas, lats_out[0], lats_out[filas - 1], columnas, f);
    free(lats); free(lons); free(lats_out); free(lons_out); free(tiempos); free(paso); free(paso_out); free(z); free(z_out);
    return 0;
}
