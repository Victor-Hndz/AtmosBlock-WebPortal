// ALG-113: init_nc_variables rechaza una variable z que no tenga 3 dimensiones (tiempo, latitud, longitud).
// Termina el proceso con exit(EXIT_FAILURE): CTest comprueba el mensaje (PASS_REGULAR_EXPRESSION).
#include "../libraries/lib.h"
#include "../libraries/init.h"

#define FILAS 3
#define COLUMNAS 4

int main(void) {
    const char *ruta = "init_dimensiones_2d.nc";
    int ncid, retval, dims[3], time_id, lat_id, lon_id, z_id;
    int tiempos[1] = {0};
    float lats[FILAS] = {90, 45, 0}, lons[COLUMNAS] = {-180, -90, 0, 90};
    short z[FILAS][COLUMNAS] = {{0}};

    if ((retval = nc_create(ruta, NC_CLOBBER, &ncid))) ERR(retval)
    if ((retval = nc_def_dim(ncid, REC_NAME, 1, &dims[0]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LAT_NAME, FILAS, &dims[1]))) ERR(retval)
    if ((retval = nc_def_dim(ncid, LON_NAME, COLUMNAS, &dims[2]))) ERR(retval)
    if ((retval = nc_def_var(ncid, REC_NAME, NC_INT, 1, &dims[0], &time_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LAT_NAME, NC_FLOAT, 1, &dims[1], &lat_id))) ERR(retval)
    if ((retval = nc_def_var(ncid, LON_NAME, NC_FLOAT, 1, &dims[2], &lon_id))) ERR(retval)
    // z sin la dimensión temporal: (latitud, longitud)
    if ((retval = nc_def_var(ncid, Z_NAME, NC_SHORT, 2, &dims[1], &z_id))) ERR(retval)
    if ((retval = nc_enddef(ncid))) ERR(retval)
    if ((retval = nc_put_var_int(ncid, time_id, tiempos))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lat_id, lats))) ERR(retval)
    if ((retval = nc_put_var_float(ncid, lon_id, lons))) ERR(retval)
    if ((retval = nc_put_var_short(ncid, z_id, &z[0][0]))) ERR(retval)
    if ((retval = nc_close(ncid))) ERR(retval)

    char nombre_largo[NC_MAX_NAME + 1] = "";
    double escala, desplazamiento;
    if ((retval = nc_open(ruta, NC_NOWRITE, &ncid))) ERR(retval)
    extract_nc_data(ncid);
    float lats_leidas[NLAT], lons_leidas[NLON];
    init_nc_variables(ncid, lats_leidas, lons_leidas, &escala, &desplazamiento, nombre_largo);

    printf("FALLO: init_nc_variables aceptó una variable z de 2 dimensiones\n");
    return 1;
}
