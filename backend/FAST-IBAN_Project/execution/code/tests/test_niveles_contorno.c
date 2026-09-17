// ALG-360: los niveles de contorno de un máximo son todos los múltiplos de contour_step_m entre el mínimo de la altura a
// lo largo del rayo hacia el polo (sin incluirlo) y la altura del centro (incluida), sin saltos aunque la rejilla sea
// gruesa. Antes se tomaban los niveles de las celdas que pisaba el camino hacia el norte: a 1°, con 40 m por celda,
// se probaba un nivel de cada dos.
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define ESCALA 2.0
#define DESPLAZAMIENTO 50000.0
#define ALTURA_CENTRO_M 5800
#define GRADIENTE_M_POR_GRADO 40.0
#define NIVEL_MAS_BAJO_M 4740  // el rayo hacia el polo llega a 3000 km (~27°): mínimo ≈ 5800 - 40·26,98 ≈ 4720,8 m

static float lats[181], lons[360];
static short datos[181][360];
static short *filas[181];

int main(void) {
    cargar_parametros(NULL);
    RES = 1.0;
    NLAT = 181;
    NLON = 360;
    LAT_LIM_MIN = -80;
    LAT_LIM_MAX = 90;
    calcular_dominio_latitudes();  // ALG-374
    FILA_LAT_MIN = 170;
    for (int i = 0; i < NLAT; i++) {
        lats[i] = (float)(90 - i);
        filas[i] = datos[i];
    }
    for (int j = 0; j < NLON; j++)
        lons[j] = (float)(-180 + j);
    // Máximo en 45°N con 40 m por grado de latitud hacia ambos lados.
    for (int i = 0; i < NLAT; i++)
        for (int j = 0; j < NLON; j++)
            datos[i][j] = (short)lround(((ALTURA_CENTRO_M - GRADIENTE_M_POR_GRADO * fabs(lats[i] - 45)) * g_0 - DESPLAZAMIENTO) / ESCALA);

    points_cluster c;
    memset(&c, 0, sizeof(c));
    c.type = MAX;
    c.center = create_point(45, 0);
    calcular_extremos_rayos(&c, filas, lats, lons, ESCALA, DESPLAZAMIENTO);

    int niveles[200];
    int n = niveles_hacia_el_polo(&c, ALTURA_CENTRO_M, niveles, 200);
    int esperados = (ALTURA_CENTRO_M - NIVEL_MAS_BAJO_M) / PARAMS.contour_step_m + 1;
    bool bien = n == esperados;
    for (int k = 0; k < n; k++)
        bien = bien && niveles[k] == ALTURA_CENTRO_M - k * PARAMS.contour_step_m;
    printf("%d niveles, de %d a %d m (esperados %d, de %d a %d cada %d m)%s\n", n, n > 0 ? niveles[0] : 0,
           n > 0 ? niveles[n - 1] : 0, esperados, ALTURA_CENTRO_M, NIVEL_MAS_BAJO_M, PARAMS.contour_step_m,
           bien ? "" : "  <-- FALLA");
    free(c.extremos);
    return !bien;
}
