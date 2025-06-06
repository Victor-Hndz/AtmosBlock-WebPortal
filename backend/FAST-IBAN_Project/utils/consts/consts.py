ARGS_FILE = "./configurator/exec_args.yaml"
API_FOLDER = "/app/config/data"
EXEC_FILE = "./FAST-IBAN"

# Lista de argumentos permitidos
ARGUMENTS = [
    "requestHash",
    "variableName",
    "pressureLevels",
    "years",
    "months",
    "days",
    "hours",
    "areaCovered",
    "mapTypes",
    "mapLevels",
    "fileFormat",
    "noData",
    "noMaps",
    "omp",
    "mpi",
    "nThreads",
    "nProces",
]

VARIABLE_NAMES = {
    "geopotential": "z",
    "temperature": "t",
    "u-component_of_wind": "u",
}

STATUS_OK = "OK"
STATUS_ERROR = "ERROR"
MESSAGE_NO_DATA = "NO_DATA"
