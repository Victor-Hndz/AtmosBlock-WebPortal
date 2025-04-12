import subprocess
import sys
import os
import json

from concurrent.futures import ThreadPoolExecutor

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# from visualization.mapGeneration.generate_maps import generate_maps as gm

from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.consts.consts import STATUS_OK, STATUS_ERROR, MESSAGE_NO_COMPILE
from utils.enums.DataType import DataType


def handle_message(body):
    """Process the message received by the general handler, and launch the map generation."""
    raw_data = process_body(body)
    data = json.loads(raw_data)
    # data = body

    # the data comes like this:
    # data = {
    #     "file_name": self.file_name,
    #     "variable_name": self.variable_name,
    #     "pressure_level": self.pressure_level,
    #     "years": self.years,
    #     "months": self.months,
    #     "days": self.days,
    #     "hours": self.hours,
    #     "map_types": self.map_types,
    #     "map_ranges": self.map_ranges,
    #     "map_levels": self.map_levels,
    #     "file_format": self.file_format,
    #     "area_covered": self.area_covered,
    # }

    print("\n[ ] Iniciando generación de mapas...")

    def process_map_generation(year, month, day, hour, map_type, map_range, map_level):
        print(
            f"\n[ ] Generando mapa para el año {year}, mes {month}, día {day}, hora {hour}, tipo de mapa {map_type}, rango {map_range}, nivel {map_level}..."
        )
        # if map_type == DataType.TYPE_COMB:
        #     gm.generate_contour_map()
        # elif map_type == DataType.TYPE_DISP:
        #     gm.generate_scatter_map()
        # elif map_type == DataType.TYPE_COMB:
        #     gm.generate_combined_map()
        # elif map_type == DataType.TYPE_FORMS:
        #     gm.generate_formations_map()

    with ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(
                process_map_generation,
                year,
                month,
                day,
                hour,
                map_type,
                map_range,
                map_level,
            )
            for year in data["years"]
            for month in data["months"]
            for day in data["days"]
            for hour in data["hours"]
            for map_type in data["map_types"]
            for map_range in data["map_ranges"]
            for map_level in data["map_levels"]
        ]
        for future in futures:
            future.result()


if __name__ == "__main__":
    receive_messages(
        "execution_queue", "execution.visualization", callback=handle_message
    )
    # data = {
    #     "file_name": "test.nc",
    #     "variable_name": "geopotential",
    #     "pressure_level": 850,
    #     "years": [2020, 2021],
    #     "months": [1, 2],
    #     "days": [1, 2],
    #     "hours": [0, 6, 12, 18],
    #     "map_types": ["contour", "formations"],
    #     "map_ranges": ["max"],
    #     "map_levels": [20],
    #     "file_format": "svg",
    #     "area_covered": [90, -180, -90, 180],
    # }
    # handle_message(data)
