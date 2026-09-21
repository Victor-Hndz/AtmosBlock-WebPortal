#include "../libraries/topologia.h"

#include "../libraries/calc.h"

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
    // Desde el polo hay n_lon vecinos (toda la primera corona): el búfer tiene que caberlos todos. Con un tope fijo
    // de 72 se exploraban solo 72 de los 360 vecinos del polo.
    int max_vecinos = r->n_lon + 8;
    int *vi = malloc((size_t)max_vecinos * sizeof(int)), *vj = malloc((size_t)max_vecinos * sizeof(int));
    if (vi == NULL || vj == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }

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
    free(vi);
    free(vj);
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

void nodo_de(const rejilla_analisis *r, coord_point p, int *i, int *j) {
    double lat = r->lat0 >= 0 ? r->lat0 - p.lat : p.lat - r->lat0;
    *i = (int)lround(lat / r->paso);
    if (*i < 0)
        *i = 0;
    if (*i >= r->n_lat)
        *i = r->n_lat - 1;
    *j = (int)(((long)lround((p.lon - r->lon0) / r->paso) % r->n_lon + r->n_lon) % r->n_lon);
    if (r->polo && *i == 0)
        *j = 0;
}

rejilla_analisis *rejilla_del_campo(short **z, float *lats, float *lons, double scale_factor, double offset, int hemi,
                                    double paso, double lat_referencia) {
    // Del polo del hemisferio hasta la referencia; la retícula siempre cubre los 360° de longitud.
    int n_lat = (int)lround((90.0 - lat_referencia) / paso) + 1;
    int n_lon = (int)lround(360.0 / paso);
    rejilla_analisis *r = crear_rejilla(n_lat, n_lon, hemi >= 0 ? 90.0 : -90.0, -180.0, paso, true);

    for (int i = 0; i < n_lat; i++) {
        double lat = (hemi >= 0 ? 90.0 : -90.0) - hemi * i * paso;
        for (int j = 0; j < n_lon; j++) {
            if (r->polo && i == 0 && j > 0) {  // el polo es un único nodo: las demás columnas de la fila 0 no se usan
                fijar_valor(r, i, j, NAN);
                continue;
            }
            short empaquetado;
            coord_point p = create_point((float)lat, (float)(-180.0 + j * paso));
            // En el polo no se puede interpolar (no hay celda más allá de ±90): se toma el valor de la fila polar
            // del fichero, que es un único punto. Sin esto, toda componente que llegue al polo salía INDETERMINADA.
            if (fabs(fabs(lat) - 90.0) < 1e-6) {
                int fila = findIndex_sin_contar(lats, NLAT, (float)lat);
                if (fila >= 0)
                    fijar_valor(r, i, j, (z[fila][0] * scale_factor + offset) / g_0);
                continue;
            }
            if (bilinear_interpolation(p, z, lats, lons, &empaquetado))
                fijar_valor(r, i, j, (empaquetado * scale_factor + offset) / g_0);
        }
    }
    return r;
}

// Acimut inicial del círculo máximo de `desde` a `hasta`, en grados desde el norte y en sentido horario.
static double acimut(coord_point desde, coord_point hasta) {
    double f1 = desde.lat * M_PI / 180, f2 = hasta.lat * M_PI / 180, dl = (hasta.lon - desde.lon) * M_PI / 180;
    double y = sin(dl) * cos(f2), x = cos(f1) * sin(f2) - sin(f1) * cos(f2) * cos(dl);
    double grados = atan2(y, x) * 180 / M_PI;
    return fmod(grados + 360.0, 360.0);
}

// Marca la componente conexa de (i0, j0) en `marca` (1 = dentro). Devuelve su tamaño.
static int marcar_componente(const rejilla_analisis *r, int i0, int j0, double nivel, enum Tipo_form tipo, char *marca) {
    size_t total = (size_t)r->n_lat * r->n_lon;
    int *pila = malloc(total * sizeof(int));
    if (pila == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    if (r->polo && i0 == 0)
        j0 = 0;
    if (!en_el_conjunto(valor_rejilla(r, i0, j0), nivel, tipo)) {
        free(pila);
        return 0;
    }

    int cima = 0, tam = 0, max_vecinos = r->n_lon + 8;
    int *vi = malloc((size_t)max_vecinos * sizeof(int)), *vj = malloc((size_t)max_vecinos * sizeof(int));
    if (vi == NULL || vj == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    pila[cima++] = i0 * r->n_lon + j0;
    marca[i0 * r->n_lon + j0] = 1;
    while (cima > 0) {
        int nodo = pila[--cima], i = nodo / r->n_lon, j = nodo % r->n_lon;
        tam++;
        int n = vecinos(r, i, j, tipo, vi, vj, max_vecinos);
        for (int k = 0; k < n; k++) {
            int idx = vi[k] * r->n_lon + vj[k];
            if (!marca[idx] && en_el_conjunto(valor_rejilla(r, vi[k], vj[k]), nivel, tipo)) {
                marca[idx] = 1;
                pila[cima++] = idx;
            }
        }
    }
    free(pila);
    free(vi);
    free(vj);
    return tam;
}

bool misma_componente(const rejilla_analisis *r, int i1, int j1, int i2, int j2, double nivel, enum Tipo_form tipo) {
    size_t total = (size_t)r->n_lat * r->n_lon;
    char *marca = calloc(total, sizeof(char));
    if (marca == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    if (r->polo && i1 == 0)
        j1 = 0;
    if (r->polo && i2 == 0)
        j2 = 0;
    marcar_componente(r, i1, j1, nivel, tipo, marca);
    bool juntas = marca[(size_t)i2 * r->n_lon + j2] != 0;
    free(marca);
    return juntas;
}

double acimut_de_la_silla(const rejilla_analisis *r, int i0, int j0, double nivel_cierre, double nivel_apertura,
                          double lat_referencia, coord_point centro) {
    size_t total = (size_t)r->n_lat * r->n_lon;
    char *cerrada = calloc(total, sizeof(char)), *abierta = calloc(total, sizeof(char));
    if (cerrada == NULL || abierta == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    marcar_componente(r, i0, j0, nivel_cierre, MAX, cerrada);
    marcar_componente(r, i0, j0, nivel_apertura, MAX, abierta);

    // El cuello es lo que la componente gana al bajar un escalón: de ahí, el nodo más alto es la silla de fusión
    // (desempate por (z, i, j), para que no dependa del orden de recorrido).
    double mejor_z = -INF;
    int mejor_i = -1, mejor_j = -1;
    for (int i = 0; i < r->n_lat; i++)
        for (int j = 0; j < r->n_lon; j++) {
            size_t k = (size_t)i * r->n_lon + j;
            if (!abierta[k] || cerrada[k])
                continue;
            double v = valor_rejilla(r, i, j);
            if (!isfinite(v))
                continue;
            if (v > mejor_z || (v == mejor_z && (i < mejor_i || (i == mejor_i && j < mejor_j)))) {
                mejor_z = v;
                mejor_i = i;
                mejor_j = j;
            }
        }
    free(cerrada);
    free(abierta);
    (void)lat_referencia;
    if (mejor_i < 0)
        return NAN;

    double lat = r->lat0 - (r->lat0 >= 0 ? mejor_i : -mejor_i) * r->paso, lon = r->lon0 + mejor_j * r->paso;
    return acimut(centro, create_point((float)lat, (float)lon));
}
