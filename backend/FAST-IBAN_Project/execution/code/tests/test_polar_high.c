// ALG-310/311: un máximo cuyo centro queda más allá de la guarda polar, 90 − (ray_distance_km/R)·180/π, se exporta como
// POLAR_HIGH (sin mínimos) y no se evalúa como Omega ni Rex; dentro de la guarda no. En ambos hemisferios.
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define N_LAT 721
#define N_LON 1440
#define ESCALA 2.0
#define DESPLAZAMIENTO 50000.0

static float lats[N_LAT], lons[N_LON];
static short datos[N_LAT][N_LON];
static short *filas[N_LAT];
static int fallos = 0;

// Rejilla global de 0,25° con un alto gaussiano (300 m, 700 km) sobre 5500 m, centrado en `centro`.
static void preparar(coord_point centro) {
    RES = 0.25;
    NLAT = N_LAT;
    NLON = N_LON;
    LAT_LIM_MIN = -90;
    LAT_LIM_MAX = 90;
    calcular_dominio_latitudes();  // ALG-374
    FILA_LAT_MIN = N_LAT - 1;
    for (int i = 0; i < N_LAT; i++) {
        lats[i] = (float)(90 - i * 0.25);
        filas[i] = datos[i];
    }
    for (int j = 0; j < N_LON; j++)
        lons[j] = (float)(-180 + j * 0.25);
    for (int i = 0; i < N_LAT; i++)
        for (int j = 0; j < N_LON; j++) {
            double d = point_distance(centro, create_point(lats[i], lons[j]));
            double h = 5500 + 300 * exp(-(d / 700) * (d / 700));
            datos[i][j] = (short)lround((h * g_0 - DESPLAZAMIENTO) / ESCALA);
        }
}

// ¿Escribe search_formation un POLAR_HIGH para un único máximo en `centro`?
static bool es_polar_high(coord_point centro) {
    preparar(centro);
    points_cluster c;
    memset(&c, 0, sizeof(c));
    c.type = MAX;
    c.center = centro;
    char ruta[] = "polar_high_formaciones.csv";
    remove(ruta);
    search_formation(&c, 1, filas, lats, lons, ESCALA, DESPLAZAMIENTO, ruta, 0);
    FILE *fp = fopen(ruta, "r");
    char linea[128] = "";
    bool encontrado = false;
    while (fp != NULL && fgets(linea, sizeof(linea), fp) != NULL)
        // ALG-376: la última columna (truncada) depende de si el fichero sintético llega al borde.
        encontrado = encontrado || strncmp(linea, "0,0,-1,-1,POLAR_HIGH", 20) == 0;
    if (fp != NULL)
        fclose(fp);
    return encontrado;
}

static void comprobar(const char *caso, bool obtenido, bool esperado) {
    printf("%-50s %s (esperado %s)%s\n", caso, obtenido ? "cierto" : "falso", esperado ? "cierto" : "falso",
           obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

int main(void) {
    cargar_parametros(NULL);
    printf("guarda polar: %.3f°\n", guarda_polar_deg());
    comprobar("guarda polar ≈ 85,50° con ray_distance_km = 500", fabs(guarda_polar_deg() - 85.503) < 0.01, true);
    comprobar("máximo en 88°N: POLAR_HIGH", es_polar_high(create_point(88, 30)), true);
    comprobar("máximo en 88°S: POLAR_HIGH", es_polar_high(create_point(-88, 30)), true);
    comprobar("máximo en 80°N (dentro de la guarda): no", es_polar_high(create_point(80, 30)), false);
    return fallos != 0;
}
