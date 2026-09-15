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
add_test(NAME regresion_hash_t COMMAND sh ${CMAKE_CURRENT_SOURCE_DIR}/tests/run_baseline.sh $<TARGET_FILE:FAST-IBAN>)


# target_include_directories(FAST-IBAN PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
# set_target_properties(FAST-IBAN PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/../)