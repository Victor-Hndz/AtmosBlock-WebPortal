import os
import netCDF4 as nc
import matplotlib.pyplot as plt
import matplotlib.patheffects as path_effects
import cartopy.crs as ccrs 
import cartopy as cartopy 
import numpy as np
import xarray as xr
import pandas as pd
import sys
from collections import namedtuple
from datetime import datetime, timedelta
from scipy.spatial import ConvexHull


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from utils.enums.DataType import DataType
from utils.minio.upload_files import upload_files_to_request_hash
from utils.clean_folder_files import clean_directory
from utils.consts.consts import VARIABLE_NAMES, STATUS_OK


g_0 = 9.80665 # m/s^2
dist = 1000 # km
lat_km = 111.32 # km/deg
R = 6371 # km

OUT_DIR = "./out" # Directory to save the generated maps


def date_from_nc(nc_file: str) -> str:
    """Extrae la fecha de un archivo netCDF.

    Args:
        nc_file (str): Ruta del archivo netCDF.

    Returns:
        str: Cadena con la fecha extraída.
    """
    # Abrir el archivo netCDF y cargar los datos
    ds = xr.open_dataset(nc_file)

    # Extraer las fechas del conjunto de datos
    return ds.time.values

def from_nc_to_date(date: str) -> str:
    """Extrae la fecha exacta de una cadena con la fecha de un archivo netCDF.

    Args:
        date (str): Cadena con la fecha del archivo netCDF.

    Returns:
        str: Cadena con la fecha exacta extraída.
    """
    date = date[:-4]
    fecha_datetime = datetime.strptime(date, "%Y-%m-%dT%H:%M:%S.%f")
    
   # Obtener el día inicial
    day_start = fecha_datetime.day
    
    # Obtener el último día del mes
    next_month = (fecha_datetime.replace(day=28) + timedelta(days=4)).replace(day=1)
    day_end = (next_month - timedelta(days=1)).day
    
    # if day_start == day_end:
    #     return fecha_datetime.strftime("%Y-%m-%d_%HUTC")
    # else:
    #     return fecha_datetime.strftime(f"%Y-%m-({day_start}-{day_end})_%HUTC")
    return fecha_datetime.strftime("%Y-%m-%d_%HUTC")

def from_elements_to_date(year: str, month: str, day: str, hour: str) -> str:
    """Convierte los elementos de fecha y hora en una cadena de fecha.

    Args:
        year (str): Año.
        month (str): Mes.
        day (str): Día.
        hour (str): Hora.

    Returns:
        str: Cadena con la fecha formateada.
    """
    #format: YYYY-MM-DD_HHUTC 
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}_{int(hour):02d}UTC"

class MapGenerator:
    def __init__(self, file_name, request_hash, variable_name, pressure_level, year, month, day, hour, map_type, map_range, map_level, file_format, area_covered):
        self.file_name = file_name
        self.request_hash = request_hash
        self.variable_name = variable_name
        self.pressure_level = pressure_level
        self.year = year
        self.month = month
        self.day = day
        self.hour = hour
        self.map_type = map_type
        self.map_range = map_range
        self.map_level = map_level
        self.file_format = file_format
        self.area_covered = area_covered # N W S E
        
        self.init_generation()
        
    def init_generation(self):
        # print(f"Generando mapa para el año {self.year}, mes {self.month}, día {self.day}, hora {self.hour}, tipo de mapa {self.map_type}, rango {self.map_range}, nivel {self.map_level}...")
        if self.map_type == DataType.TYPE_CONT.value:
            self.generate_contour_map()
        elif self.map_type == DataType.TYPE_DISP.value:
            # self.generate_scatter_map()
            pass
        elif self.map_type == DataType.TYPE_COMB.value:
            # self.generate_combined_map()
            pass
        elif self.map_type == DataType.TYPE_FORMS.value:
            # self.generate_formations_map()
            pass
        else:
            print("Error en el tipo de archivo")

    def generate_contour_map(self):
        print("Generando mapa de contornos...")
        variable_type = None
        
        for key, value in VARIABLE_NAMES.items():
            if self.variable_name.lower() == key.lower():
                variable_type = value
                
        # print(f"Variable: {self.variable_name} -> {variable_type}")
        
        if variable_type is None:
            print("Error: variable no válida")
            return
        
        nc_file = nc.Dataset(self.file_name, 'r')
        dates_nc = date_from_nc(self.file_name)
        corrected_dates = [from_nc_to_date(str(date)) for date in dates_nc]
        actual_date = from_elements_to_date(self.year, self.month, self.day, self.hour)
        
        #from corrected_dates, obtain the index of the date that is equal to actual_date
        if actual_date not in corrected_dates:
            print(f"Error: la fecha {actual_date} no se encuentra en el archivo netCDF")
            return
        
        time_index = corrected_dates.index(actual_date)
        
        lat = nc_file.variables['latitude'][:]
        lon = nc_file.variables['longitude'][:]
        variable = nc_file.variables[variable_type][:]
        nc_file.close()
        
        variable = variable[time_index]
        
        # Ajustar valores mayores a 180 restando 360
        if max(lon) > 180:
            lon, variable = self.adjust_lon(lon, variable)
        
        
        #Adapt lat,lon and variable to the selected area. The area_covered is a list of 4 values: [lat_max, lon_min, lat_min, lon_max]
        lat_max, lon_min, lat_min, lon_max = self.area_covered

        # print(f"Area covered: {self.area_covered}")
        # print(f"Latitudes max: {lat_max}, min: {lat_min}")
        # print(f"Longitudes max: {lon_max}, min: {lon_min}")
        
        lat_idx = np.nonzero((lat >= lat_min) & (lat <= lat_max))[0]
        lon_idx = np.nonzero((lon >= lon_min) & (lon <= lon_max))[0]

        lat = lat[lat_idx]
        lon = lon[lon_idx]
        variable = variable[..., lat_idx[:, None], lon_idx]  # broadcasting sobre lat/lon


        # print("Max value latitudes: ", lat.max())
        # print("Min value latitudes: ", lat.min())
        # print("Max value longitudes: ", lon.max())
        # print("Min value longitudes: ", lon.min())
        
        fig, ax = self.config_map()
        
        cont_levels = np.arange(np.ceil(np.min(variable)/10)*10, np.max(variable), self.map_level)

        co = ax.contour(lon, lat, variable, levels=cont_levels, cmap='jet', 
                    transform=ccrs.PlateCarree(), linewidths=2.5)
        
        plt.clabel(co, inline=True, fontsize=8)
        
        #visual_adds
        self.visual_adds(fig, ax, co, self.map_type, variable_type, "v", actual_date)
        
        # plt.show()
        
        print("Map generated. Saving map...")
        self.save_map(actual_date)

        return True
        
    def adjust_lon(self, lon, z):
        """Convierte las longitudes de 0-360 a -180-180 y ajusta z para que coincida.

        Args:
            lon (_type_): Longitudes a ajustar.
            z (_type_): z a ajustar.

        Returns:
            tuple (lon, z): Tupla con lon y z ajustados.
        """
        lon = [lon_i - 360 if lon_i >= 180 else lon_i for lon_i in lon]

        # Convertir lon de 0 a 360 a -180 a 180
        midpoint = len(lon) // 2
        lon[:midpoint], lon[midpoint:] = lon[midpoint:], lon[:midpoint]

        # Convertir z de 0 a 360 a -180 a 180
        z = np.roll(z, shift=midpoint, axis=-1)
        
        #Hacer lon un array de numpy
        lon = np.array(lon)
        
        return lon, z
    
    def config_map(self):
        """Configura un mapa con los rangos de latitud y longitud especificados.
        Crea una figura y un eje para el mapa del mundo, establece límites manuales para cubrir todo el mundo y agrega detalles geográficos al mapa.

        Returns:
            tuple (fig, ax): Tupla con la figura y el eje del mapa.
        """
        lat_max, lon_min, lat_min, lon_max = self.area_covered
        
        # Crear una figura para un mapa del mundo
        fig, ax = plt.subplots(figsize=(11, 5), dpi=250, subplot_kw=dict(projection=ccrs.PlateCarree()))
        ax.set_global()

        # Establecer límites manuales para cubrir todo el mundo
        ax.set_xlim(lon_min, lon_max)
        ax.set_ylim(lat_min, lat_max)

        # Agregar detalles geográficos al mapa
        ax.coastlines()
        ax.add_feature(cartopy.feature.BORDERS, linestyle=':')
        
        return fig, ax

    def visual_adds(self, fig, ax, map_content, map_type, var_type, orientation, date):
        lat_max, lon_min, lat_min, lon_max = self.area_covered
        
        # Añade títulos y etiquetas
        if(map_type != None):
            if var_type == 'z':
                plt.title(f'{map_type} - Geopotential height at {self.pressure_level} - {date}', loc='center')
            elif var_type == 't':
                plt.title(f'{map_type} - Temperature at {self.pressure_level} - {date}', loc='center')
        else:
            plt.title(f'Variable at {self.pressure_level} - {date}', loc='center')
        
        # plt.xlabel('Longitude (deg)')
        # plt.ylabel('Latitude (deg)')

        if(map_content != None):
            if(orientation == "v"):
                cax = fig.add_axes([ax.get_position().x1+0.01,
                            ax.get_position().y0,
                            0.02,
                            ax.get_position().height])
                cbar = plt.colorbar(map_content, cax=cax, orientation='vertical')
            elif(orientation == "h"):
                cax = fig.add_axes([(ax.get_position().x1 + ax.get_position().x0)/2 - (ax.get_position().width * 0.4)/2,
                        ax.get_position().y0 - 0.12,
                        ax.get_position().width * 0.4,
                        0.02])
                cbar = plt.colorbar(map_content, cax=cax, orientation='horizontal')
            
            if var_type == 'z':
                cbar.set_label('Geopotential height (m)', fontsize=10)
            elif var_type == 't':
                cbar.set_label('Temperature (ºC)', fontsize=10)
            
            cbar.ax.tick_params(labelsize=10)

        yticks = np.arange(np.floor(lat_min / 10) * 10, np.ceil(lat_max / 10) * 10 + 1, 10)
        xticks = np.arange(np.floor(lon_min / 20) * 20, np.ceil(lon_max / 20) * 20 + 1, 20)

        ax.set_yticks(yticks, crs=ccrs.PlateCarree())
        ax.set_yticklabels([f'{deg:.0f}°' for deg in yticks])

        ax.set_xticks(xticks, crs=ccrs.PlateCarree())
        ax.set_xticklabels([f'{deg:.0f}°' for deg in xticks])
    
    def save_map(self, date):
        
        base_name = f"{OUT_DIR}/{self.request_hash}/map_{self.variable_name}_{self.map_type}_{self.map_level}l_{date}"
        extension = f".{self.file_format}"

        cont = 0 
        
        # Generate a unique file name
        while True: 
            if cont == 0: 
                file_saved = f"{base_name}{extension}" 
            else: 
                file_saved = f"{base_name}({cont}){extension}" 
            if not os.path.exists(file_saved): 
                break 
            cont += 1 
        
        plt.savefig(file_saved) 
        upload_files_to_request_hash(self.request_hash, OUT_DIR+"/"+self.request_hash)
        clean_directory(OUT_DIR+"/"+self.request_hash)
        
        print(f"Image saved in: {file_saved}") 
    

# def generate_contour_map(file, es_max, time, levels, lat_range, lon_range, file_format):
#     # var_type = 't'
#     var_type = 'z'
    
#     #Extraer la fecha del archivo
#     dates = date_from_nc(file)
#     fecha = from_nc_to_date(str(dates[time]))
#     # print(fecha)

#     # Obtener los datos de tiempo, latitud, longitud y la variable z
#     archivo_nc = nc.Dataset(file, 'r')
#     lat = archivo_nc.variables['latitude'][:]
#     lon = archivo_nc.variables['longitude'][:]
#     z = archivo_nc.variables[var_type][:]
#     archivo_nc.close()

#     #Ajustar z al instante de t que queremos y usar las unidades correctas
#     z = z[time]
#     if var_type == 'z':
#         z = z / g_0
#     elif var_type == 't':
#         z = z - 273.15
    
#     # Ajustar valores mayores a 180 restando 360
#     if max(lon) > 180:
#         lon, z = adjust_lon(lon, z)
    
#     #filtrar los valores para que z, la latitud y la longitud se encuentren en el rango correcto
#     lat, lon, z = filt_data(lat, lon, z, lat_range, lon_range)
    
#     #configurar el mapa
#     fig, ax = config_map(lat_range, lon_range)
    
#      #Valor entre los contornos
#     cont_levels = np.arange(np.ceil(np.min(z)/10)*10, np.max(z), levels)
    
#     # Plotea los contornos en el mapa
#     co = ax.contour(lon, lat, z, levels=cont_levels, cmap='jet', 
#                     transform=ccrs.PlateCarree(), linewidths=2.5)
    
#     #valores de contorno
#     plt.clabel(co, inline=True, fontsize=8)

#     # Añade títulos, colorbar y etiquetas
#     visual_adds(fig, ax, co, fecha, lat_range, lon_range, levels, tipo="Contours")

#     # Muestra la figura
#     # plt.show()

#     print("Mapa generado. Guardando mapa...")

#     # Definir el nombre base del archivo y la extensión 
#     if var_type == 'z':
#         name_var = 'geopotencial'
#     elif var_type == 't':
#         name_var = 'temperatura'
        
#     nombre_base = f"out/mapa_{name_var}_contornos_{levels}l_{fecha}"
#     extension = f".{file_format}" 
    
#     # Guardar la figura en la ubicación especificada
#     save_file(nombre_base, extension)
    
#     plt.close()
    

# def generate_scatter_map(file, es_max, time, levels, lat_range, lon_range, file_format):
#     #Extraer la fecha del archivo
#     dates = date_from_nc(file)
#     fecha = from_nc_to_date(str(dates[time]))
#     data = pd.read_csv(files_dir+obtain_csv_files(file, "selected"))
    
#     #Decide si es max o min
#     if(es_max == 'comb'):
#         tipo = 'max-min'
#     elif(es_max == 'max'):
#         tipo = 'max'
#         data = data[data['type'] == tipo.upper()]
#     elif(es_max == 'min'):
#         tipo = 'min'
#         data = data[data['type'] == tipo.upper()]
#     elif(es_max == 'both'):
#         tipo = 'min'
#         data = data[data['type'] == tipo.upper()]
#         generate_combined_map(file, "max", time, levels, lat_range, lon_range, file_format)
#     else:
#         print("Error en el tipo de archivo")
        
#     # Calcular el tamaño acumulado de los datos de tiempos anteriores
#     last_size = 0
#     if time > 0:
#         for t in range(time):
#             last_size += len(data[data['time'] == t])
    
#     # obtener solo los datos del tiempo seleccionado
#     data = data[data['time'] == time]
#     latitudes = data['latitude'].copy()
#     longitudes = data['longitude'].copy()
#     variable = data['z'].copy()
#     cluster = data['cluster'].copy()
    
#     # Ajustar valores mayores a 180 restando 360
#     if max(longitudes) > 180:
#         longitudes, variable = adjust_lon(longitudes, variable)
        
#     #filtrar los valores para que z, la latitud y la longitud se encuentren en el rango correcto
#     latitudes, longitudes, variable = filt_data(latitudes, longitudes, variable, lat_range, lon_range)

#     # Crear una figura para un mapa del mundo
#     fig, ax = config_map(lat_range, lon_range)

#     # Agregar puntos de dispersión
#     sc = ax.scatter(longitudes, latitudes, c=variable, cmap='jet', 
#                     transform=ccrs.PlateCarree(), s=8, edgecolors='black', linewidths=0.3)

#     for i, txt in enumerate(cluster):
#         ax.annotate(txt, (longitudes[i+last_size], latitudes[i+last_size]), fontsize=1, color='white')

    
#     #Añade títulos, etiquetas y colorbar
#     visual_adds(fig, ax, sc, fecha, lat_range, lon_range, None, tipo)
    
#     # Muestra la figura
#     # plt.show()

#     print("Mapa generado. Guardando mapa...")
    
#     # Definir el nombre base del archivo y la extensión 
#     nombre_base = f"out/mapa_geopotencial_puntos_{levels}l_{tipo}_{fecha}"
#     extension = f".{file_format}"

#     # Guardar la figura en la ubicación especificada
#     save_file(nombre_base, extension) 
    

# def generate_combined_map(file, es_max, time, levels, lat_range, lon_range, file_format):   
#     # var_type = 't'
#     var_type = 'z'
#     #Extraer la fecha del archivo
#     dates = date_from_nc(file)
#     fecha = from_nc_to_date(str(dates[time]))
#     data = pd.read_csv(files_dir+obtain_csv_files(file, "selected"))
    
#     #Decide si es max o min
#     if(es_max == 'comb'):
#         tipo = 'max-min'
#     elif(es_max == 'max'):
#         tipo = 'max'
#         data = data[data['type'] == tipo.upper()]
#     elif(es_max == 'min'):
#         tipo = 'min'
#         data = data[data['type'] == tipo.upper()]
#     elif(es_max == 'both'):
#         tipo = 'min'
#         data = data[data['type'] == tipo.upper()]
#         generate_combined_map(file, "max", time, levels, lat_range, lon_range, file_format)
#     else:
#         print("Error en el tipo de archivo")
        
#     # Calcular el tamaño acumulado de los datos de tiempos anteriores
#     last_size = 0
#     if time > 0:
#         for t in range(time):
#             last_size += len(data[data['time'] == t])
    
#     # obtener solo los datos del tiempo seleccionado
#     data = data[data['time'] == time]
#     latitudes = data['latitude'].copy()
#     longitudes = data['longitude'].copy()
#     variable = data[var_type].copy()
#     cluster = data['cluster'].copy()
    
#     # Abrir el archivo NetCDF
#     archivo_nc = nc.Dataset(file, 'r')
    
#     # Obtener los datos de tiempo, latitud, longitud y la variable z
#     lat = archivo_nc.variables['latitude'][:]
#     lon = archivo_nc.variables['longitude'][:]
#     z = archivo_nc.variables[var_type][:]
    
#     archivo_nc.close()
    
#     z = z[time]
#     if var_type == 'z':
#         z = z / g_0
#     elif var_type == 't':
#         z = z - 273.15
    
    
#     # Ajustar valores mayores a 180 restando 360
#     if max(lon) > 180:
#         lon, z = adjust_lon(lon, z)
        
#     if max(longitudes) > 180:
#         longitudes, variable = adjust_lon(longitudes, variable)
        
#     #filtrar los valores para que z, la latitud y la longitud se encuentren en el rango correcto
#     # latitudes, longitudes, variable = filt_data(latitudes, longitudes, variable, lat_range, lon_range)
#     lat, lon, z = filt_data(lat, lon, z, lat_range, lon_range)

    
#     #Valor entre los contornos
#     cont_levels = np.arange(np.ceil(np.min(z)/10)*10, np.max(z), levels)
    
#     #configurar el mapa
#     fig, ax = config_map(lat_range, lon_range)

#     # Agregar puntos de dispersión
#     sc = ax.scatter(longitudes, latitudes, c=variable, cmap='jet', 
#                     transform=ccrs.PlateCarree(), s=8, edgecolors='black', linewidths=0.3)

#     for i, txt in enumerate(cluster):
#         ax.annotate(txt, (longitudes[i+last_size], latitudes[i+last_size]), fontsize=1, color='white')
        

#     # Agregar contornos al mapa
#     co = ax.contour(lon, lat, z, levels=cont_levels, cmap='jet',
#                     transform=ccrs.PlateCarree(), linewidths=0.5, vmax=variable.max(), vmin=variable.min())
#     # valores de contorno
#     cont_txt = plt.clabel(co, inline=True, fontsize=4)
#     cont_txt = plt.setp(cont_txt, path_effects=[path_effects.Stroke(linewidth=0.5, foreground='white'), path_effects.Normal()])
    
#     tipo = "Combined"
    
#     # Añade títulos, colorbar y etiquetas
#     visual_adds(fig, ax, sc, fecha, lat_range, lon_range, levels, tipo)
    
    
#     # Muestra la figura
#     # plt.show()

#     print("Mapa generado. Guardando mapa...")

#     # Definir el nombre base del archivo y la extensión 
#     if var_type == 'z':
#         name_var = 'geopotencial'
#     elif var_type == 't':
#         name_var = 'temperatura'
        
#     nombre_base = f"out/mapa_{name_var}_contornos_puntos_{levels}l_{tipo}_{fecha}"
#     extension = f".{file_format}"
    
#     # Guardar la figura en la ubicación especificada
#     save_file(nombre_base, extension)
     
    
# def generate_combined_map_circle(file, es_max, time, lat_range, lon_range, file_format):    
#     #Extraer la fecha del archivo
#     dates = date_from_nc(file)
#     fecha = from_nc_to_date(str(dates[time]))
#     data = pd.read_csv(files_dir+obtain_csv_files(file, "selected"))
    
#     #Decide si es max o min
#     if(es_max == 'comb'):
#         tipo = 'max-min'
#     elif(es_max == 'max'):
#         tipo = 'max'
#         data = data[data['type'] == tipo.upper()]
#     elif(es_max == 'min'):
#         tipo = 'min'
#         data = data[data['type'] == tipo.upper()]
#     else:
#         tipo = 'max' if es_max else 'min'
#         data = data[data['type'] == tipo.upper()]
    
#     #obtener solo los datos del tiempo seleccionado
#     data = data[data['time'] == time]
#     latitudes = data['latitude'].copy()
#     longitudes = data['longitude'].copy()
#     variable = data['z'].copy()
    
#     # Abrir el archivo NetCDF
#     archivo_nc = nc.Dataset(file, 'r')
    
#     # Obtener los datos de tiempo, latitud, longitud y la variable z
#     lat = archivo_nc.variables['latitude'][:]
#     lon = archivo_nc.variables['longitude'][:]
#     z = archivo_nc.variables['z'][:]

#     archivo_nc.close()

#     z = z[time]
#     z = z / g_0
    
#     # Ajustar valores mayores a 180 restando 360
#     if max(lon) > 180:
#         lon, z = adjust_lon(lon, z)

#     if max(longitudes) > 180:
#         longitudes, variable = adjust_lon(longitudes, variable)
        
#     #filtrar los valores para que z, la latitud y la longitud se encuentren en el rango correcto
#     lat, lon, z = filt_data(lat, lon, z, lat_range, lon_range)
#     latitudes, longitudes, variable = filt_data(latitudes, longitudes, variable, lat_range, lon_range)
    
    
    
#     #configurar el mapa
#     fig, ax = config_map(lat_range, lon_range)
    
#     #agregar puntos de dispersión
#     sc = ax.scatter(longitudes, latitudes, c=variable, cmap='jet', 
#                     transform=ccrs.PlateCarree(), s=7)

    
#     # Agregar círculos alrededor de cada punto
#     for i in range(len(latitudes)):
#         # Convertir la distancia en kilómetros a grados de longitud (aproximado)
#         delta_lon = dist / (lat_km * np.cos(np.radians(latitudes[i])))
    
#         circle = plt.Circle((longitudes[i], latitudes[i]), radius=delta_lon, color='black', fill=False, linestyle='dashed', linewidth=0.5)
#         ax.add_patch(circle)
    
    
#     # Añade títulos, colorbar y etiquetas
#     visual_adds(fig, ax, sc, fecha, lat_range, lon_range, None, tipo)

#     # Muestra la figura
#     # plt.show()

#     print("Mapa generado. Guardando mapa...")

#     # Definir el nombre base del archivo y la extensión 
#     nombre_base = f"out/mapa_geopotencial_contornos_puntos_circles_{tipo}_{fecha}"
#     extension = f".{file_format}"
    
#     #Guardar la figura en la ubicación especificada
#     save_file(nombre_base, extension)


# def generate_formations_map(file, es_max, time, levels, lat_range, lon_range, file_format):
#     # Extraer la fecha del archivo
#     dates = date_from_nc(file)
#     fecha = from_nc_to_date(str(dates[time]))
#     data = pd.read_csv(files_dir + obtain_csv_files(file, "selected"))
#     data_form = pd.read_csv(files_dir + obtain_csv_files(file, "formations"))

#     # Obtener solo los datos del tiempo seleccionado
#     data = data[data['time'] == time]
#     latitudes = data['latitude'].copy()
#     longitudes = data['longitude'].copy()
#     variable = data['z'].copy()
#     tipo = data['type'].copy()
#     cluster = data['cluster'].copy()

#     data_form = data_form[data_form['time'] == time]
#     max_ids = data_form['max_id'].copy()
#     min1_ids = data_form['min1_id'].copy()
#     min2_ids = data_form['min2_id'].copy()
#     fom_types = data_form['type'].copy()

#     Puntos = namedtuple('Puntos', ['lat', 'lon', 'var', 'cluster', 'type'])
#     Formations = namedtuple('Formations', ['max', 'min1', 'min2', 'type'])

#     formaciones = []

#     for max_id, min_id1, min_id2, fom_type in zip(max_ids, min1_ids, min2_ids, fom_types):
#         puntos_max = [Puntos(lat, lon, var, clus, t) for lat, lon, var, clus, t in zip(latitudes, longitudes, variable, cluster, tipo) if clus == max_id]
#         puntos_min1 = [Puntos(lat, lon, var, clus, t) for lat, lon, var, clus, t in zip(latitudes, longitudes, variable, cluster, tipo) if clus == min_id1]
#         puntos_min2 = [Puntos(lat, lon, var, clus, t) for lat, lon, var, clus, t in zip(latitudes, longitudes, variable, cluster, tipo) if clus == min_id2] if fom_type == 'OMEGA' else None

#         formaciones.append(Formations(puntos_max, puntos_min1, puntos_min2, fom_type))

#     # Abrir el archivo NetCDF
#     archivo_nc = nc.Dataset(file, 'r')

#     # Obtener los datos de tiempo, latitud, longitud y la variable z
#     lat = archivo_nc.variables['latitude'][:]
#     lon = archivo_nc.variables['longitude'][:]
#     z = archivo_nc.variables['z'][:]

#     archivo_nc.close()

#     z = z[time]
#     z = z / g_0

#     # Ajustar valores mayores a 180 restando 360
#     if max(lon) > 180:
#         lon, z = adjust_lon(lon, z)

#     if max(longitudes) > 180:
#         longitudes, variable = adjust_lon(longitudes, variable)

#     # Filtrar los valores para que z, la latitud y la longitud se encuentren en el rango correcto
#     lat, lon, z = filt_data(lat, lon, z, lat_range, lon_range)

#     # Configurar el mapa
#     fig, ax = config_map(lat_range, lon_range)
    
#     co = None

#     # Agregar puntos de dispersión y anotaciones
#     for formacion in formaciones:
#         all_points = []
#         for puntos in [formacion.max, formacion.min1, formacion.min2]:
#             if puntos:
#                 latitud = [p.lat for p in puntos]
#                 longitud = [p.lon for p in puntos]
#                 ids = [p.cluster for p in puntos]
#                 tipo = [p.type for p in puntos]

#                 # Dibujar los puntos en el scatter plot
#                 for i, t in enumerate(tipo):
#                     color = 'red' if t == 'MAX' else 'blue'
#                     sc = ax.scatter(longitud, latitud, c=color, transform=ccrs.PlateCarree(), s=8, edgecolors='black', linewidths=0.3)

#                 all_points.extend(zip(latitud, longitud))

#                 # Encontrar la posición más arriba a la derecha
#                 max_lat_idx = np.argmax(latitud)
#                 max_lat = latitud[max_lat_idx]
#                 corresponding_lon = longitud[max_lat_idx]

#                 margin = 0.5  # Reducido el margen para la anotación en latitud

#                 # Anotar el ID del grupo en la posición media
#                 num = ax.annotate(ids[0], (corresponding_lon+margin, max_lat+margin), fontsize=6, ha='left', color='white', transform=ccrs.PlateCarree(), zorder=11)
#                 plt.setp(num, path_effects=[path_effects.Stroke(linewidth=1, foreground='black'), path_effects.Normal()])

#         if all_points:
#             longitudes_points = [point[1] for point in all_points]

#             if abs(min(longitudes_points) - max(longitudes_points)) >= 180:
#                 # Normalizar las longitudes al rango [0, 360)
#                 norm_points = [(lat, lon + 360 if lon < 0 else lon) for lat, lon in all_points]
                
#                 lats, lons = zip(*norm_points)
#                 min_lat, max_lat = min(lats), max(lats)
#                 min_lon, max_lon = min(lons), max(lons)
#                 padding = 0.3
#                 points = np.array(norm_points)
                    
#                 hull = ConvexHull(points)
#                 polygon_points = points[hull.vertices]
#                 centroid = np.mean(polygon_points, axis=0)
#                 polygon_points = polygon_points + padding * (polygon_points - centroid)
                
#                 # Trazar el polígono
#                 ax.plot(polygon_points[:, 1], polygon_points[:, 0], color='black', linewidth=0.75, transform=ccrs.PlateCarree(), zorder=10)
#                 ax.plot([polygon_points[0, 1], polygon_points[-1, 1]], [polygon_points[0, 0], polygon_points[-1, 0]], color='black', linewidth=0.75, transform=ccrs.PlateCarree(), zorder=10)
#             else:
#                 lats, lons = zip(*all_points)
#                 min_lat, max_lat = min(lats), max(lats)
#                 min_lon, max_lon = min(lons), max(lons)
#                 padding = 0.3
#                 points = np.array(all_points)
#                 hull = ConvexHull(points)
#                 polygon_points = points[hull.vertices]
#                 centroid = np.mean(polygon_points, axis=0)
#                 polygon_points = polygon_points + padding * (polygon_points - centroid)
                    
#                 # Trazar el polígono
#                 ax.plot(polygon_points[:, 1], polygon_points[:, 0], color='black', linewidth=0.75, transform=ccrs.PlateCarree(), zorder=10)
#                 ax.plot([polygon_points[0, 1], polygon_points[-1, 1]], [polygon_points[0, 0], polygon_points[-1, 0]], color='black', linewidth=0.75, transform=ccrs.PlateCarree(), zorder=10)

#             # Anotar el tipo de la formación en el mapa
#             mid_lat = (min_lat + max_lat) / 2
#             mid_lon = (min_lon + max_lon) / 2
            
#             if mid_lon >= 170:
#                 mid_lon = 170
#             if formacion.type == 'OMEGA':
#                 type_an = ax.annotate(formacion.type, (mid_lon, mid_lat - 8), fontsize=4, ha='center', color='white', transform=ccrs.PlateCarree(), zorder=13)
#                 plt.setp(type_an, path_effects=[path_effects.Stroke(linewidth=1, foreground='black'), path_effects.Normal()])
#             else:
#                 type_an = ax.annotate(formacion.type, (mid_lon, mid_lat), fontsize=4, ha='center', color='white', transform=ccrs.PlateCarree(), zorder=13)
#                 plt.setp(type_an, path_effects=[path_effects.Stroke(linewidth=1, foreground='black'), path_effects.Normal()])

#         # Obtener los valores de Z para los contornos específicos
#         # if formacion.type == 'OMEGA':
#         #     contour_min = min(p.var for p in formacion.min1 + formacion.min2)
#         # else:
#         #     contour_min = min(p.var for p in formacion.min1)
#         # contour_max = max(p.var for p in formacion.max)
#         # cont_levels = np.arange(np.ceil(contour_min/10)*10, contour_max, levels)
        
#     #Valor entre los contornos
#     cont_levels = np.arange(np.ceil(np.min(z)/10)*10, np.max(z), levels)
#     # Agregar contornos al mapa
#     co = ax.contour(lon, lat, z, levels=cont_levels, cmap='jet', transform=ccrs.PlateCarree(), linewidths=0.5, vmax=variable.max(), vmin=variable.min(), zorder=7)

#     # Valores de contorno
#     cont_txt = plt.clabel(co, inline=True, fontsize=4, zorder=8)
#     plt.setp(cont_txt, path_effects=[path_effects.Stroke(linewidth=0.5, foreground='white'), path_effects.Normal()])

#     # Añade títulos, colorbar y etiquetas
#     tipo = "Formations"
#     if co == None:
#         print("No se encontraron formaciones en el tiempo seleccionado")
#         return
#     visual_adds(fig, ax, co, fecha, lat_range, lon_range, levels, tipo)

#     # Muestra la figura
#     # plt.show()

#     print("Mapa generado. Guardando mapa...")

#     # Definir el nombre base del archivo y la extensión
#     nombre_base = f"out/mapa_geopotencial_contornos_puntos_formaciones_{levels}l_{fecha}"
#     extension = f".{file_format}"

#     # Guardar la figura en la ubicación especificada
#     save_file(nombre_base, extension)
    
#     #Close the plot
#     plt.close()
