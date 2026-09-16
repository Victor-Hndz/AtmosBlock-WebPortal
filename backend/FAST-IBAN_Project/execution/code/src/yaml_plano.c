#include "../libraries/yaml_plano.h"
#include <ctype.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>

static void error_yaml(const char *ruta, int linea, const char *motivo, const char *detalle) {
    fprintf(stderr, "Error en %s (línea %d): %s: %s\n", ruta, linea, motivo, detalle);
    exit(EXIT_FAILURE);
}

static char *recortar(char *s) {
    while (isspace((unsigned char)*s))
        s++;
    char *fin = s + strlen(s);
    while (fin > s && isspace((unsigned char)fin[-1]))
        *--fin = '\0';
    return s;
}

/**
 * @brief Leer un fichero de parámetros. Cada clave de la tabla debe aparecer exactamente una vez; una clave desconocida,
 * repetida o ausente, o un valor que no sea un número, terminan el proceso con un mensaje.
 *
 * ponytail: sin listas, anidación ni comillas; usar libyaml obligaría a cambiar la imagen netcdf-base, que no trae
 * sus cabeceras.
 */
void leer_yaml_plano(const char *ruta, const clave_yaml *claves, size_t n_claves) {
    FILE *fp = fopen(ruta, "r");
    if (fp == NULL) {
        fprintf(stderr, "Error: no se puede abrir el fichero de parámetros %s: %s\n", ruta, strerror(errno));
        exit(EXIT_FAILURE);
    }

    bool *leida = calloc(n_claves, sizeof(bool));
    if (leida == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }
    char linea[512];
    int n = 0;
    while (fgets(linea, sizeof(linea), fp) != NULL) {
        n++;
        char *comentario = strchr(linea, '#');
        if (comentario != NULL)
            *comentario = '\0';
        char *clave = recortar(linea);
        if (*clave == '\0')
            continue;
        char *separador = strchr(clave, ':');
        if (separador == NULL)
            error_yaml(ruta, n, "se esperaba \"clave: valor\"", clave);
        *separador = '\0';
        char *valor = recortar(separador + 1);
        clave = recortar(clave);

        size_t k = 0;
        while (k < n_claves && strcmp(claves[k].clave, clave) != 0)
            k++;
        if (k == n_claves)
            error_yaml(ruta, n, "clave desconocida", clave);
        if (leida[k])
            error_yaml(ruta, n, "clave repetida", clave);

        char *fin;
        errno = 0;
        if (claves[k].entero)
            *(int *)claves[k].destino = (int)strtol(valor, &fin, 10);
        else
            *(double *)claves[k].destino = strtod(valor, &fin);
        if (fin == valor || *fin != '\0' || errno != 0)
            error_yaml(ruta, n, claves[k].entero ? "se esperaba un entero" : "se esperaba un número", valor);
        leida[k] = true;
    }
    fclose(fp);

    for (size_t k = 0; k < n_claves; k++) {
        if (!leida[k]) {
            fprintf(stderr, "Error en %s: falta la clave %s\n", ruta, claves[k].clave);
            exit(EXIT_FAILURE);
        }
    }
    free(leida);
}

// Una línea "# clave: valor" por parámetro, para la cabecera de los CSV de salida.
void escribir_claves_yaml(FILE *fp, const clave_yaml *claves, size_t n_claves) {
    for (size_t k = 0; k < n_claves; k++) {
        if (claves[k].entero)
            fprintf(fp, "# %s: %d\n", claves[k].clave, *(int *)claves[k].destino);
        else
            fprintf(fp, "# %s: %g\n", claves[k].clave, *(double *)claves[k].destino);
    }
}
