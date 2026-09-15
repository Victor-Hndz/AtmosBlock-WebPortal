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


add_library(LIB lib/lib.c lib/lib.h)
add_executable(FAST-IBAN FAST_IBAN_main.c)


target_link_libraries(LIB PRIVATE m)
target_link_libraries(FAST-IBAN PRIVATE netcdf)

target_link_libraries(FAST-IBAN PRIVATE LIB)

# ALG-112: pruebas de la variante de temperatura (ctest --test-dir build)
enable_testing()
add_executable(TEST_expandcluster_t tests/test_expandcluster.c)
target_link_libraries(TEST_expandcluster_t PRIVATE LIB m netcdf)
add_test(NAME test_expandcluster_t COMMAND TEST_expandcluster_t)
add_executable(TEST_clusters_t tests/test_clusters.c)
target_link_libraries(TEST_clusters_t PRIVATE LIB m netcdf)
add_test(NAME test_clusters_t COMMAND TEST_clusters_t)
add_test(NAME regresion_hash_t COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/tests/run_baseline.sh $<TARGET_FILE:FAST-IBAN>)
# ALG-301 (L1): la resolución se lee del NetCDF; una rejilla con paso no uniforme se rechaza.
add_executable(TEST_resolucion_t tests/test_resolucion.c)
target_link_libraries(TEST_resolucion_t PRIVATE LIB m netcdf)
add_test(NAME test_resolucion_t COMMAND TEST_resolucion_t WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})
add_test(NAME init_rejilla_irregular_t COMMAND TEST_resolucion_t irregular WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})
set_tests_properties(init_rejilla_irregular_t PROPERTIES PASS_REGULAR_EXPRESSION "paso uniforme")


# target_include_directories(FAST-IBAN PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
# set_target_properties(FAST-IBAN PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../)