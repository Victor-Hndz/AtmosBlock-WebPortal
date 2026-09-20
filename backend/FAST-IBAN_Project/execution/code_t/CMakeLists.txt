cmake_minimum_required(VERSION 3.8...3.27)

if(${CMAKE_VERSION} VERSION_LESS 3.12)
    cmake_policy(VERSION ${CMAKE_MAJOR_VERSION}.${CMAKE_MINOR_VERSION})
endif()

project(FAST-IBAN
    VERSION 2.0
    DESCRIPTION "Temperature" 
    LANGUAGES C)

# Especifica el estándar de C
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED True)

#Release
set(CMAKE_BUILD_TYPE Release)
set(CMAKE_C_FLAGS_RELEASE "${CMAKE_C_FLAGS_RELEASE} -O3")

# Avisos como errores (el CI lo activa), igual que en code/.
option(FAST_IBAN_WERROR "Compilar con -Wall -Wextra -Werror" OFF)
if(FAST_IBAN_WERROR)
    add_compile_options(-Wall -Wextra -Werror)
endif()


# ALG-352: la variante de temperatura usa el núcleo de code/ (lectura, rejilla, clusters y exportación). Lo único
# propio es la regla de selección, en FAST_IBAN_main.c. Necesita OpenMP porque el núcleo mide tiempos con omp_get_wtime.
find_package(OpenMP REQUIRED)
set(NUCLEO ${CMAKE_CURRENT_SOURCE_DIR}/../code)
add_library(LIB ${NUCLEO}/src/lib.c ${NUCLEO}/src/init.c ${NUCLEO}/src/utils.c ${NUCLEO}/src/calc.c ${NUCLEO}/src/yaml_plano.c)
target_compile_definitions(LIB PUBLIC FAST_IBAN_PARAMS_DEFECTO="${CMAKE_CURRENT_SOURCE_DIR}/config/params.yaml")
target_link_libraries(LIB PUBLIC m netcdf OpenMP::OpenMP_C)

add_executable(FAST-IBAN FAST_IBAN_main.c)
target_link_libraries(FAST-IBAN PRIVATE LIB)

# ALG-112: pruebas de la variante de temperatura (ctest --test-dir build). Las de clusters, expandCluster y
# resolución ya no se duplican aquí: son las mismas del núcleo y corren en code/ (ALG-352).
enable_testing()
add_test(NAME regresion_hash_t COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/tests/run_baseline.sh $<TARGET_FILE:FAST-IBAN>)
# ALG-302: la rejilla se recorre desde la primera fila del fichero hasta LAT_LIM_MIN, sin suponer 90°N.
set(CODE_TESTS ${CMAKE_CURRENT_SOURCE_DIR}/../code/tests)
add_executable(RECORTAR_NC_t ${CODE_TESTS}/recortar_nc.c)
target_link_libraries(RECORTAR_NC_t PRIVATE netcdf)
add_test(NAME preparar_caso_80N_t COMMAND RECORTAR_NC_t ${CODE_TESTS}/fixtures/temp_850hPa_2019-06-28_00-06-12-18UTC.nc ${CMAKE_CURRENT_BINARY_DIR}/caso_80N_t.nc t 80 1)
set_tests_properties(preparar_caso_80N_t PROPERTIES FIXTURES_SETUP recortes_t)
add_test(NAME latitudes_desde_80N_t COMMAND sh ${CODE_TESTS}/regression/comprobar_latitudes.sh $<TARGET_FILE:FAST-IBAN> ${CMAKE_CURRENT_BINARY_DIR}/caso_80N_t.nc 20 85 80)
set_tests_properties(latitudes_desde_80N_t PROPERTIES FIXTURES_REQUIRED recortes_t)


# target_include_directories(FAST-IBAN PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
# set_target_properties(FAST-IBAN PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../)

# ALG-305 (L4): parámetros en config/params.yaml. Con otro umbral, la cabecera lo muestra y la salida cambia.
set(PARAMS_T ${CMAKE_CURRENT_SOURCE_DIR}/config/params.yaml)
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${PARAMS_T})
file(READ ${PARAMS_T} PARAMS_TEXTO_T)
string(REPLACE "temperature_threshold_c: 28" "temperature_threshold_c: 30" PARAMS_UMBRAL_30 "${PARAMS_TEXTO_T}")
if(PARAMS_UMBRAL_30 STREQUAL PARAMS_TEXTO_T)
    message(FATAL_ERROR "No se encuentra 'temperature_threshold_c: 28' en ${PARAMS_T}")
endif()
file(WRITE ${CMAKE_CURRENT_BINARY_DIR}/params_umbral_30.yaml "${PARAMS_UMBRAL_30}")
add_test(NAME parametros_en_cabecera_y_en_uso_t COMMAND sh ${CODE_TESTS}/regression/comprobar_parametros.sh
    $<TARGET_FILE:FAST-IBAN> ${CODE_TESTS}/fixtures/temp_850hPa_2019-06-28_00-06-12-18UTC.nc
    ${CMAKE_CURRENT_BINARY_DIR}/params_umbral_30.yaml "temperature_threshold_c: 30" ${CMAKE_CURRENT_SOURCE_DIR}/tests/baseline_t.sha256)
