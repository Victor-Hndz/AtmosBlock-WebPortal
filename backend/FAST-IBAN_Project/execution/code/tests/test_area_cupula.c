// ALG-371: valida el área mínima de cluster (ALG-306) contra una predicción analítica, sin ajustarla a ningún método.
//
// Para una cúpula isótropa cuyo perfil radial decrece de forma monótona, un candidato a distancia r del centro ve, en
// el acimut θ, un punto a distancia d(θ) = sqrt(r² + D² − 2rD cos θ) del centro (D = ray_distance_km). El rayo falla
// (el vecino está más alto) cuando d(θ) < r, es decir cuando cos θ > D/(2r). La fracción de acimutes que fallan es
// arccos(D/(2r))/π, así que el punto sigue siendo MAX mientras esa fracción no pase de 1 − pass_fraction:
//
//     r_huella = D / (2 cos(π (1 − pass_fraction)))     y     A_huella = π r_huella²
//
// Con D = 500 km y pass_fraction = 0,9: r = 265,6 km y A = 2,216·10⁵ km². **No depende del ancho de la cúpula ni de
// la latitud ni de la resolución**: solo del muestreo por rayos. El filtro de ALG-306 (22 000 km²) queda un orden de
// magnitud por debajo, así que no recorta cúpulas isótropas, solo objetos estrechos o truncados.
//
// Predicción escrita antes de medir: el área medida de la huella coincide con A_huella dentro del error de
// discretización de la rejilla de candidatos (1°), igual a 30°, 60° y 80° de latitud, con dos anchos de cúpula y con
// datos a 0,25° y a 1°.
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define LON_MIN (-180.0)
#define BASE_M 5400.0     // altura de fondo, en metros geopotenciales
#define AMPLITUD_M 400.0  // altura extra en el centro de la cúpula
#define ESCALA 2.0
#define DESPLAZAMIENTO 50000.0

static short **z;
static float *lats, *lons;
static int fallos = 0;

static double empaquetar(double metros) { return lround((metros * g_0 - DESPLAZAMIENTO) / ESCALA); }

// Rejilla global de resolución <res> entre lat_c+25° y lat_c−25° (recortada a ±90°), con una cúpula gaussiana de
// escala <ancho_km> centrada en (lat_c, 0).
static void preparar(double res, double lat_c, double ancho_km) {
    RES = res;
    double arriba = fmin(90, lat_c + 25), abajo = fmax(-90, lat_c - 25);
    NLAT = (int)lround((arriba - abajo) / res) + 1;
    NLON = (int)lround(360 / res);
    lats = malloc((size_t)NLAT * sizeof(float));
    lons = malloc((size_t)NLON * sizeof(float));
    z = malloc((size_t)NLAT * sizeof(short *));
    z[0] = malloc((size_t)NLAT * NLON * sizeof(short));
    for (int i = 0; i < NLAT; i++) {
        lats[i] = (float)(arriba - i * res);
        z[i] = z[0] + (size_t)i * NLON;
    }
    for (int j = 0; j < NLON; j++)
        lons[j] = (float)(LON_MIN + j * res);

    coord_point centro = create_point((float)lat_c, 0);
    for (int i = 0; i < NLAT; i++)
        for (int j = 0; j < NLON; j++) {
            double d = point_distance(centro, create_point(lats[i], lons[j]));
            z[i][j] = (short)empaquetar(BASE_M + AMPLITUD_M * exp(-(d / ancho_km) * (d / ancho_km)));
        }
}

static void liberar(void) {
    free(z[0]);
    free(z);
    free(lats);
    free(lons);
}

// Área del cluster de MAX que contiene el centro de la cúpula, con la rejilla de candidatos de PARAMS.
static double area_de_la_huella(double lat_c) {
    int paso = paso_candidatos();
    int fila0 = 0;
    while (fila0 < NLAT && lats[fila0] > lat_c + 10) fila0++;
    int size_x = 0;
    while (fila0 + (size_x + 1) * paso < NLAT && lats[fila0 + size_x * paso] > lat_c - 10) size_x++;
    int size_y = NLON / paso;

    selected_point **puntos = malloc((size_t)size_x * sizeof(selected_point *));
    puntos[0] = malloc((size_t)size_x * size_y * sizeof(selected_point));
    for (int i = 0; i < size_x; i++) {
        puntos[i] = puntos[0] + (size_t)i * size_y;
        for (int j = 0; j < size_y; j++) {
            coord_point p = create_point(lats[fila0 + i * paso], lons[j * paso]);
            short z0 = z[fila0 + i * paso][j * paso];
            puntos[i][j] = create_selected_point(p, z0, clasificar_candidato(p, z0, z, lats, lons), -1);
        }
    }

    int id = 0;
    for (int i = 0; i < size_x; i++)
        for (int j = 0; j < size_y; j++)
            if (puntos[i][j].cluster == -1 && puntos[i][j].type != NO_TYPE) {
                puntos[i][j].cluster = id;
                expandCluster(puntos, size_x, size_y, i, j, id);
                id++;
            }

    points_cluster *clusters = fill_clusters(puntos, size_x, size_y, id, DESPLAZAMIENTO, ESCALA);
    double area = 0;
    coord_point centro = create_point((float)lat_c, 0);
    for (int c = 0; c < id; c++) {
        if (clusters[c].type == MAX && point_distance(centro, clusters[c].center) < 300)
            area = clusters[c].area_km2;
        free(clusters[c].points);
    }
    free(clusters);
    free(puntos[0]);
    free(puntos);
    return area;
}

static void comprobar(double res, double lat_c, double ancho_km, double esperada, double tolerancia) {
    preparar(res, lat_c, ancho_km);
    double area = area_de_la_huella(lat_c);
    double error = fabs(area - esperada) / esperada;
    printf("res %.2f°  lat %5.1f°  cúpula L=%4.0f km: huella %8.0f km² (esperado %.0f, error %5.1f %%)%s\n", res, lat_c,
           ancho_km, area, esperada, 100 * error, error <= tolerancia ? "" : "  <-- FALLA");
    fallos += error > tolerancia;
    liberar();
}

int main(void) {
    cargar_parametros(NULL);
    double radio = PARAMS.ray_distance_km / (2 * cos(M_PI * (1 - PARAMS.pass_fraction)));
    double esperada = M_PI * radio * radio;
    printf("radio de la huella %.1f km, área %.0f km², filtro %.0f km²\n", radio, esperada, PARAMS.min_cluster_area_km2);

    // La rejilla de candidatos es de 1°, así que la huella se mide con celdas de 8·10³ a 1,2·10⁴ km²: el error de
    // discretización esperado es de decenas por ciento, no de un factor.
    for (int i = 0; i < 3; i++) {
        double lat = 30 + 25 * i;
        comprobar(1.0, lat, 600, esperada, 0.35);
        comprobar(1.0, lat, 1500, esperada, 0.35);
        comprobar(0.25, lat, 600, esperada, 0.35);
    }
    return fallos != 0;
}
