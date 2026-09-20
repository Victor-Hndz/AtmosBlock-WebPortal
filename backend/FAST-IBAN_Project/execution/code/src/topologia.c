#include "../libraries/topologia.h"

rejilla_analisis *crear_rejilla(int n_lat, int n_lon, double lat0, double lon0, double paso, bool polo) {
    rejilla_analisis *r = malloc(sizeof(rejilla_analisis));
    if (r == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    *r = (rejilla_analisis){.n_lat = n_lat, .n_lon = n_lon, .lat0 = lat0, .lon0 = lon0, .paso = paso, .polo = polo};
    r->z = malloc((size_t)n_lat * n_lon * sizeof(double));
    if (r->z == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    for (int k = 0; k < n_lat * n_lon; k++)
        r->z[k] = NAN;
    return r;
}

void liberar_rejilla(rejilla_analisis *r) {
    if (r != NULL) {
        free(r->z);
        free(r);
    }
}

double valor_rejilla(const rejilla_analisis *r, int i, int j) { return r->z[(size_t)i * r->n_lon + j]; }

void fijar_valor(rejilla_analisis *r, int i, int j, double valor) { r->z[(size_t)i * r->n_lon + j] = valor; }

// Latitud de la fila i, con el signo del hemisferio de la retícula.
static double latitud(const rejilla_analisis *r, int i) { return r->lat0 - (r->lat0 >= 0 ? i : -i) * r->paso; }

// ¿El nodo pertenece al conjunto de nivel? Un nodo sin dato nunca pertenece, pero sí marca el resultado.
static bool en_el_conjunto(double valor, double nivel, enum Tipo_form tipo) {
    return isfinite(valor) && (tipo == MAX ? valor >= nivel : valor <= nivel);
}

// Vecinos del nodo (i, j): 8 para el conjunto alto y 4 para el bajo (Rosenfeld 1970). La longitud da la vuelta y, si
// la fila 0 es el polo, todos sus nodos son el mismo punto: cualquier nodo de la fila 1 es vecino de todos ellos.
// Devuelve cuántos ha escrito en `vi`/`vj` (como mucho 8, o n_lon + 8 desde el polo).
static int vecinos(const rejilla_analisis *r, int i, int j, enum Tipo_form tipo, int *vi, int *vj, int max) {
    int n = 0;
    const int d8[8][2] = {{-1, -1}, {-1, 0}, {-1, 1}, {0, -1}, {0, 1}, {1, -1}, {1, 0}, {1, 1}};
    const int d4[4][2] = {{-1, 0}, {0, -1}, {0, 1}, {1, 0}};
    int n_dir = tipo == MAX ? 8 : 4;

    if (r->polo && i == 0) {  // desde el polo se llega a toda la primera corona
        for (int k = 0; k < r->n_lon && n < max; k++) {
            vi[n] = 1;
            vj[n] = k;
            n++;
        }
        return n;
    }

    for (int d = 0; d < n_dir && n < max; d++) {
        int di = tipo == MAX ? d8[d][0] : d4[d][0], dj = tipo == MAX ? d8[d][1] : d4[d][1];
        int ni = i + di, nj = ((j + dj) % r->n_lon + r->n_lon) % r->n_lon;  // longitud periódica
        if (ni < 0 || ni >= r->n_lat)
            continue;
        if (r->polo && ni == 0)  // el polo es un único nodo: siempre la columna 0
            nj = 0;
        vi[n] = ni;
        vj[n] = nj;
        n++;
    }
    return n;
}

// Recorrido en anchura de la componente conexa. Devuelve su tamaño y, por referencia, si alcanzó la referencia
// (`alcanza`) o si tocó un nodo sin dato o el borde de los datos (`sin_dato`).
static int recorrer(const rejilla_analisis *r, int i0, int j0, double nivel, enum Tipo_form tipo,
                    double lat_referencia, bool *alcanza, bool *sin_dato) {
    size_t total = (size_t)r->n_lat * r->n_lon;
    bool *visto = calloc(total, sizeof(bool));
    int *pila = malloc(total * sizeof(int));
    if (visto == NULL || pila == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }

    *alcanza = false;
    *sin_dato = false;
    if (r->polo && i0 == 0)
        j0 = 0;
    if (!en_el_conjunto(valor_rejilla(r, i0, j0), nivel, tipo)) {
        free(visto);
        free(pila);
        return 0;
    }

    int cima = 0, tam = 0;
    pila[cima++] = i0 * r->n_lon + j0;
    visto[i0 * r->n_lon + j0] = true;
    int vi[64 + 8], vj[64 + 8];
    int max_vecinos = r->n_lon + 8 < (int)(sizeof(vi) / sizeof(vi[0])) ? r->n_lon + 8 : (int)(sizeof(vi) / sizeof(vi[0]));

    while (cima > 0) {
        int nodo = pila[--cima], i = nodo / r->n_lon, j = nodo % r->n_lon;
        tam++;

        // ALG-379: la referencia. Para un máximo, el cinturón subtropical; para un mínimo, el polo.
        if (tipo == MAX ? fabs(latitud(r, i)) <= lat_referencia + 1e-9 : (r->polo && i == 0))
            *alcanza = true;
        // El borde de los datos en latitud (la última fila) cuenta como "no sé qué hay más allá".
        if (i == r->n_lat - 1)
            *sin_dato = true;

        int n = vecinos(r, i, j, tipo, vi, vj, max_vecinos);
        for (int k = 0; k < n; k++) {
            int idx = vi[k] * r->n_lon + vj[k];
            double v = valor_rejilla(r, vi[k], vj[k]);
            if (!isfinite(v)) {
                *sin_dato = true;
                continue;
            }
            if (!visto[idx] && en_el_conjunto(v, nivel, tipo)) {
                visto[idx] = true;
                pila[cima++] = idx;
            }
        }
    }

    free(visto);
    free(pila);
    return tam;
}

enum Cierre estado_contorno(const rejilla_analisis *r, int i0, int j0, double nivel, enum Tipo_form tipo,
                            double lat_referencia) {
    bool alcanza, sin_dato;
    if (recorrer(r, i0, j0, nivel, tipo, lat_referencia, &alcanza, &sin_dato) == 0)
        return CIERRE_INDETERMINADO;  // el centro no está en su propio conjunto de nivel: no hay nada que decidir
    // Alcanzar la referencia es una demostración: vale aunque por otro lado falten datos. No alcanzarla solo
    // demuestra el cierre si la componente está completa.
    if (alcanza)
        return CIERRE_ABIERTO;
    return sin_dato ? CIERRE_INDETERMINADO : CIERRE_CERRADO;
}

int tam_componente(const rejilla_analisis *r, int i0, int j0, double nivel, enum Tipo_form tipo) {
    bool alcanza, sin_dato;
    return recorrer(r, i0, j0, nivel, tipo, 0, &alcanza, &sin_dato);
}
