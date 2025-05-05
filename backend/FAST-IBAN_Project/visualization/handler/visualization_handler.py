import subprocess
import sys
import os
import json

from concurrent.futures import ThreadPoolExecutor

sys.path.append('/app/')

from visualization.mapGeneration.generate_maps import MapGenerator
from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.consts.consts import STATUS_OK, STATUS_ERROR


def handle_message(body):
    """Process the message received by the general handler, and launch the map generation."""
    raw_data = process_body(body)
    data = json.loads(raw_data)
    # data = body

    # the data comes like this:
    # data = {
    #     "file_name": self.file_name,
    #     "request_hash" = self.request_hash,
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
            # f"\n[ ] Generando mapa para el año {year}, mes {month}, día {day}, hora {hour}, tipo de mapa {map_type}, rango {map_range}, nivel {map_level}..."
        )
        MapGenerator(
            data["file_name"],
            data["request_hash"],
            data["variable_name"],
            data["pressure_level"],
            year,
            month,
            day,
            hour,
            map_type,
            map_range,
            map_level,
            data["file_format"],
            data["area_covered"])
            

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
                map_level
            )
            for year in data["years"]
            for month in data["months"]
            for day in data["days"]
            for hour in data["hours"]
            for map_type in data["map_types"]
            for map_range in data["map_ranges"]
            for map_level in data["map_levels"]
        ]
        try:
            for future in futures:
                future.result()
        except Exception as e:
            print(f"Error: {e}")
            message = {"exec_status": STATUS_ERROR, "exec_message": str(e)}
            send_message(
                create_message(
                    STATUS_OK,
                    "",
                    message,
                ),
                "notifications",
                "notify.handler",
            )
            return False
        
    print("\n✅ Generación de mapas completada exitosamente.")
    message = {"exec_status": STATUS_OK, "exec_message": "Map generation completed successfully."}
    send_message(
                create_message(
                    STATUS_OK,
                    "",
                    message,
                ),
                "notifications",
                "notify.handler",
            )     
    return True  


if __name__ == "__main__":
    receive_messages(
        "execution_queue", "execution.visualization", callback=handle_message
    )
    # data = {
    #     "file_name": "C:\\Users\\Victor\\Desktop\\repos\\tfm\\backend\\FAST-IBAN_Project\\config\\data\\geopot_500hPa_2022-03-14_00-06-12-18UTC.nc",
    #     "variable_name": "geopotential",
    #     "pressure_level": 500,
    #     "years": [2020],
    #     "months": [1],
    #     "days": [1],
    #     "hours": [0, 6, 12, 18],
    #     "map_types": ["cont"],
    #     "map_ranges": ["max"],
    #     "map_levels": [20],
    #     "file_format": "svg",
    #     "area_covered": [90, -180, -90, 180],
    # }
    # handle_message(data)
