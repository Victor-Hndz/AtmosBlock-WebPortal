ARGS_FILE = "./configurator/exec_args.yaml"
API_FOLDER = "/app/config/data"
EXEC_FILE = "./FAST-IBAN"

# Lista de argumentos permitidos
ARGUMENTS = [
    "variableName",
    "pressureLevels",
    "years",
    "months",
    "days",
    "hours",
    "areaCovered",
    "mapTypes",
    "mapRanges",
    "mapLevels",
    "fileFormat",
    "tracking",
    "noCompile",
    "noExecute",
    "noMaps",
    "animation",
    "omp",
    "mpi",
    "nThreads",
    "nProces",
]

STATUS_OK = "OK"
STATUS_ERROR = "ERROR"
MESSAGE_NO_COMPILE = "NO_COMPILE"
MESSAGE_NO_EXECUTE = "NO_EXECUTE"
