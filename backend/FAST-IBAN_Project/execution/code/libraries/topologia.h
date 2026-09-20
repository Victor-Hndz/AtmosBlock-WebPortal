#if !defined(TOPOLOGIA)
#define TOPOLOGIA

#include "lib.h"

// ALG-379: primitiva topológica del test de contorno cerrado (ruta A).
//
// Hoy "cerrado" significa "los 64 rayos bajan del nivel dentro de search_radius_km", que es monótono en el radio y
// cuyo límite es "todo cerrado" → cero detecciones (medido: 111/241/297/243/155 Omegas con 2000…8000 km en JJA 2015).
// La primitiva correcta es la componente conexa del conjunto de nivel, no 64 rayos independientes.
//
// Sobre la esfera, la topología sola no distingue una alta cerrada de un cinturón zonal: toda curva de nivel es
// cerrada y parte la esfera en dos discos. Hace falta una referencia, y hay una física: el cinturón subtropical de
// altas. Una alta "abierta hacia el ecuador" es literalmente una dorsal cuya isohipsa se conecta con el anticiclón
// subtropical; una baja "cerrada" es una baja desprendida de la vaguada circumpolar.
//
//   MAX: la componente de {z >= nivel} que contiene el centro es ABIERTA si alcanza la latitud de referencia.
//   MIN: la componente de {z <= nivel} es ABIERTA si alcanza el polo.
//   Si la componente toca un nodo sin dato antes de decidirse, el resultado es INDETERMINADO: con datos parciales,
//   la propiedad global o se demuestra o no se demuestra (no se supone).
//
// Vecindad (8, 4): 8-conexa para el conjunto alto y 4-conexa para el bajo. No es cosmética: es la condición de
// Rosenfeld (1970, doi:10.1145/321556.321570) para que valga el teorema de Jordan discreto. Con 8 en los dos lados,
// un conjunto y su complemento pueden estar conectados a la vez por la misma diagonal.

enum Cierre { CIERRE_CERRADO, CIERRE_ABIERTO, CIERRE_INDETERMINADO };

// Retícula de análisis: paso uniforme en latitud y longitud, longitud periódica y, si `polo`, la fila 0 es el polo y
// se trata como un solo nodo (un punto, no una circunferencia). `z` en metros de altura geopotencial; NAN = sin dato.
typedef struct {
    int n_lat, n_lon;
    double lat0;   // latitud de la fila 0 (la más cercana al polo del hemisferio)
    double lon0;   // longitud de la columna 0
    double paso;   // grados entre filas y entre columnas
    bool polo;     // la fila 0 es exactamente ±90
    double *z;     // n_lat * n_lon valores, fila mayor
} rejilla_analisis;

rejilla_analisis *crear_rejilla(int n_lat, int n_lon, double lat0, double lon0, double paso, bool polo);
void liberar_rejilla(rejilla_analisis *r);
double valor_rejilla(const rejilla_analisis *r, int i, int j);
void fijar_valor(rejilla_analisis *r, int i, int j, double valor);

// Estado del contorno `nivel` alrededor del nodo (i0, j0). `tipo` elige el conjunto y la vecindad; `lat_referencia`
// es la latitud del cinturón subtropical (en valor absoluto) y solo se usa para MAX.
enum Cierre estado_contorno(const rejilla_analisis *r, int i0, int j0, double nivel, enum Tipo_form tipo,
                            double lat_referencia);

// Tamaño de la componente conexa (nodos), para diagnóstico y tests. Devuelve 0 si (i0, j0) no pertenece al conjunto.
int tam_componente(const rejilla_analisis *r, int i0, int j0, double nivel, enum Tipo_form tipo);

#endif // TOPOLOGIA
