#if !defined(YAML_PLANO)
#define YAML_PLANO

// ALG-305 (L4): lector de YAML plano ("clave: valor" por línea, "#" para comentarios) para los ficheros de parámetros.
// No depende del resto del núcleo: lo comparten code/ y code_t/.
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

typedef struct {
    const char *clave;
    bool entero;     // true: int; false: double
    void *destino;
} clave_yaml;

void leer_yaml_plano(const char *ruta, const clave_yaml *claves, size_t n_claves);
void escribir_claves_yaml(FILE *fp, const clave_yaml *claves, size_t n_claves);

#endif // YAML_PLANO
