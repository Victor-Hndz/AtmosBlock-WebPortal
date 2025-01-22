import enum
from visualization.generate_maps import generate_maps as gm

# Definir enum para el tipo de datos
class DataType(enum.Enum):
    TYPE1 = "comb"
    TYPE2 = "disp"
    TYPE3 = "cont"
    TYPE4 = "comb_circ"
    TYPE5 = "forms"
    
# Definir enum para el tipo de datos
class DataRange(enum.Enum):
    RANGE1 = "max"
    RANGE2 = "min"
    RANGE3 = "both"
    RANGE4 = "comb"

# Definir enum para el formato
class DataFormat(enum.Enum):
    FORMAT1 = "png"
    FORMAT2 = "jpg"
    FORMAT3 = "jpeg"
    FORMAT4 = "svg"
    FORMAT5 = "pdf"

DataType_map = {
    DataType.TYPE1 : gm.generate_combined_map,
    DataType.TYPE2 : gm.generate_scatter_map,
    DataType.TYPE3 : gm.generate_contour_map,
    DataType.TYPE4 : gm.generate_combined_map_circle,
    DataType.TYPE5 : gm.generate_formations_map
}
