# PROYECTO FAST-IBA<sup>3</sup>N (FAST - Identificación de Bloqueos Atmosféricos Automático en el Atlántico Norte)
Código del proyecto desarrollado en el Trabajo de Fin de Grado para la Universidad Miguel Hernández de Elche.

**Autor: Víctor Hernández Sánchez**

**Tutores: José Antonio García Orza y Héctor Francisco Migallon Gomis**

## Uso del programa
Se usa un archivo de entrada .nc

Genera una carpeta out (si no existe) y dentro mete todos los ficheros de salida .csv, -txt y, si se requiere, salida de mapas con el formato que se especifique.

En python visualizer, a partir de un fichero csv se ejecuta el script y genera una imagen que es un mapa representando los valores del csv. Se usa un fichero de configuración config.yaml

para usar únicamente el código en Cm se usa cmake:
- cd execution/code/
- mkdir build (si no hay build)
- cd build
- cmake -G "MinGW Makefiles" .. (Windows)
- cmake .. (linux)
- cmake --build .

Posteriormente, para lanzar tests, dentro de build:
- ctest
- ctest -V para más info

para añadir tests: 
- en la carpeta tests un .c con el test
- en el CMakeLists.c de la carpeta tests: 
    - añadir en add_executable al final el nombre del archivo .c
    - añadir al final un add_test con la misma forma que el que ya hay, en el NAME el nombre que quieras y lo otro lo dejas igual

para debug:
- descomentar en cmakelists: set(CMAKE_BUILD_TYPE Debug) y enable_testing()
- comentar la parte de release
- lanzar el CLI la ejecución con --debug o usar gdb si solo se quiere la parte de C.


Comando de ejemplo para uso del CLI: python configurator_CLI.py -d config/data/geopot_500hPa_2022-03-14_00-06-12-18UTC_HN.nc -t forms -r comb -l 20 -i 0 1 2 -la 25 85 -lo -180 180 -f svg

Otras opciones de ejecución con otros mapas de archivos .nc:

python configurator_CLI.py -d "config/data/geopot_500hPa_2003-08-(01-15)_00-06-12-18UTC.nc" -t comb -r comb -l 20 -i 8 -la 25 90 -lo -180 180 -f svg

python configurator_CLI.py -d "config/data/geopot_500hPa_2022-03-(12-16)_00-06-12-18UTC.nc" -t comb -r comb -l 20 -i 8 -la 25 90 -lo -180 180 -f svg

python configurator_CLI.py -d config/data/geopot_500hPa_2022-03-14_00-06-12-18UTC.nc -t comb -r comb -l 20 -i 0 -la 25 90 -lo -180 180 -f svg

python configurator_CLI.py -d config/data/geopot_500hPa_2019-06-26_00-06-12-18UTC.nc -t comb -r comb -l 20 -i 0 -la 25 90 -lo -180 180 -f svg
