from utils.enums.DataType import DataType
from visualization.generate_maps import generate_maps as gm

DataType_map = {
    DataType.TYPE1 : gm.generate_combined_map,
    DataType.TYPE2 : gm.generate_scatter_map,
    DataType.TYPE3 : gm.generate_contour_map,
    DataType.TYPE4 : gm.generate_combined_map_circle,
    DataType.TYPE5 : gm.generate_formations_map
}
