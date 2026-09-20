// ALG-369: un rayo que no se puede interpolar (cae fuera del fichero) no vota. Antes votaba a MAX: en un fichero
// recortado en 25°N, un punto a 26°N en una simple pendiente meridiana salía como máximo.
#include "../libraries/calc.h"
#include "../libraries/init.h"

#define N_LAT_MAX 361
#define N_LON 1440
#define ESCALA 2.0
#define DESPLAZAMIENTO 50000.0

static float lats[N_LAT_MAX], lons[N_LON];
static short datos[N_LAT_MAX][N_LON];
static short *filas[N_LAT_MAX];
static int fallos = 0;

// Rejilla global de 0,25° desde 90°N hasta lat_inferior, con la altura bajando hacia el polo 10 m por grado.
static void preparar(double lat_inferior) {
    RES = 0.25;
    NLAT = (int)lround((90 - lat_inferior) / RES) + 1;
    NLON = N_LON;
    for (int i = 0; i < NLAT; i++) {
        lats[i] = (float)(90 - i * RES);
        filas[i] = datos[i];
    }
    for (int j = 0; j < N_LON; j++)
        lons[j] = (float)(-180 + j * RES);
    for (int i = 0; i < NLAT; i++)
        for (int j = 0; j < N_LON; j++)
            datos[i][j] = (short)lround(((5500 + 10.0 * (40 - lats[i])) * g_0 - DESPLAZAMIENTO) / ESCALA);
}

static enum Tipo_form clasificar(double lat, double lon) {
    int i = (int)lround((90 - lat) / RES), j = (int)lround((lon + 180) / RES);
    return clasificar_candidato(create_point((float)lat, (float)lon), filas[i][j], filas, lats, lons);
}

static void comprobar(const char *caso, enum Tipo_form obtenido, enum Tipo_form esperado) {
    const char *nombre[] = {"MAX", "MIN", "NO_TYPE"};
    printf("%-58s %-7s (esperado %s)%s\n", caso, nombre[obtenido], nombre[esperado], obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

int main(void) {
    cargar_parametros(NULL);
    preparar(25);
    comprobar("pendiente, fichero recortado en 25°N, punto a 26°N", clasificar(26, 10), NO_TYPE);
    preparar(0);
    comprobar("pendiente, fichero hasta 0°, punto a 26°N (control)", clasificar(26, 10), NO_TYPE);
    comprobar("pendiente, fichero hasta 0°, punto a 60°N (control)", clasificar(60, 10), NO_TYPE);
    return fallos != 0;
}
