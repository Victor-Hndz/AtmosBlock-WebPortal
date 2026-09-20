// ALG-379: la primitiva topológica del contorno cerrado, sobre campos sintéticos donde la respuesta se sabe.
//
// Casos, y qué demuestra cada uno:
//   1. Cúpula aislada en latitudes medias  -> CERRADO (no llega al cinturón).
//   2. Banda zonal que baja hasta el cinturón -> ABIERTO (es una dorsal conectada al anticiclón subtropical).
//   3. Calota polar -> CERRADO. El caso que el test por rayos no sabe distinguir de una banda.
//   4. La misma cúpula con el fichero cortado antes del cinturón -> INDETERMINADO, no CERRADO por accidente.
//   5. Mínimo conectado a la vaguada circumpolar -> ABIERTO; mínimo desprendido -> CERRADO.
//   6. La componente da la vuelta en ±180° y pasa por el polo: la periodicidad y el nodo polar funcionan.
//   7. Vecindad (8, 4): en un tablero de ajedrez, el conjunto alto está conectado en diagonal y el bajo no.
#include "../libraries/topologia.h"

static int fallos = 0;

static const char *nombre(enum Cierre c) {
    return c == CIERRE_CERRADO ? "CERRADO" : c == CIERRE_ABIERTO ? "ABIERTO" : "INDETERMINADO";
}

static void comprobar(const char *caso, enum Cierre obtenido, enum Cierre esperado) {
    printf("%-62s %-13s (esperado %s)%s\n", caso, nombre(obtenido), nombre(esperado),
           obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

static void comprobar_int(const char *caso, int obtenido, int esperado) {
    printf("%-62s %-13d (esperado %d)%s\n", caso, obtenido, esperado, obtenido == esperado ? "" : "  <-- FALLA");
    fallos += obtenido != esperado;
}

// Retícula del hemisferio norte de 90° a `lat_inferior`, a 1°, con el fondo bajando hacia el polo como Z500:
// `base` metros en `lat_inferior` y `pendiente` metros menos por grado hacia el norte.
static rejilla_analisis *fondo(double lat_inferior, double base, double pendiente) {
    int n_lat = (int)lround(90 - lat_inferior) + 1;
    rejilla_analisis *r = crear_rejilla(n_lat, 360, 90, -180, 1, true);
    for (int i = 0; i < n_lat; i++) {
        double lat = 90 - i;
        for (int j = 0; j < 360; j++)
            fijar_valor(r, i, j, base - pendiente * (lat - lat_inferior));
    }
    return r;
}

static void meseta(rejilla_analisis *r, double lat_min, double lat_max, double lon_min, double lon_max, double valor) {
    for (int i = 0; i < r->n_lat; i++) {
        double lat = 90 - i;
        if (lat < lat_min || lat > lat_max)
            continue;
        for (int j = 0; j < r->n_lon; j++) {
            double lon = -180 + j;
            if (lon < lon_min || lon > lon_max)
                continue;
            fijar_valor(r, i, j, valor);
        }
    }
}

static int fila(double lat) { return (int)lround(90 - lat); }
static int columna(double lon) { return (int)lround(lon + 180); }

int main(void) {
    const double CINTURON = 30;

    // 1. Cúpula aislada entre 50 y 60°N: no llega al cinturón.
    rejilla_analisis *r = fondo(20, 5800, 12);
    meseta(r, 50, 60, -20, 20, 5900);
    comprobar("cúpula aislada en 50-60°N, nivel 5850", estado_contorno(r, fila(55), columna(0), 5850, MAX, CINTURON),
              CIERRE_CERRADO);

    // 2. La misma cúpula, pero con una lengua que baja hasta el cinturón: dorsal conectada al subtropical.
    meseta(r, 30, 60, -5, 5, 5900);
    comprobar("dorsal conectada con el cinturón subtropical", estado_contorno(r, fila(55), columna(0), 5850, MAX, CINTURON),
              CIERRE_ABIERTO);
    liberar_rejilla(r);

    // 3. Calota polar: cerrada, aunque sus circuitos den la vuelta al mundo igual que una banda zonal.
    r = fondo(20, 5800, 12);
    meseta(r, 80, 90, -180, 180, 6000);
    comprobar("calota polar de 80 a 90°N", estado_contorno(r, 0, 0, 5950, MAX, CINTURON), CIERRE_CERRADO);
    // Y la banda zonal completa a latitudes medias sí es abierta: toca el cinturón.
    meseta(r, 30, 45, -180, 180, 6000);
    comprobar("banda zonal de 30 a 45°N", estado_contorno(r, fila(40), columna(100), 5950, MAX, CINTURON),
              CIERRE_ABIERTO);
    liberar_rejilla(r);

    // 4. Fichero cortado en 40°N y una cúpula con una lengua que llega hasta ese borde: no se puede decidir.
    r = fondo(40, 5800, 8);
    meseta(r, 50, 60, -20, 20, 5900);
    meseta(r, 40, 50, -5, 5, 5900);
    comprobar("cúpula que toca el borde del fichero (cortado en 40°N)",
              estado_contorno(r, fila(55), columna(0), 5850, MAX, CINTURON), CIERRE_INDETERMINADO);
    liberar_rejilla(r);

    // La misma cúpula sin la lengua sí se decide: su componente está completa dentro de los datos.
    r = fondo(40, 5800, 8);
    meseta(r, 50, 60, -20, 20, 5900);
    comprobar("cúpula completa aunque el fichero acabe en 40°N",
              estado_contorno(r, fila(55), columna(0), 5850, MAX, CINTURON), CIERRE_CERRADO);
    liberar_rejilla(r);

    // 5. Mínimos: desprendido frente a conectado con la vaguada circumpolar.
    r = fondo(20, 5800, 12);  // el polo queda en 4960 m: es el mínimo global, como el vórtice polar
    meseta(r, 40, 50, -20, 20, 5000);
    comprobar("baja desprendida en 40-50°N", estado_contorno(r, fila(45), columna(0), 5100, MIN, CINTURON),
              CIERRE_CERRADO);
    meseta(r, 40, 85, -5, 5, 5000);  // un canal que la une con la zona polar
    comprobar("baja unida a la vaguada circumpolar", estado_contorno(r, fila(45), columna(0), 5100, MIN, CINTURON),
              CIERRE_ABIERTO);
    liberar_rejilla(r);

    // 6. Periodicidad y nodo polar: una estructura partida en ±180° es una sola componente, y la fila del polo
    // cuenta como un único nodo (no como 360).
    r = fondo(20, 5800, 12);
    meseta(r, 50, 60, 170, 180, 5900);
    meseta(r, 50, 60, -180, -170, 5900);
    comprobar_int("componente que cruza ±180° (11 + 10 columnas x 11 filas)",
                  tam_componente(r, fila(55), columna(175), 5850, MAX), 21 * 11);
    liberar_rejilla(r);
    r = fondo(20, 5800, 12);
    meseta(r, 89, 90, -180, 180, 6000);
    comprobar_int("la fila del polo es un solo nodo (1 + 360 de la fila 89)",
                  tam_componente(r, 0, 0, 5950, MAX), 1 + 360);
    liberar_rejilla(r);

    // 7. Vecindad (8, 4): tablero de ajedrez en una ventana. El conjunto alto se conecta en diagonal y el bajo no,
    // que es la condición de Rosenfeld para que el test sea consistente.
    r = fondo(20, 5800, 12);
    for (int i = fila(60); i <= fila(50); i++)
        for (int j = columna(-20); j <= columna(20); j++)
            fijar_valor(r, i, j, (i + j) % 2 == 0 ? 5900 : 5000);
    int alto = tam_componente(r, fila(60), columna(-20), 5850, MAX);
    int bajo = tam_componente(r, fila(60), columna(-19), 5100, MIN);
    printf("tablero: componente alta %d nodos, componente baja %d nodos\n", alto, bajo);
    fallos += !(alto > 100);  // las diagonales conectan todo el tablero alto
    fallos += !(bajo == 1);   // el bajo, con 4 vecinos, queda aislado celda a celda
    if (alto <= 100 || bajo != 1)
        printf("  <-- FALLA: se esperaba una componente alta grande (8-conexa) y bajas sueltas (4-conexa)\n");
    liberar_rejilla(r);

    return fallos != 0;
}
