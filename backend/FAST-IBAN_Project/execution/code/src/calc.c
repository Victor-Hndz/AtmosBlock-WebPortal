#include "../libraries/calc.h"

#include "../libraries/topologia.h"



coord_point coord_from_great_circle(coord_point initial, double dist, double bearing) {
    coord_point final = {0, 0};
    double Ad = dist / R;

    // Convert to radians
    initial.lat = initial.lat * M_PI / 180;
    initial.lon = initial.lon * M_PI / 180;
    bearing = bearing * M_PI / 180;

    // Calculate the latitude and longitude of the second point
    final.lat = asin(sin(initial.lat) * cos(Ad) + cos(initial.lat) * sin(Ad) * cos(bearing));
    final.lon = initial.lon + atan2(sin(bearing) * sin(Ad) * cos(initial.lat), cos(Ad) - sin(initial.lat) * sin(final.lat));

    // Convert back to degrees
    final.lat = final.lat * 180 / M_PI;
    final.lon = final.lon * 180 / M_PI;

    return final;
}


// B7 (ALG-106): devuelve false si alguna esquina no está en la rejilla; el valor va en *z_out.
// No se usa -1 como centinela porque -1 es un valor empaquetado válido.
bool bilinear_interpolation(coord_point p, short **z_mat, float *lats, float *lons, short *z_out) {
    double z, z1, z2, z3, z4;

    //Calculate the 4 points of the square.
    coord_point p11 = {floor(p.lat/RES)*RES, floor(p.lon/RES)*RES}; //p1
    coord_point p12 = {floor(p.lat/RES)*RES, ceil(p.lon/RES)*RES}; //p2
    coord_point p21 = {ceil(p.lat/RES)*RES, floor(p.lon/RES)*RES}; //p3
    coord_point p22 = {ceil(p.lat/RES)*RES, ceil(p.lon/RES)*RES}; //p4

    if(fmod(p.lat, RES) == 0) {
        p21.lat += RES;
        p22.lat += RES;
    }

    if(fmod(p.lon, RES) == 0) {
        p12.lon += RES;
        p22.lon += RES;
    }

    int i11 = findIndex_sin_contar(lats, NLAT, p11.lat);
    int j11 = findIndex_sin_contar(lons, NLON, p11.lon);

    int i12 = findIndex_sin_contar(lats, NLAT, p12.lat);
    int j12 = findIndex_sin_contar(lons, NLON, p12.lon);

    int i21 = findIndex_sin_contar(lats, NLAT, p21.lat);
    int j21 = findIndex_sin_contar(lons, NLON, p21.lon);

    int i22 = findIndex_sin_contar(lats, NLAT, p22.lat);
    int j22 = findIndex_sin_contar(lons, NLON, p22.lon);

    // ALG-209: una sola consulta del hilo por interpolación (antes, una por cada findIndex).
    // Mismos totales exactos que contar dentro de las 8 llamadas a findIndex.
    contadores_hilo *contador = &CONTADOR_HILO();
    contador->interp_calls++;
    contador->findindex_calls += 8;
    contador->findindex_misses += (i11 == -1) + (j11 == -1) + (i12 == -1) + (j12 == -1)
                                + (i21 == -1) + (j21 == -1) + (i22 == -1) + (j22 == -1);

    //si alguno de ellos es -1, no se puede interpolar.
    if(i11 == -1 || j11 == -1 || i12 == -1 || j12 == -1 || i21 == -1 || j21 == -1 || i22 == -1 || j22 == -1) {
        //perror("Error: No se ha encontrado el punto en la lista.\n");
        contador->interp_fails++;
        return false;
    }

    // B10 (ALG-357): la fórmula pondera z2 con (lat - lat_inf)(lon_sup - lon), el peso de la esquina p21
    // (latitud superior, longitud inferior), y z3 con el de p12. Antes z2 tomaba el valor de p12 y z3 el de
    // p21, así que se interpolaba con latitud y longitud traspuestas dentro de la celda.
    z1 = z_mat[i11][j11];
    z2 = z_mat[i21][j21];
    z3 = z_mat[i12][j12];
    z4 = z_mat[i22][j22];
    
    //Calculate the interpolation.
    z = (((p22.lat-p.lat)*(p22.lon-p.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z1 + 
        (((p.lat-p11.lat)*(p22.lon-p.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z2 + 
        (((p22.lat-p.lat)*(p.lon-p11.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z3 + 
        (((p.lat-p11.lat)*(p.lon-p11.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z4;

    *z_out = (short)round(z);
    return true;
}

/**
 * @brief ALG-360: extremo de la altura (mínimo si el cluster es MAX, máximo si es MIN) a lo largo de cada uno de los
 * n_rays rayos de círculo máximo que salen del centro del cluster. Cada rayo se muestrea cada contour_ray_step_km con la
 * interpolación bilineal hasta search_radius_km. Un rayo cruza un contorno L antes de su límite si y solo si su extremo
 * queda por debajo (MAX) o por encima (MIN) de L, así que cada nivel se decide después con n_rays comparaciones.
 *
 * El rayo se detiene sin cruzar al salir del dominio de latitudes (ALG-374), al salir de las latitudes del fichero o de sus longitudes (si
 * no es global) o si la interpolación falla. Atraviesa el polo (ALG-363): al otro lado sigue el mismo círculo máximo.
 * cluster->extremo_polo es el extremo del rayo hacia el polo del hemisferio del centro (el meridiano del centro: rayo
 * 0 en el HN, rayo n_rays/2 en el HS; ALG-303) solo hasta el polo: delimita los niveles de contorno
 * (niveles_hacia_el_polo), porque al otro lado "hacia el polo" pasa a ser hacia el ecuador.
 * ponytail: una muestra exactamente en ±90° no se puede interpolar y termina el rayo.
 *
 * Reserva cluster->extremos (n_rays valores); lo libera search_formation.
 */
void calcular_extremos_rayos(points_cluster *cluster, short **z_in, float *lats, float *lons, double scale_factor, double offset) {
    int n = PARAMS.n_rays;
    bool global = fabs(NLON * RES - 360.0) <= TOL_PASO;
    double lat_sup = fmax(lats[0], lats[NLAT - 1]), lat_inf = fmin(lats[0], lats[NLAT - 1]);
    double lon_min = fmin(lons[0], lons[NLON - 1]), lon_max = fmax(lons[0], lons[NLON - 1]);
    int pasos = (int)floor(PARAMS.search_radius_km / PARAMS.contour_ray_step_km + 1e-9);

    cluster->extremos = malloc(n * sizeof(double));
    if (cluster->extremos == NULL) {
        perror("Error: Couldn't allocate memory for data. ");
        exit(EXIT_FAILURE);
    }

    // El rayo hacia el polo es el meridiano del centro: llega al polo a (90 - |latitud|) grados de arco.
    int hemi = hemisferio(cluster->center.lat), rayo_polo = hemi > 0 ? 0 : n / 2;
    double hasta_el_polo_km = (90.0 - hemi * cluster->center.lat) * M_PI / 180 * R;
    cluster->extremo_polo = cluster->type == MAX ? INF : -INF;
    cluster->truncado = false;
    for (int k = 0; k < n; k++) {
        double extremo = cluster->type == MAX ? INF : -INF;
        for (int paso = 1; paso <= pasos; paso++) {
            coord_point p = coord_from_great_circle(cluster->center, paso * PARAMS.contour_ray_step_km, k * 360.0 / n);
            p.lon = (float)(fmod(p.lon + 540.0, 360.0) - 180.0);
            if (p.lat < DOM_LAT_MIN || p.lat > DOM_LAT_MAX)
                break;  // límite de análisis pedido: no es falta de datos
            // ALG-376: a partir de aquí el rayo se corta porque el fichero se acaba, así que el contorno de este
            // cluster puede estar incompleto y la formación se marca como truncada.
            if (p.lat < lat_inf || p.lat > lat_sup) {
                cluster->truncado = true;
                break;
            }
            if (!global && (p.lon < lon_min || p.lon > lon_max)) {
                cluster->truncado = true;
                break;
            }
            short z;
            if (!bilinear_interpolation(p, z_in, lats, lons, &z)) {
                cluster->truncado = true;
                break;
            }
            double h = ((z * scale_factor) + offset) / g_0;
            extremo = cluster->type == MAX ? fmin(extremo, h) : fmax(extremo, h);
            if (k == rayo_polo && paso * PARAMS.contour_ray_step_km <= hasta_el_polo_km)
                cluster->extremo_polo = cluster->type == MAX ? fmin(cluster->extremo_polo, h) : fmax(cluster->extremo_polo, h);
        }
        cluster->extremos[k] = extremo;
    }
}

// ALG-360: el rayo k cruza el contorno (por debajo si el cluster es MAX, por encima si es MIN) antes de su límite.
static bool rayo_cruza(const points_cluster *cluster, int k, int contour) {
    return cluster->type == MAX ? cluster->extremos[k] < contour : cluster->extremos[k] > contour;
}

// Contorno cerrado: todos los rayos lo cruzan antes de su límite.
bool check_closed_contour(points_cluster cluster, int contour) {
    for (int k = 0; k < PARAMS.n_rays; k++)
        if (!rayo_cruza(&cluster, k, contour))
            return false;
    return true;
}

// ALG-360: rayo central del sector hacia (dir_lat, dir_lon). dir_lat > 0 es hacia el ecuador y dir_lat < 0 hacia el
// polo del hemisferio del centro (ALG-303; en el HN, sur y norte), y dir_lon > 0 el este. El rayo k tiene acimut
// k·360/n_rays, desde el norte en sentido horario.
static int rayo_central(const points_cluster *cluster, int dir_lat, int dir_lon) {
    int n = PARAMS.n_rays, hacia_el_ecuador = hemisferio(cluster->center.lat) > 0 ? n / 2 : 0;
    if (dir_lat > 0)
        return hacia_el_ecuador;
    if (dir_lat < 0)
        return (hacia_el_ecuador + n / 2) % n;
    return dir_lon > 0 ? n / 4 : 3 * n / 4;
}

// Rex: todos los rayos del sector de ±45° (límites incluidos: n_rays/4 + 1 rayos) cruzan el contorno.
bool check_contour_dir_rex(points_cluster cluster, int contour, int dir_lat, int dir_lon) {
    int n = PARAMS.n_rays, centro = rayo_central(&cluster, dir_lat, dir_lon);
    for (int d = -n / 8; d <= n / 8; d++)
        if (!rayo_cruza(&cluster, (centro + d + n) % n, contour))
            return false;
    return true;
}

// Omega: en el sector de ±45° cruzan el contorno más rayos de los que llegan a su límite sin cruzarlo.
bool check_contour_dir_omega(points_cluster cluster, int contour, int dir_lat, int dir_lon) {
    int n = PARAMS.n_rays, centro = rayo_central(&cluster, dir_lat, dir_lon), cruzan = 0;
    for (int d = -n / 8; d <= n / 8; d++)
        cruzan += rayo_cruza(&cluster, (centro + d + n) % n, contour);
    return cruzan > (n / 4 + 1) - cruzan;
}

/**
 * @brief ALG-360: niveles de contorno que se prueban para un máximo, de mayor a menor: todos los múltiplos de
 * contour_step_m con mín_polo < L <= altura del centro. mín_polo es el mínimo de la altura a lo largo del rayo hacia el
 * polo (rayo 0, hasta el polo o search_radius_km: cluster->extremo_polo). Son exactamente las isohipsas que cruza ese rayo, sin los
 * saltos que daba recorrer las celdas del camino (a 1°, un nivel de cada dos con 40 m por celda).
 *
 * @return Número de niveles escritos en `niveles` (como mucho max_niveles).
 */
int niveles_hacia_el_polo(const points_cluster *cluster, double altura_centro, int *niveles, int max_niveles) {
    int paso = PARAMS.contour_step_m, n = 0;
    if (altura_centro <= cluster->extremo_polo)
        return 0;
    for (int nivel = (int)altura_centro - ((int)altura_centro % paso); nivel > cluster->extremo_polo && n < max_niveles; nivel -= paso)
        niveles[n++] = nivel;
    return n;
}

/**
 * @brief ALG-364: distancia, en km, del punto `p` al círculo máximo del meridiano de `referencia`: R·asin(cos φ·|sin Δλ|).
 * Si `p` queda en el otro medio globo en longitud (cos Δλ <= 0, al otro lado del polo) devuelve INF. Es periódica en
 * longitud, así que la vuelta en ±180° sale sola.
 */
double distancia_al_meridiano(coord_point p, coord_point referencia) {
    double dl = (p.lon - referencia.lon) * M_PI / 180;
    if (cos(dl) < 1e-9)  // Δλ >= 90°, con margen para el redondeo de cos(π/2)
        return INF;
    return R * asin(cos(p.lat * M_PI / 180) * fabs(sin(dl)));
}

/**
 * @brief Clasificación local de un candidato: MAX si al menos pass_fraction de los n_rays rayos de círculo máximo a
 * ray_distance_km tienen su extremo a igual o menor altura que el candidato, MIN si a igual o mayor, NO_TYPE si no.
 * El umbral se cuenta sobre los n_rays rayos, no sobre los que se pueden interpolar.
 * La altura se compara en valores empaquetados: la conversión (z·escala + desplazamiento)/g₀ es creciente.
 */
enum Tipo_form clasificar_candidato(coord_point p, short z0, short **z, float *lats, float *lons) {
    int debajo = 0, encima = 0, umbral = (int)(PARAMS.n_rays * PARAMS.pass_fraction);
    for (int k = 0; k < PARAMS.n_rays; k++) {
        short z_rayo;
        // ALG-369: un rayo que cae fuera del fichero no vota (antes votaba a MAX). Con el umbral fijo sobre n_rays, un
        // candidato con más de n_rays - umbral rayos fuera no se clasifica.
        if (!bilinear_interpolation(coord_from_great_circle(p, PARAMS.ray_distance_km, BEARING_START + k * BEARING_STEP), z, lats, lons, &z_rayo))
            continue;
        debajo += z0 >= z_rayo;
        encima += z0 <= z_rayo;
    }
    return debajo >= umbral ? MAX : encima >= umbral ? MIN : NO_TYPE;
}

/**
 * @brief Lado del meridiano del máximo en el que queda el mínimo: -1 al oeste, 1 al este y 0 en el mismo meridiano.
 * La diferencia de longitud se toma con vuelta en ±180°.
 */
int lado_del_minimo(coord_point maximo, coord_point minimo) {
    double lon_max, lon_min;  // ALG-362: antes int, que truncaba la longitud
    if (fabs(maximo.lon - minimo.lon) >= 180) {
        if (maximo.lon > minimo.lon) {
            lon_max = maximo.lon - 360;
            lon_min = minimo.lon;
        } else {
            lon_min = minimo.lon - 360;
            lon_max = maximo.lon;
        }
    } else {
        lon_max = maximo.lon;
        lon_min = minimo.lon;
    }
    return lon_min < lon_max ? -1 : lon_min > lon_max ? 1 : 0;
}

/**
 * @brief Lado en el que un mínimo flanquea una Omega: el de lado_del_minimo si está a más de rex_max_offset_km del
 * meridiano del máximo, y 0 si no. Es el complemento exacto de la franja del Rex: un mínimo casi bajo la alta es un
 * dipolo alta-baja, no el flanco de una Omega (ALG-362; Hirt et al. 2018 separan ambos tipos por |Δλ|).
 */
int lado_flanco_omega(coord_point maximo, coord_point minimo) {
    return distancia_al_meridiano(minimo, maximo) > PARAMS.rex_max_offset_km ? lado_del_minimo(maximo, minimo) : 0;
}

/**
 * @brief Forma del mínimo de un Rex al nivel `contour`: contorno hacia el ecuador en todo el sector, hacia el polo en la
 * mayoría, y los lados acoplados con los de la alta: cerrado en todo el sector por el lado en que la alta está abierta
 * (`abierto_alta`: -1 oeste, 1 este) y abierto por el contrario. ALG-377: las dos orientaciones del dipolo.
 */
bool minimo_rex_valido(points_cluster minimo, int contour, int abierto_alta) {
    return check_contour_dir_rex(minimo, contour, 1, 0) && check_contour_dir_rex(minimo, contour, 0, abierto_alta) &&
           check_contour_dir_omega(minimo, contour, -1, 0) && !check_contour_dir_rex(minimo, contour, 0, -abierto_alta);
}

// ALG-379: hasta dónde baja la escalera de niveles antes de rendirse (m por debajo del centro). No es un umbral
// físico: la escalera acaba sola cuando la componente alcanza el cinturón; esto solo evita un bucle infinito si el
// campo tiene huecos raros.
#define LIMITE_ESCALERA_M 3000

// ¿Está el acimut dentro del sector de ±45° alrededor de `direccion`? Con NAN (sin silla) no hay dirección.
static bool sector_contiene(double acimut, double direccion) {
    if (!isfinite(acimut))
        return false;
    double d = fmod(fabs(acimut - direccion), 360.0);
    return fmin(d, 360.0 - d) <= 45.0;
}

void search_formation(points_cluster *clusters, int size, short **z_in, float *lats, float *lons, double scale_factor, double offset, char* filename, int time) {
    int i, j;
    double mean_dist, pair_score, best_score;
    points_cluster selected_izq = {0}, selected_der = {0}, selected_rex = {0};
    formation formation;

    // ALG-379: retícula de análisis del hemisferio, una vez por paso temporal. El test topológico se hace siempre
    // sobre el hemisferio completo (decisión del usuario, 2026-09-20), así que el resultado no depende del área
    // pedida: si la componente no toca el borde de los datos, es la misma que sobre el globo entero.
    rejilla_analisis *rejilla_norte = NULL, *rejilla_sur = NULL;
    for(i=0; i<size; i++) {
        if(hemisferio(clusters[i].center.lat) > 0 && rejilla_norte == NULL)
            rejilla_norte = rejilla_del_campo(z_in, lats, lons, scale_factor, offset, 1,
                                              PARAMS.candidate_spacing_deg, PARAMS.subtropical_belt_deg);
        if(hemisferio(clusters[i].center.lat) < 0 && rejilla_sur == NULL)
            rejilla_sur = rejilla_del_campo(z_in, lats, lons, scale_factor, offset, -1,
                                            PARAMS.candidate_spacing_deg, PARAMS.subtropical_belt_deg);
    }

    for(i=0; i<size;i++) {
        if(clusters[i].type == MAX) {
            // ALG-311: más allá de la guarda polar los sectores de rayos no distinguen direcciones; el máximo se
            // exporta como alta polar (sin mínimos) y no se evalúa como Omega ni Rex.
            if(fabs(clusters[i].center.lat) > guarda_polar_deg()) {
                export_formation_to_csv(create_formation(clusters[i].id, -1, -1, POLAR_HIGH, clusters[i].truncado), filename, time);
                continue;
            }
            const rejilla_analisis *rejilla = hemisferio(clusters[i].center.lat) > 0 ? rejilla_norte : rejilla_sur;
            mean_dist = INF;
            // B5: candidatos válidos de cada lado (índices en clusters); la pareja se elige tras recorrer los contornos.
            int cand_izq[size], cand_der[size], n_izq = 0, n_der = 0;
            selected_izq.center = create_point(INF, INF);
            selected_izq.id = -1;
            selected_der.center = create_point(INF, INF);
            selected_der.id = -1;
            selected_rex.center = create_point(INF, INF);
            selected_rex.id = -1;

            // ALG-379 (ruta A): nivel intrínseco. Se baja escalón a escalón mientras la componente conexa de la
            // isohipsa que contiene al centro siga cerrada; el último nivel cerrado es el contorno cerrado más
            // externo, y el siguiente es aquel en el que la alta se funde con el cinturón subtropical. Ya no hay
            // barrido de niveles ni radio de búsqueda: el nivel lo pone el campo.
            int nodo_i, nodo_j;
            nodo_de(rejilla, clusters[i].center, &nodo_i, &nodo_j);
            bool hay_cierre = false;
            int nivel_cierre = 0;
            // La escalera arranca del valor de la retícula en el nodo, no de la altura del fichero: si el nodo interpolado
            // queda por debajo del primer nivel, el centro no está en su propio conjunto y todo sale INDETERMINADO.
            double techo_nodo = valor_rejilla(rejilla, nodo_i, nodo_j);
            for(int nivel = (int)floor(techo_nodo / PARAMS.contour_step_m) * PARAMS.contour_step_m;
                nivel > techo_nodo - LIMITE_ESCALERA_M; nivel -= PARAMS.contour_step_m) {
                enum Cierre estado = estado_contorno(rejilla, nodo_i, nodo_j, nivel, MAX, PARAMS.subtropical_belt_deg);
                if(estado == CIERRE_CERRADO) {
                    nivel_cierre = nivel;
                    hay_cierre = true;
                    continue;
                }
                // ALG-376: si la componente toca el borde de los datos, no se puede demostrar nada más abajo.
                if(estado == CIERRE_INDETERMINADO)
                    clusters[i].truncado = true;
                break;
            }
            if(!hay_cierre)  // ya abierta en su propio nivel: es el cinturón, no un bloqueo
                continue;

            int nivel_apertura = nivel_cierre - PARAMS.contour_step_m;
            double acimut = acimut_de_la_silla(rejilla, nodo_i, nodo_j, nivel_cierre, nivel_apertura,
                                               PARAMS.subtropical_belt_deg, clusters[i].center);
            int hemi = hemisferio(clusters[i].center.lat);
            // Sectores de ±45° alrededor de un punto intrínseco (la silla), no de 17 rayos de 64.
            bool abierta_ecuador = sector_contiene(acimut, hemi > 0 ? 180 : 0);
            bool abierta_este = sector_contiene(acimut, 90), abierta_oeste = sector_contiene(acimut, 270);

            {
                if(abierta_ecuador) {

                    for(j=0; j<size; j++) {
                        if(point_distance(clusters[j].center, clusters[i].center) > PARAMS.search_radius_km)
                                continue;
                        
                        int lado = lado_flanco_omega(clusters[i].center, clusters[j].center);

                        if(clusters[j].type != MIN || hemisferio(clusters[i].center.lat) * clusters[j].center.lat > hemisferio(clusters[i].center.lat) * clusters[i].center.lat || lado == 0)
                            continue;
                        if(clusters[i].contour == clusters[j].contour)
                            continue;

                        // ALG-379: las dos patas de la Omega son dos bajas separadas por la alta, es decir, en
                        // componentes distintas de {z <= nivel_apertura}. Eso sustituye a los sectores de rayos.
                        int min_i, min_j;
                        nodo_de(rejilla, clusters[j].center, &min_i, &min_j);
                        if(misma_componente(rejilla, nodo_i, nodo_j, min_i, min_j, nivel_apertura, MIN))
                            continue;

                        if(lado < 0) {
                            int k = 0;
                            while(k < n_izq && cand_izq[k] != j) k++;
                            if(k == n_izq) cand_izq[n_izq++] = j;
                        } else {
                            int k = 0;
                            while(k < n_der && cand_der[k] != j) k++;
                            if(k == n_der) cand_der[n_der++] = j;
                        }
                    }
                } else {
                    // ALG-377 + ALG-379: la alta se abre por un solo lado, este u oeste (-1 oeste, 1 este).
                    int abierto_alta = abierta_oeste ? -1 : abierta_este ? 1 : 0;
                    if(abierto_alta != 0) {
                        for(j=0; j<size; j++) {
                            if(point_distance(clusters[j].center, clusters[i].center) > PARAMS.search_radius_km)
                                continue;

                            if(clusters[j].type != MIN || hemisferio(clusters[i].center.lat) * clusters[j].center.lat > hemisferio(clusters[i].center.lat) * clusters[i].center.lat || distancia_al_meridiano(clusters[j].center, clusters[i].center) > PARAMS.rex_max_offset_km)
                                continue;

                            // ALG-379: la baja de un Rex es una baja DESPRENDIDA de la vaguada circumpolar, así que su
                            // contorno tiene que estar cerrado. Antes se descartaba justo cuando lo estaba, lo que
                            // funcionaba como filtro de tamaño encubierto, no como criterio físico
                            // (Rex 1950; Berggren, Bolin y Rossby 1949).
                            int min_i, min_j;
                            nodo_de(rejilla, clusters[j].center, &min_i, &min_j);
                            if(estado_contorno(rejilla, min_i, min_j, nivel_apertura, MIN, PARAMS.subtropical_belt_deg) != CIERRE_CERRADO)
                                continue;

                            if(point_distance(clusters[j].center, clusters[i].center) < point_distance(selected_rex.center, clusters[i].center))
                                selected_rex = clusters[j];
                        }
                    }  
                }
            }

            // B5: pareja (izquierdo, derecho) con menor distancia media del triángulo máximo-izq-der, sin
            // depender del orden de los clusters. Empates: menor id izquierdo y, después, menor id derecho.
            best_score = INF;
            for(int a=0; a<n_izq; a++) {
                for(int b=0; b<n_der; b++) {
                    points_cluster izq = clusters[cand_izq[a]], der = clusters[cand_der[b]];
                    pair_score = (point_distance(izq.center, clusters[i].center)+point_distance(izq.center, der.center)+point_distance(der.center, clusters[i].center))/3;
                    if(pair_score < best_score || (pair_score == best_score && (izq.id < selected_izq.id || (izq.id == selected_izq.id && der.id < selected_der.id)))) {
                        best_score = pair_score;
                        selected_izq = izq;
                        selected_der = der;
                    }
                }
            }

            if(selected_rex.center.lat != INF && selected_rex.id != -1 && selected_izq.center.lat != INF && selected_der.center.lat != INF && selected_izq.id != -1 && selected_der.id != -1) {
                mean_dist = (point_distance(selected_der.center, clusters[i].center)+point_distance(clusters[i].center, selected_izq.center))/2;
                if(mean_dist < point_distance(selected_rex.center, clusters[i].center)) {
                    selected_rex.center.lat = INF;
                    selected_rex.center.lon = INF;
                    selected_rex.id = -1;
                } else {
                    selected_der.center.lat = INF;
                    selected_der.center.lon = INF;
                    selected_der.id = -1;

                    selected_izq.center.lat = INF;
                    selected_izq.center.lon = INF;
                    selected_izq.id = -1;
                }
            }
            
            if(selected_rex.center.lat != INF && selected_rex.id != -1) {
                printf("Formación REX encontrada: %d, %d\n", clusters[i].id, selected_rex.id);
                formation = create_formation(clusters[i].id, selected_rex.id, -1, REX, clusters[i].truncado || selected_rex.truncado);
                export_formation_to_csv(formation, filename, time);
            } else if (selected_izq.center.lat != INF && selected_der.center.lat != INF && selected_izq.id != -1 && selected_der.id != -1) {
                printf("Formación OMEGA encontrada: %d, %d, %d\n", clusters[i].id, selected_izq.id, selected_der.id);   
                formation = create_formation(clusters[i].id, selected_izq.id, selected_der.id, OMEGA,
                                            clusters[i].truncado || selected_izq.truncado || selected_der.truncado);
                export_formation_to_csv(formation, filename, time);
            }
        }
    }

    liberar_rejilla(rejilla_norte);
    liberar_rejilla(rejilla_sur);
}


//Función para calcular la distancia entre dos puntos en el globo.
double point_distance(coord_point p1, coord_point p2) {
    double lat1, lon1, lat2, lon2, dlat, dlon, a, c, d;

    lat1 = p1.lat * M_PI / 180;
    lon1 = p1.lon * M_PI / 180;
    lat2 = p2.lat * M_PI / 180;
    lon2 = p2.lon * M_PI / 180;

    dlat = lat2 - lat1;
    dlon = lon2 - lon1;

    //Haversine formula
    a = pow(sin(dlat/2), 2) + cos(lat1) * cos(lat2) * pow(sin(dlon/2), 2);
    c = 2 * atan2(sqrt(a), sqrt(1-a));
    d = R * c;

    return d;
}

// Pila de índices (fila, columna) de expandCluster.
typedef struct {
    int *datos, n, capacidad;
} pila_indices;

// Marca (x, y) con `id` y lo apila si es un candidato del mismo tipo aún sin cluster.
static void visitar(selected_point **puntos, int x, int y, enum Tipo_form tipo, int id, pila_indices *pila) {
    if (puntos[x][y].cluster != -1 || puntos[x][y].type != tipo)
        return;
    puntos[x][y].cluster = id;
    if (pila->n == pila->capacidad) {
        pila->capacidad *= 2;
        int *mayor = realloc(pila->datos, 2 * pila->capacidad * sizeof(int));
        if (mayor == NULL) {
            free(pila->datos);
            perror("expandCluster: sin memoria");
            exit(EXIT_FAILURE);
        }
        pila->datos = mayor;
    }
    pila->datos[2 * pila->n] = x;
    pila->datos[2 * pila->n + 1] = y;
    pila->n++;
}

/**
 * @brief B8 (ALG-403): recorrido iterativo con pila explícita (el DFS recursivo desbordaba la pila con clusters grandes).
 * Marca la componente conexa del punto semilla entre candidatos del mismo tipo.
 *
 * ALG-309 (F3.9): la vecindad es topológica sobre la retícula de candidatos: los 8 vecinos, con vuelta en longitud si la
 * retícula es global, y la fila de un polo como un único punto (todos sus candidatos son vecinos entre sí). El antiguo
 * eps en grados no descartaba ningún vecino (C10), y un umbral geodésico √2·R·Δ también los aceptaría siempre, así que
 * se elimina (el coste de point_distance se midió en ALG-312).
 */
void expandCluster(selected_point **filtered_points, int size_x, int size_y, int i, int j, int id) {
    double paso_lon = size_y > 1 ? filtered_points[0][1].point.lon - filtered_points[0][0].point.lon : 0;
    bool global = size_y > 1 && fabs(size_y * paso_lon - 360.0) <= TOL_PASO * size_y;
    pila_indices pila = {malloc(2 * 64 * sizeof(int)), 0, 64};
    if (pila.datos == NULL) {
        perror("expandCluster: sin memoria");
        exit(EXIT_FAILURE);
    }
    pila.datos[0] = i;
    pila.datos[1] = j;
    pila.n = 1;

    while (pila.n > 0) {
        pila.n--;
        int ci = pila.datos[2 * pila.n], cj = pila.datos[2 * pila.n + 1];
        enum Tipo_form tipo = filtered_points[ci][cj].type;

        for (int x = ci - 1; x <= ci + 1; x++) {
            if (x < 0 || x > size_x - 1)
                continue;
            for (int y = cj - 1; y <= cj + 1; y++) {
                if (x == ci && y == cj)
                    continue;
                int yy = y;
                if (yy < 0 || yy > size_y - 1) {
                    if (!global)
                        continue;
                    yy = (yy + size_y) % size_y;
                }
                visitar(filtered_points, x, yy, tipo, id, &pila);
            }
        }
        if (fabs(fabs(filtered_points[ci][cj].point.lat) - 90.0) <= TOL_PASO)
            for (int y = 0; y < size_y; y++)
                visitar(filtered_points, ci, y, tipo, id, &pila);
    }
    free(pila.datos);
}

// ALG-351: un paso temporal completo, común a las cuatro variantes (n_hilos = 1 en las que no usan OpenMP).
// Clasifica los candidatos, agrupa y filtra los clusters, busca formaciones y exporta. Devuelve el tiempo del paso.
double procesar_paso(int time, short **z, float *lats, float *lons, selected_point **puntos, int size_x, int size_y, int step,
                     double scale_factor, double offset, char *filename, char *filename2, char *speed_file, int n_hilos) {
    double t_ini = omp_get_wtime(), t_fin, t_paso = 0;
    int i, j, k, id;
    FILE *fp;

    // Cada celda se escribe una sola vez y no hay acumulación: el reparto entre hilos no cambia la salida.
    #pragma omp parallel for num_threads(n_hilos) schedule(dynamic, 2)
    for(int lat=0;lat<size_x;lat++)
        for(int lon=0;lon<size_y;lon++) {
            // ALG-369: clasificación local del candidato con los rayos de círculo máximo.
            coord_point candidato = create_point(lats[FILA_LAT_INICIO + lat*step], lons[COL_LON_INICIO + lon*step]);
            short z_candidato = z[FILA_LAT_INICIO + lat*step][COL_LON_INICIO + lon*step];
            puntos[lat][lon] = create_selected_point(candidato, z_candidato, clasificar_candidato(candidato, z_candidato, z, lats, lons), -1);
        }

    t_fin = omp_get_wtime();
    printf("\n#2-%d. Filtrado y selección de máximos y mínimos realizada con éxito: %.6f s.\n", time, t_fin-t_ini);
    fp = fopen(speed_file, "a");
    fprintf(fp, "1,%d,%.3f\n", time, t_fin-t_ini);
    fclose(fp);
    t_paso += t_fin-t_ini;
    t_ini = omp_get_wtime();

    id=0;
    for(i=0; i<size_x;i++)
        for(j=0; j< size_y;j++)
            if(puntos[i][j].cluster == -1 && puntos[i][j].type != NO_TYPE) {
                puntos[i][j].cluster = id;
                expandCluster(puntos, size_x, size_y, i, j, id);
                id++;
            }

    points_cluster *clusters_aux = fill_clusters(puntos, size_x, size_y, id, offset, scale_factor);
    int clusters_cont=0;
    for(i=0;i<id;i++)
        if(fuera_de_latitudes(&clusters_aux[i]) || clusters_aux[i].area_km2 < PARAMS.min_cluster_area_km2)
            clusters_cont++;

    points_cluster *clusters = malloc((id-clusters_cont)*sizeof(points_cluster));
    for(i=0, j=0;i<id;i++) {
        if(!fuera_de_latitudes(&clusters_aux[i]) && clusters_aux[i].area_km2 >= PARAMS.min_cluster_area_km2) {
            clusters[j] = clusters_aux[i];
            clusters[j].id = j;
            for(k=0;k<clusters[j].n_points;k++)
                clusters[j].points[k].cluster = j;
            clusters[j].point_izq.cluster = j;
            clusters[j].point_der.cluster = j;
            clusters[j].point_sup.cluster = j;
            clusters[j].point_inf.cluster = j;
            j++;
        } else {
            free(clusters_aux[i].points);  // R5 (ALG-203): cluster descartado por el filtro
        }
    }
    free(clusters_aux);

    // ALG-108: invierte el orden de los clusters (conservando sus id) para comprobar
    // que las formaciones no dependen del orden en que se recorren.
    if(getenv("FAST_IBAN_INVERTIR_CLUSTERS") != NULL)
        for(k=0; k<j/2; k++) {
            points_cluster aux = clusters[k];
            clusters[k] = clusters[j-1-k];
            clusters[j-1-k] = aux;
        }

    t_fin = omp_get_wtime();
    t_paso += t_fin-t_ini;
    t_ini = omp_get_wtime();

    search_formation(clusters, j, z, lats, lons, scale_factor, offset, filename2, time);

    t_fin = omp_get_wtime();
    printf("\n#4-%d. Búsqueda de formaciones realizada con éxito: %.6f s.\n", time, t_fin-t_ini);
    fp = fopen(speed_file, "a");
    fprintf(fp, "2,%d,%.3f\n", time, t_fin-t_ini);
    fclose(fp);
    t_paso += t_fin-t_ini;
    t_ini = omp_get_wtime();

    export_clusters_to_csv(clusters, j, filename, offset, scale_factor, time);

    t_fin = omp_get_wtime();
    printf("\n#5-%d. Archivo escrito con éxito: %.6f s.\n", time, t_fin-t_ini);
    t_paso += t_fin-t_ini;

    printf("Tiempo %d procesado.\n", time);
    for(i=0; i<j; i++)
        free(clusters[i].points);  // R5 (ALG-203)
    free(clusters);
    return t_paso;
}
