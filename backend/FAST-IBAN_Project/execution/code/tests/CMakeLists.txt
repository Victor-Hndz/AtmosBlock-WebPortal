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

# ALG-108: las formaciones no deben depender del orden de los clusters (caso donde B5 lo hacía visible)
add_test(NAME invariancia_orden COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_orden.sh $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_SOURCE_DIR}/fixtures/geopot_500hPa_2003-08-14-15_18-00UTC.nc)
set_tests_properties(invariancia_orden PROPERTIES TIMEOUT 900)

# Test de B4 (ALG-103): hash de la salida del caso de 2003, con varias OMEGA de mínimos a ambos lados.
# Detecta filtros asimétricos entre la rama izquierda y la derecha de search_formation.
add_test(NAME regresion_hash_2003 COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/regression/run_baseline.sh $<TARGET_FILE:FAST-IBAN>)
set_tests_properties(regresion_hash_2003 PROPERTIES TIMEOUT 900 ENVIRONMENT
    "CASO=${CMAKE_CURRENT_SOURCE_DIR}/fixtures/geopot_500hPa_2003-08-14-15_18-00UTC.nc;BASE=${CMAKE_CURRENT_SOURCE_DIR}/regression/baseline_2003.sha256")