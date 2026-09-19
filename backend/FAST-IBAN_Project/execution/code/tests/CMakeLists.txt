cmake_minimum_required(VERSION 3.8...3.27)

project(TESTS)

# add_executable(TEST_coordpoint test_coordpoint.c)
# add_executable(TEST_great_circle test_great_circle.c)
# add_executable(TEST_bilinear_int test_bilinear_int.c)
# add_executable(TEST_point_dist test_point_distance.c)
# add_executable(TEST_contours test_contours.c)
# add_executable(TEST_bearing test_bearing_points.c)
add_executable(TEST_lines test_line_between_points.c)
add_executable(TEST_geometria_polar test_geometria_polar.c)


# target_link_libraries(TEST_coordpoint LIB)

# target_link_libraries(TEST_great_circle LIB CALC)
# target_link_libraries(TEST_great_circle m)

# target_link_libraries(TEST_bilinear_int LIB CALC)
# target_link_libraries(TEST_bilinear_int m)

# target_link_libraries(TEST_point_dist LIB CALC UTILS INIT)
# target_link_libraries(TEST_point_dist m)

# target_link_libraries(TEST_contours LIB CALC UTILS INIT)
# target_link_libraries(TEST_contours m)
# target_link_libraries(TEST_contours netcdf)

# target_link_libraries(TEST_bearing LIB CALC UTILS INIT)
# target_link_libraries(TEST_bearing m)
target_link_libraries(TEST_lines LIB)
target_link_libraries(TEST_geometria_polar CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)



# add_test(NAME test_coordpoint COMMAND TEST_coordpoint)
# add_test(NAME test_great_circle COMMAND TEST_great_circle)
# add_test(NAME test_bilinear_int COMMAND TEST_bilinear_int)
# add_test(NAME test_point_dist COMMAND TEST_point_dist)
# add_test(NAME test_contours COMMAND TEST_contours)
# add_test(NAME test_bearing COMMAND TEST_bearing)
add_test(NAME test_lines COMMAND TEST_lines)
# ALG-006: los 64 rayos no degeneran cerca del polo (función real, ambos hemisferios)
add_test(NAME test_geometria_polar COMMAND TEST_geometria_polar)
# ALG-105 (B1): findIndex en O(1), con vuelta en longitud sobre la rejilla real
add_executable(TEST_findindex test_findindex.c)
target_link_libraries(TEST_findindex UTILS LIB m)
add_test(NAME test_findindex COMMAND TEST_findindex)
# ALG-106 (B7): la interpolación no usa -1 como centinela (es un valor válido)
add_executable(TEST_bilinear test_bilinear.c)
target_link_libraries(TEST_bilinear CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_bilinear COMMAND TEST_bilinear)
# ALG-403 (B8): expandCluster sin recursión, sin desbordar la pila con clusters grandes
add_executable(TEST_expandcluster test_expandcluster.c)
target_link_libraries(TEST_expandcluster CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_expandcluster COMMAND TEST_expandcluster)
# ALG-309 (F3.9): vecindad con vuelta en ±180° y la fila del polo como un único punto
add_executable(TEST_vecindad test_vecindad.c)
target_link_libraries(TEST_vecindad CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_vecindad COMMAND TEST_vecindad)

# ALG-204 (R2): lectura de un paso temporal y corrección de longitudes [0, 360) -> [-180, 180)
add_executable(TEST_lectura_nc test_lectura_nc.c)
target_link_libraries(TEST_lectura_nc INIT UTILS LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_lectura_nc COMMAND TEST_lectura_nc WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})

# ALG-003: regresión por hash de la salida completa sobre el caso fijo
add_test(NAME regresion_hash COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_baseline.sh $<TARGET_FILE:FAST-IBAN>)
set_tests_properties(regresion_hash PROPERTIES TIMEOUT 900)

# ALG-004: la variante OpenMP debe dar la misma línea base con cualquier número de hilos
foreach(hilos 1 4 16)
    add_test(NAME invariancia_omp_${hilos} COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_baseline.sh $<TARGET_FILE:FAST-IBAN_omp> ${hilos})
    set_tests_properties(invariancia_omp_${hilos} PROPERTIES TIMEOUT 900)
endforeach()

# ALG-206: MPI reparte los pasos temporales entre procesos; la salida (y los contadores sumados) debe
# ser la misma línea base con cualquier número de procesos, también combinando procesos e hilos.
foreach(procesos 1 2 3)
    add_test(NAME invariancia_mpi_${procesos} COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_baseline.sh $<TARGET_FILE:FAST-IBAN_mpi>)
    set_tests_properties(invariancia_mpi_${procesos} PROPERTIES TIMEOUT 900 ENVIRONMENT
        "LANZADOR=${MPIEXEC_EXECUTABLE} ${MPIEXEC_NUMPROC_FLAG} ${procesos}")
endforeach()
add_test(NAME invariancia_omp_mpi_3x2 COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_baseline.sh $<TARGET_FILE:FAST-IBAN_omp_mpi> 2)
set_tests_properties(invariancia_omp_mpi_3x2 PROPERTIES TIMEOUT 900 ENVIRONMENT
    "LANZADOR=${MPIEXEC_EXECUTABLE} ${MPIEXEC_NUMPROC_FLAG} 3")

# ALG-108: las formaciones no deben depender del orden de los clusters (caso donde B5 lo hacía visible)
add_test(NAME invariancia_orden COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_orden.sh $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_SOURCE_DIR}/fixtures/geopot_500hPa_2003-08-14-15_18-00UTC.nc)
set_tests_properties(invariancia_orden PROPERTIES TIMEOUT 900)

# Test de B4 (ALG-103): hash de la salida del caso de 2003, con varias OMEGA de mínimos a ambos lados.
# Detecta filtros asimétricos entre la rama izquierda y la derecha de search_formation.
add_test(NAME regresion_hash_2003 COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_baseline.sh $<TARGET_FILE:FAST-IBAN>)
set_tests_properties(regresion_hash_2003 PROPERTIES TIMEOUT 900 ENVIRONMENT
    "CASO=${CMAKE_CURRENT_SOURCE_DIR}/fixtures/geopot_500hPa_2003-08-14-15_18-00UTC.nc;BASE=${CMAKE_CURRENT_SOURCE_DIR}/regression/baseline_2003.sha256")

# ALG-113: errores de entrada de init.c. Cada caso termina con exit(): se comprueba el mensaje que lo explica.
set(CASO_FIJO ${CMAKE_CURRENT_SOURCE_DIR}/fixtures/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc)
string(REPEAT "x" 300 NOMBRE_LARGO)
add_test(NAME init_nombre_demasiado_largo COMMAND FAST-IBAN ${NOMBRE_LARGO}.nc 25 85 -180 180 out/ 1)
add_test(NAME init_latitud_incorrecta COMMAND FAST-IBAN ${CASO_FIJO} 85 25 -180 180 out/ 1)
add_test(NAME init_longitud_incorrecta COMMAND FAST-IBAN ${CASO_FIJO} 25 85 -200 180 out/ 1)
add_test(NAME init_hilos_incorrectos COMMAND FAST-IBAN ${CASO_FIJO} 25 85 -180 180 out/ 0)
add_test(NAME init_sin_argumentos COMMAND FAST-IBAN)
add_test(NAME init_directorio_salida_imposible COMMAND FAST-IBAN ${CASO_FIJO} 25 85 -180 180 no/existe/out/ 1)
add_executable(TEST_init_dimensiones test_init_dimensiones.c)
target_link_libraries(TEST_init_dimensiones INIT UTILS LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME init_z_sin_3_dimensiones COMMAND TEST_init_dimensiones WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})
set_tests_properties(init_nombre_demasiado_largo PROPERTIES PASS_REGULAR_EXPRESSION "demasiado largo")
set_tests_properties(init_latitud_incorrecta PROPERTIES PASS_REGULAR_EXPRESSION "de latitud son incorrectos")
set_tests_properties(init_longitud_incorrecta PROPERTIES PASS_REGULAR_EXPRESSION "de longitud son incorrectos")
set_tests_properties(init_hilos_incorrectos PROPERTIES PASS_REGULAR_EXPRESSION "hilos no puede")
# Sin argumentos usa el caso por defecto config/data/…, que no existe fuera del portal: nc_open falla.
set_tests_properties(init_sin_argumentos PROPERTIES PASS_REGULAR_EXPRESSION "No such file")
set_tests_properties(init_directorio_salida_imposible PROPERTIES PASS_REGULAR_EXPRESSION "Error creating directory")
set_tests_properties(init_z_sin_3_dimensiones PROPERTIES PASS_REGULAR_EXPRESSION "debe tener 3 dimensiones")

# ALG-301 (L1): la resolución se lee del NetCDF; una rejilla con paso no uniforme se rechaza.
add_executable(TEST_resolucion test_resolucion.c)
target_link_libraries(TEST_resolucion CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_resolucion_medio_grado COMMAND TEST_resolucion WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})
add_test(NAME init_rejilla_irregular COMMAND TEST_resolucion irregular WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})
set_tests_properties(init_rejilla_irregular PROPERTIES PASS_REGULAR_EXPRESSION "paso uniforme")

# ALG-302: la rejilla se recorre desde la primera fila del fichero hasta LAT_LIM_MIN, sin suponer 90°N ni 0,25°.
# Variantes del caso fijo generadas al vuelo: desde 80°N, y a 1° tomando 1 de cada 4 puntos.
add_executable(RECORTAR_NC recortar_nc.c)
target_link_libraries(RECORTAR_NC netcdf)
add_test(NAME preparar_caso_80N COMMAND RECORTAR_NC ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/caso_80N.nc z 80 1)
add_test(NAME preparar_caso_1grado COMMAND RECORTAR_NC ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/caso_1grado.nc z 90 4)
set_tests_properties(preparar_caso_80N preparar_caso_1grado PROPERTIES FIXTURES_SETUP recortes)
set(COMPROBAR_LATITUDES ${CMAKE_CURRENT_SOURCE_DIR}/regression/comprobar_latitudes.sh)
# Área de 80°N a 0°N, como la pide el portal: LAT_LIM_MIN = 0 (con 20, code/ descarta en la salida lo que lee de más).
add_test(NAME latitudes_desde_80N COMMAND sh ${COMPROBAR_LATITUDES} $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_BINARY_DIR}/caso_80N.nc 0 85 80)
add_test(NAME latitudes_rejilla_1grado COMMAND sh ${COMPROBAR_LATITUDES} $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_BINARY_DIR}/caso_1grado.nc 25 85 90)
set_tests_properties(latitudes_desde_80N latitudes_rejilla_1grado PROPERTIES FIXTURES_REQUIRED recortes TIMEOUT 600)
# Leer filas de más no siempre rompe el proceso; con valgrind (instalado en el CI) cualquier lectura fuera falla.
find_program(VALGRIND valgrind)
if(VALGRIND)
    set_tests_properties(latitudes_desde_80N latitudes_rejilla_1grado PROPERTIES ENVIRONMENT
        "LANZADOR=${VALGRIND} -q --error-exitcode=3")
endif()
# LAT_LIM_MIN por debajo de la última latitud del fichero (el caso fijo llega a 0°): error explicado.
add_test(NAME init_latitud_fuera_del_fichero COMMAND FAST-IBAN ${CASO_FIJO} -10 85 -180 180 out/ 1)
set_tests_properties(init_latitud_fuera_del_fichero PROPERTIES PASS_REGULAR_EXPRESSION "fuera de las latitudes del fichero")

# ALG-303/307: simetría hemisférica. El caso fijo reflejado en el ecuador y recortado a 25°S debe dar las mismas
# detecciones que el original con la latitud cambiada de signo.
add_test(NAME preparar_caso_espejo COMMAND RECORTAR_NC ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/caso_espejo.nc z -25 1 espejo)
set_tests_properties(preparar_caso_espejo PROPERTIES FIXTURES_SETUP recortes)
# ALG-308: promedio de área conservativo para degradar a 0,5° y 1° (docs/invariancia_resolucion.md).
add_executable(TEST_degradar test_degradar.c)
target_link_libraries(TEST_degradar m)
add_test(NAME test_degradar COMMAND TEST_degradar)
add_executable(DEGRADAR_NC degradar_nc.c)
target_link_libraries(DEGRADAR_NC netcdf m)
# El caso fijo promediado a 1° corre de principio a fin (la herramienta escribe un NetCDF que el núcleo acepta).
add_test(NAME preparar_caso_promedio_1grado COMMAND DEGRADAR_NC ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/caso_promedio_1grado.nc z 4)
set_tests_properties(preparar_caso_promedio_1grado PROPERTIES FIXTURES_SETUP promedios)
add_test(NAME caso_promedio_1grado COMMAND FAST-IBAN ${CMAKE_CURRENT_BINARY_DIR}/caso_promedio_1grado.nc 25 90 -180 180 out_promedio/ 1)
set_tests_properties(caso_promedio_1grado PROPERTIES FIXTURES_REQUIRED promedios PASS_REGULAR_EXPRESSION "Successful search for formations")
# ALG-369: los dos lados con la misma cobertura de datos. El norte es el espejo del sur recortado (90°N a 25°N): con el
# fichero del norte completo, sus rayos tendrían datos al sur de 25°N que al sur de -25° no hay, y ya no votan.
add_test(NAME preparar_caso_norte_recortado COMMAND RECORTAR_NC ${CMAKE_CURRENT_BINARY_DIR}/caso_espejo.nc ${CMAKE_CURRENT_BINARY_DIR}/caso_norte_recortado.nc z 90 1 espejo)
set_tests_properties(preparar_caso_norte_recortado PROPERTIES FIXTURES_SETUP recortes DEPENDS preparar_caso_espejo)
add_test(NAME simetria_hemisferica COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/comprobar_simetria.sh
    $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_BINARY_DIR}/caso_norte_recortado.nc ${CMAKE_CURRENT_BINARY_DIR}/caso_espejo.nc)
# ALG-374: dominio de análisis por hemisferio.
add_executable(TEST_dominio_latitudes test_dominio_latitudes.c)
target_link_libraries(TEST_dominio_latitudes INIT UTILS LIB CALC m netcdf OpenMP::OpenMP_C)
add_test(NAME test_dominio_latitudes COMMAND TEST_dominio_latitudes)
# ALG-374: el mismo espejo SIN recortar en 25°S. Con el fichero completo (0° a -90°) el límite hacia el ecuador del
# hemisferio sur es LAT_LIM_MAX, no LAT_LIM_MIN: si se toma mal, se procesa la franja de 0° a -25° que el norte no ve.
add_test(NAME preparar_caso_espejo_completo COMMAND RECORTAR_NC ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/caso_espejo_completo.nc z 90 1 espejo)
set_tests_properties(preparar_caso_espejo_completo PROPERTIES FIXTURES_SETUP recortes)
add_test(NAME simetria_hemisferica_completa COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/comprobar_simetria.sh
    $<TARGET_FILE:FAST-IBAN> ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/caso_espejo_completo.nc)
set_tests_properties(simetria_hemisferica_completa PROPERTIES FIXTURES_REQUIRED recortes)
set_tests_properties(simetria_hemisferica PROPERTIES FIXTURES_REQUIRED recortes TIMEOUT 300)
# ALG-305 (L4): parámetros en config/params.yaml. Las variantes de los tests se derivan del fichero real al configurar.
set(PARAMS_DEFECTO ${CMAKE_CURRENT_SOURCE_DIR}/../config/params.yaml)
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${PARAMS_DEFECTO})
file(READ ${PARAMS_DEFECTO} PARAMS_TEXTO)
function(variante_params nombre buscar reemplazar)
    # Expresión regular sobre el valor, para no depender del valor por defecto de cada clave.
    string(REGEX REPLACE "${buscar}" "${reemplazar}" texto "${PARAMS_TEXTO}")
    if(texto STREQUAL PARAMS_TEXTO)
        message(FATAL_ERROR "variante_params(${nombre}): no se encuentra '${buscar}' en ${PARAMS_DEFECTO}")
    endif()
    file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/params_${nombre}.yaml "${texto}")
endfunction()
variante_params(pass_08 "pass_fraction: [0-9.]+" "pass_fraction: 0.8")
variante_params(espaciado_no_multiplo "candidate_spacing_deg: [0-9.]+" "candidate_spacing_deg: 1.1")
variante_params(clave_desconocida "n_rays: [0-9]+" "n_rays: 64\nsearch_radius: 3000")
variante_params(sin_clave "rex_max_offset_km: [0-9.]+" "")
variante_params(rayos_no_multiplo "n_rays: [0-9]+" "n_rays: 60")
variante_params(rayos_400 "ray_distance_km: [0-9.]+" "ray_distance_km: 400")

# ALG-374: sin los filtros de cluster, en el hemisferio sur no puede quedar ningún candidato del lado del ecuador del
# límite pedido (-25°). Antes se recorría hasta 0°, porque el límite hacia el ecuador se tomaba de LAT_LIM_MIN.
string(REGEX REPLACE "min_cluster_area_km2: [0-9.]+" "min_cluster_area_km2: 0" SIN_FILTROS "${PARAMS_TEXTO}")
string(REGEX REPLACE "cluster_lat_min_deg: [0-9.]+" "cluster_lat_min_deg: 0" SIN_FILTROS "${SIN_FILTROS}")
file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/params_sin_filtros.yaml "${SIN_FILTROS}")
add_test(NAME latitudes_hemisferio_sur COMMAND sh ${COMPROBAR_LATITUDES}
    $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_BINARY_DIR}/caso_espejo_completo.nc -90 -25 0 -25)
# ALG-369 (ALG-358): solo se informa de candidatos dentro del área pedida, también en longitud y hacia el polo. El
# portal descarga un margen alrededor del área para que los rayos de los bordes tengan datos.
add_test(NAME area_pedida COMMAND sh ${COMPROBAR_LATITUDES}
    $<TARGET_FILE:FAST-IBAN> ${CASO_FIJO} 30 70 90 70 -30 40)
set_tests_properties(area_pedida PROPERTIES TIMEOUT 600)
set_tests_properties(latitudes_hemisferio_sur PROPERTIES FIXTURES_REQUIRED recortes TIMEOUT 600
    ENVIRONMENT "FAST_IBAN_PARAMS=${CMAKE_CURRENT_BINARY_DIR}/params_sin_filtros.yaml")


# ALG-360: comprobaciones de contorno con rayos geodésicos, independientes de la latitud, la resolución y ±180°.
add_executable(TEST_rayos_geodesicos test_rayos_geodesicos.c)
target_link_libraries(TEST_rayos_geodesicos CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_rayos_geodesicos COMMAND TEST_rayos_geodesicos)
set_tests_properties(test_rayos_geodesicos PROPERTIES TIMEOUT 300)
# ALG-360: niveles de contorno explícitos, sin saltos en rejillas gruesas.
add_executable(TEST_niveles_contorno test_niveles_contorno.c)
target_link_libraries(TEST_niveles_contorno CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_niveles_contorno COMMAND TEST_niveles_contorno)

# ALG-310/311: un máximo más allá de la guarda polar (derivada de ray_distance_km) se clasifica POLAR_HIGH.
add_executable(TEST_polar_high test_polar_high.c)
target_link_libraries(TEST_polar_high CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_polar_high COMMAND TEST_polar_high)
set_tests_properties(test_polar_high PROPERTIES TIMEOUT 300)

# ALG-369: un rayo que no se puede interpolar no vota en la clasificación del candidato.
add_executable(TEST_clasificar_candidato test_clasificar_candidato.c)
target_link_libraries(TEST_clasificar_candidato CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_clasificar_candidato COMMAND TEST_clasificar_candidato)
# ALG-362: lado del mínimo respecto al meridiano del máximo, sin truncar la longitud.
add_executable(TEST_lado_minimo test_lado_minimo.c)
target_link_libraries(TEST_lado_minimo CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_lado_minimo COMMAND TEST_lado_minimo)
# ALG-361: el mínimo de un Rex tiene el contorno abierto hacia el este.
add_executable(TEST_minimo_rex test_minimo_rex.c)
target_link_libraries(TEST_minimo_rex CALC UTILS INIT LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_minimo_rex COMMAND TEST_minimo_rex)

# ALG-306: área de las celdas de candidatos, R²·Δλ·Δφ·cos φ
add_executable(TEST_area_celda test_area_celda.c)
target_link_libraries(TEST_area_celda LIB m)
add_test(NAME test_area_celda COMMAND TEST_area_celda)

add_executable(TEST_parametros test_parametros.c)
target_link_libraries(TEST_parametros INIT UTILS LIB m netcdf OpenMP::OpenMP_C)
add_test(NAME test_parametros COMMAND TEST_parametros)
foreach(caso clave_desconocida sin_clave rayos_no_multiplo)
    add_test(NAME parametros_${caso} COMMAND TEST_parametros ${CMAKE_CURRENT_BINARY_DIR}/params_${caso}.yaml)
endforeach()
set_tests_properties(parametros_clave_desconocida PROPERTIES PASS_REGULAR_EXPRESSION "clave desconocida: search_radius")
set_tests_properties(parametros_sin_clave PROPERTIES PASS_REGULAR_EXPRESSION "falta la clave rex_max_offset_km")
set_tests_properties(parametros_rayos_no_multiplo PROPERTIES PASS_REGULAR_EXPRESSION "positivo de 8")
add_test(NAME parametros_espaciado_no_multiplo COMMAND FAST-IBAN ${CASO_FIJO} 25 85 -180 180 out/ 1)
set_tests_properties(parametros_espaciado_no_multiplo PROPERTIES PASS_REGULAR_EXPRESSION "entero de la resoluci"
    ENVIRONMENT "FAST_IBAN_PARAMS=${CMAKE_CURRENT_BINARY_DIR}/params_espaciado_no_multiplo.yaml")
add_test(NAME parametros_en_cabecera_y_en_uso COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/comprobar_parametros.sh
    $<TARGET_FILE:FAST-IBAN> ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/params_pass_08.yaml "pass_fraction: 0.8"
    ${CMAKE_CURRENT_SOURCE_DIR}/regression/baseline.sha256)
# ALG-310: la guarda polar se deriva de ray_distance_km y se vuelca en la cabecera.
add_test(NAME guarda_polar_en_cabecera COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/comprobar_parametros.sh
    $<TARGET_FILE:FAST-IBAN> ${CASO_FIJO} ${CMAKE_CURRENT_BINARY_DIR}/params_rayos_400.yaml "polar_guard_deg: 86.403"
    ${CMAKE_CURRENT_SOURCE_DIR}/regression/baseline.sha256)
