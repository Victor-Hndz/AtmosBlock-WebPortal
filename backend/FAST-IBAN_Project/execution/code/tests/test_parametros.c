// ALG-305 (L4): lectura de config/params.yaml.
// Sin argumentos: el fichero por defecto da los valores con los que se generaron las líneas base.
// Con un fichero incorrecto: cargar_parametros termina con un mensaje (PASS_REGULAR_EXPRESSION).
#include "../libraries/lib.h"
#include "../libraries/init.h"

static int fallos = 0;

static void comprobar(bool condicion, const char *texto) {
    if (!condicion) {
        printf("FALLO: %s\n", texto);
        fallos++;
    }
}

int main(int argc, char **argv) {
    cargar_parametros(argc > 1 ? argv[1] : NULL);
    if (argc > 1) {
        printf("FALLO: cargar_parametros aceptó %s\n", argv[1]);
        return 1;
    }

    comprobar(PARAMS.candidate_spacing_deg == 1.0, "candidate_spacing_deg == 1.0");  // ALG-359
    comprobar(PARAMS.n_rays == 64, "n_rays == 64");
    comprobar(PARAMS.ray_distance_km == 500, "ray_distance_km == 500");
    comprobar(PARAMS.pass_fraction == 0.9, "pass_fraction == 0.9");
    comprobar(PARAMS.contour_step_m == 20, "contour_step_m == 20");
    comprobar(PARAMS.search_radius_km == 3000, "search_radius_km == 3000");
    comprobar(PARAMS.contour_ray_step_km == 25, "contour_ray_step_km == 25");  // ALG-360
    comprobar(PARAMS.cluster_lat_min_deg == 30, "cluster_lat_min_deg == 30");
    comprobar(PARAMS.cluster_lat_max_deg == 85, "cluster_lat_max_deg == 85");
    comprobar(PARAMS.min_cluster_area_km2 == 22000, "min_cluster_area_km2 == 22000");  // ALG-306
    comprobar(PARAMS.rex_max_offset_km == 700, "rex_max_offset_km == 700");  // ALG-364

    if (fallos == 0)
        printf("OK: parámetros por defecto\n");
    return fallos != 0;
}
