// ALG-360: las comprobaciones de contorno no deben depender de la latitud, de la resolución ni del antimeridiano.
// Campos sintéticos definidos en km sobre una rejilla global: la misma estructura física debe dar la misma respuesta.
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define N_LAT_MAX 721
#define N_LON_MAX 1440
#define ESCALA 2.0
#define DESPLAZAMIENTO 50000.0
#define NIVEL 5600                  // m de altura geopotencial
#define FONDO_M 5500.0
#define AMPLITUD_M 300.0            // el alto supera NIVEL hasta ~734 km del centro
#define SIGMA_KM 700.0
#define SIN_DORSAL -1.0             // acimut de la dorsal estrecha que no cruza NIVEL antes del radio de búsqueda
#define DORSAL_SEMIANCHO 17.0
#define DORSAL_M 5800.0

static float lats[N_LAT_MAX], lons[N_LON_MAX];
static short datos[N_LAT_MAX][N_LON_MAX];
static short *filas[N_LAT_MAX];
static int fallos = 0;

static double acimut(coord_point a, coord_point b) {
    double f1 = a.lat * M_PI / 180, f2 = b.lat * M_PI / 180, dl = (b.lon - a.lon) * M_PI / 180;
    double t = atan2(sin(dl) * cos(f2), cos(f1) * sin(f2) - sin(f1) * cos(f2) * cos(dl)) * 180 / M_PI;
    return t < 0 ? t + 360 : t;
}

// Rejilla global de paso `res` con un alto gaussiano en `centro` y, si dorsal >= 0, una dorsal hacia ese acimut.
static void preparar(double res, coord_point centro, double dorsal) {
    RES = res;
    NLAT = (int)lround(180 / res) + 1;
    NLON = (int)lround(360 / res);
    LAT_LIM_MIN = -80;
    FILA_LAT_MIN = (int)lround((90 - LAT_LIM_MIN) / res);
    for (int i = 0; i < NLAT; i++) {
        lats[i] = (float)(90 - i * res);
        filas[i] = datos[i];
    }
    for (int j = 0; j < NLON; j++)
        lons[j] = (float)(-180 + j * res);
    for (int i = 0; i < NLAT; i++) {
        for (int j = 0; j < NLON; j++) {
            coord_point p = create_point(lats[i], lons[j]);
            double d = point_distance(centro, p);
            double h = FONDO_M + AMPLITUD_M * exp(-(d / SIGMA_KM) * (d / SIGMA_KM));
            double diferencia = fabs(fmod(acimut(centro, p) - dorsal + 540, 360) - 180);
            if (dorsal >= 0 && d > 50 && d < 3500 && diferencia <= DORSAL_SEMIANCHO)
                h = DORSAL_M;
            datos[i][j] = (short)lround((h * g_0 - DESPLAZAMIENTO) / ESCALA);
        }
    }
}

// Cluster MAX en `centro` con los extremos de sus rayos calculados sobre la rejilla actual.
// ponytail: no se libera `extremos`; el test termina enseguida.
static points_cluster maximo(coord_point centro) {
    points_cluster c;
    memset(&c, 0, sizeof(c));
    c.type = MAX;
    c.center = centro;
    calcular_extremos_rayos(&c, filas, lats, lons, ESCALA, DESPLAZAMIENTO);
    return c;
}

static void comprobar(const char *caso, bool obtenido, bool esperado) {
    printf("%-58s %s (esperado %s)%s\n", caso, obtenido ? "cierto" : "falso", esperado ? "cierto" : "falso",
           obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

int main(void) {
    cargar_parametros(NULL);

    // Controles: alto aislado lejos del antimeridiano, cerrado a 0,25° y a 1°.
    coord_point centro = create_point(50, 0);
    preparar(0.25, centro, SIN_DORSAL);
    comprobar("alto en (50, 0) a 0,25°: contorno cerrado", check_closed_contour(maximo(centro), NIVEL), true);
    preparar(1.0, centro, SIN_DORSAL);
    comprobar("alto en (50, 0) a 1°: contorno cerrado", check_closed_contour(maximo(centro), NIVEL), true);

    // Antimeridiano: el mismo alto, junto a ±180°.
    centro = create_point(50, 179.75);
    preparar(0.25, centro, SIN_DORSAL);
    comprobar("alto en (50, 179.75): contorno cerrado", check_closed_contour(maximo(centro), NIVEL), true);

    // Latitud, sector sur (control): dorsal a 30° al este del sur, dentro de ±45°: no todo el sur cruza.
    for (double lat = 45; lat <= 75; lat += 30) {
        centro = create_point(lat, 0);
        preparar(0.25, centro, 150);
        char caso[80];
        snprintf(caso, sizeof(caso), "dorsal a 150° desde (%g, 0): todo el sector sur cruza", lat);
        comprobar(caso, check_contour_dir_rex(maximo(centro), NIVEL, 1, 0), false);
    }

    // Latitud, sector este: dorsal de 141° a 175°, fuera del este geodésico (45°-135°): todo el este cruza a cualquier
    // latitud. Con direcciones enteras, a 30°N la más abierta del "este" apunta a ~139° y no entra; a 75°N la (1,1)
    // sale a ~165° y su rumbo gira despacio al bajar de latitud, así que sigue dentro de la dorsal hasta el radio.
    for (double lat = 30; lat <= 75; lat += 45) {
        centro = create_point(lat, 0);
        preparar(0.25, centro, 158);
        char caso[80];
        snprintf(caso, sizeof(caso), "dorsal a 158° desde (%g, 0): todo el sector este cruza", lat);
        comprobar(caso, check_contour_dir_rex(maximo(centro), NIVEL, 0, 1), true);
    }

    return fallos != 0;
}
