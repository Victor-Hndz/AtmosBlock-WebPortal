// ALG-302: genera variantes de un caso fijo para probar rejillas que no empiezan en 90°N o no son de 0,25°.
// Copia las filas con latitud <= <lat_superior> tomando 1 de cada <salto> puntos en latitud y longitud
// (valores reales, sin interpolar). Solo usa NetCDF, así que lo comparten code/ y code_t/.
// Uso: recortar_nc <origen.nc> <destino.nc> <variable> <lat_superior> <salto>
#include <netcdf.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define ERR(e) {if (e != NC_NOERR) {fprintf(stderr, "Error: %s\n", nc_strerror(e)); exit(EXIT_FAILURE);}}

static size_t longitud_dim(int ncid, const char *nombre) {
    int retval, dimid;
    size_t n;
    if ((retval = nc_inq_dimid(ncid, nombre, &dimid))) ERR(retval)
    if ((retval = nc_inq_dimlen(ncid, dimid, &n))) ERR(retval)
    return n;
}

int main(int argc, char **argv) {
    if (argc != 6) {
        fprintf(stderr, "Uso: %s <origen.nc> <destino.nc> <variable> <lat_superior> <salto>\n", argv[0]);
        return 2;
    }
    const char *variable = argv[3];
    double lat_superior = atof(argv[4]);
    size_t salto = (size_t)atoi(argv[5]);
    int retval, ent, sal, varid, lat_id, lon_id, dims[3], time_id, lat_out, lon_out, var_out;

    if ((retval = nc_open(argv[1], NC_NOWRITE, &ent))) ERR(retval)
    size_t n_time = longitud_dim(ent, "time"), n_lat = longitud_dim(ent, "latitude"), n_lon = longitud_dim(ent, "longitude");
    float *lats = malloc(n_lat * sizeof(float)), *lons = malloc(n_lon * sizeof(float));
    if ((retval = nc_inq_varid(ent, "latitude", &lat_id))) ERR(retval)
    if ((retval = nc_inq_varid(ent, "longitude", &lon_id))) ERR(retval)
    if ((retval = nc_get_var_float(ent, lat_id, lats))) ERR(retval)
    if ((retval = nc_get_var_float(ent, lon_id, lons))) ERR(retval)

    size_t fila0 = 0;
    while (fila0 < n_lat && lats[fila0] > lat_superior + 1e-4) fila0++;
    size_t filas = (n_lat - fila0 - 1) / salto + 1, columnas = (n_lon - 1) / salto + 1;

    float *lats_out = malloc(filas * sizeof(float)), *lons_out = malloc(columnas * sizeof(float));
    for (size_t i = 0; i < filas; i++) lats_out[i] = lats[fila0 + i * salto];
    for (size_t j = 0; j < columnas; j++) lons_out[j] = lons[j * salto];

    short *datos = malloc(n_time * filas * columnas * sizeof(short));
    size_t start[3] = {0, fila0, 0}, count[3] = {n_time, filas, columnas};
    ptrdiff_t stride[3] = {1, (ptrdiff_t)salto, (ptrdiff_t)salto};
    if ((retval = nc_inq_varid(ent, variable, &varid))) ERR(retval)
    if ((retval = nc_get_vars_short(ent, varid, start, count, stride, datos))) ERR(retval)

    double escala, desplazamiento;
    char nombre_largo[NC_MAX_NAME + 1] = "";
    if ((retval = nc_get_att_double(ent, varid, "scale_factor", &escala))) ERR(retval)
    if ((retval = nc_get_att_double(ent, varid, "add_offset", &desplazamiento))) ERR(retval)
    if ((retval = nc_get_att_text(ent, varid, "long_name", nombre_largo))) ERR(retval)

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
    if ((retval = nc_put_var_short(sal, var_out, datos))) ERR(retval)
    if ((retval = nc_close(sal))) ERR(retval)
    if ((retval = nc_close(ent))) ERR(retval)

    printf("%s: %zu pasos, %zu filas (%.2f a %.2f), %zu columnas\n", argv[2], n_time, filas, lats_out[0], lats_out[filas - 1], columnas);
    free(lats); free(lons); free(lats_out); free(lons_out); free(datos); free(tiempos);
    return 0;
}
