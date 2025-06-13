import os
import netCDF4 as nc
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patheffects as path_effects
from mpl_toolkits.mplot3d import Axes3D
import cartopy.crs as ccrs 
import cartopy as cartopy
import numpy as np
import numpy.ma as ma
import xarray as xr
import pandas as pd
import sys
from collections import namedtuple
from datetime import datetime, timedelta
from scipy.spatial import ConvexHull
import threading
from multiprocessing import Manager, Pool
from functools import lru_cache

# Thread-local storage for NetCDF file access
thread_local = threading.local()

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from utils.enums.DataType import DataType
from utils.minio.upload_files import upload_files_to_request_hash
from utils.consts.consts import VARIABLE_NAMES, STATUS_OK


g_0 = 9.80665 # m/s^2
dist = 1000 # km
lat_km = 111.32 # km/deg
R = 6371 # km
k_factor = 273.15 # K

OUT_DIR = "./out" # Directory to save the generated maps

# Add LRU cache to avoid repeated file access
@lru_cache(maxsize=16)
def get_dataset(file_name: str):
    """Get a cached xarray dataset to avoid repeated file opens.
    
    Args:
        file_name (str): Path to NetCDF file
        
    Returns:
        xarray.Dataset: Opened dataset
    """
    return xr.open_dataset(file_name)


def date_from_nc(nc_file: str) -> np.ndarray:
    """Extract dates from a NetCDF file.

    Args:
        nc_file (str): Path to the NetCDF file.

    Returns:
        np.ndarray: Array of date values.
    """
    # Use cached dataset
    ds = get_dataset(nc_file)
    
    # Extract and return the dates
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


def obtain_csv_files(file_path: str, file_type: str) -> str:
    """Obtiene el nombre del archivo CSV correspondiente al tipo de archivo solicitado.

    Args:
        file_path (str): Carpeta donde buscar los archivos.
        file_type (str): Tipo de archivo solicitado (e.g., "selected", "all").

    Returns:
        str: Ruta completa del archivo CSV correspondiente.

    Raises:
        FileNotFoundError: Si no se encuentra un archivo que coincida con el tipo.
    """
    # Ruta completa a la carpeta donde buscar
    search_path = os.path.join(OUT_DIR, file_path)

    if not os.path.isdir(search_path):
        raise FileNotFoundError(f"El directorio no existe: {search_path}")

    # Buscar archivos .csv
    for filename in os.listdir(search_path):
        if filename.endswith(".csv") and file_type in filename:
            base_name = os.path.splitext(filename)[0]
            return os.path.join(search_path, f"{base_name}.csv")

    raise FileNotFoundError(f"No se encontró un archivo CSV con tipo '{file_type}' en {search_path}")


class MapGenerator:
    def __init__(self, file_name, request_hash, variable_name, pressure_level, year, month, day, hour, map_type, map_level, file_format, area_covered):
        self.file_name = file_name
        self.request_hash = request_hash
        self.variable_name = variable_name
        self.pressure_level = pressure_level
        self.year = year
        self.month = month
        self.day = day
        self.hour = hour
        self.map_type = map_type
        self.map_level = map_level
        self.file_format = file_format
        self.area_covered = area_covered # N W S E
        
        # Create output directory if it doesn't exist
        os.makedirs(f"{OUT_DIR}/{self.request_hash}", exist_ok=True)
        
        self.init_generation()
        
    def init_generation(self):
        # print(f"Generando mapa para el año {self.year}, mes {self.month}, día {self.day}, hora {self.hour}, tipo de mapa {self.map_type}, nivel {self.map_level}...")
        if self.map_type == DataType.TYPE_CONT.value:
            self.generate_contour_map()
        elif self.map_type == DataType.TYPE_DISP.value:
            self.generate_scatter_map()
            pass
        elif self.map_type == DataType.TYPE_COMB.value:
            # self.generate_combined_map()
            pass
        elif self.map_type == DataType.TYPE_FORMS.value:
            # self.generate_formations_map()
            pass
        elif self.map_type == DataType.TYPE_3D.value:
            self.generate_3d_surface_map()
            pass
        else:
            print("Error en el tipo de archivo")

    def generate_contour_map(self):
        print("Generando mapa de contornos...")
        variable_type = None
        
        for key, value in VARIABLE_NAMES.items():
            if self.variable_name.lower() == key.lower():
                variable_type = value
                
        print(f"Variable: {self.variable_name} -> {variable_type}")
        
        if variable_type is None:
            print("Error: variable no válida")
            return

        print(f"File name: {self.file_name}")
        
        try:
            # Use xarray for more robust file handling
            ds = get_dataset(self.file_name)
            dates_nc = date_from_nc(self.file_name)
            corrected_dates = [from_nc_to_date(str(date)) for date in dates_nc]
            actual_date = from_elements_to_date(self.year, self.month, self.day, self.hour)
            
            #from corrected_dates, obtain the index of the date that is equal to actual_date
            if actual_date not in corrected_dates:
                print(f"Error: la fecha {actual_date} no se encuentra en el archivo netCDF")
                return
            
            time_index = corrected_dates.index(actual_date)
            
            # Extract coordinates and data using xarray for better performance
            lat = ds.latitude.values
            lon = ds.longitude.values
            variable = ds[variable_type].values[time_index]
            
            # Ensure dataset is closed properly
            ds.close()
            
            #Adjust variable
            if variable_type == 'z':
                # Convert geopotential height to meters
                print("Converting geopotential height to meters...")
                variable = variable / g_0
            elif variable_type == 't':
                # Convert temperature from Kelvin to Celsius
                print("Converting temperature from Kelvin to Celsius...")
                variable = variable - k_factor
            
            # Ajustar valores mayores a 180 restando 360
            if np.max(lon) > 180:
                lon, variable = self.adjust_lon(lon, variable)
            
            # Adapt lat,lon and variable to the selected area
            lat_max, lon_min, lat_min, lon_max = self.area_covered
            
            lat_idx = np.nonzero((lat >= lat_min) & (lat <= lat_max))[0]
            lon_idx = np.nonzero((lon >= lon_min) & (lon <= lon_max))[0]
            
            if len(lat_idx) == 0 or len(lon_idx) == 0:
                print("Error: No data points within the specified area")
                return
            
            lat = lat[lat_idx]
            lon = lon[lon_idx]
            variable = variable[..., lat_idx[:, None], lon_idx]  # broadcasting over lat/lon
            
            # Mask invalid values
            variable = ma.masked_invalid(variable)

            # Generate the figure
            fig, ax = self.config_map()
            
            # Calculate contour levels
            vmin = np.nanmin(variable) 
            vmax = np.nanmax(variable)
            step = self.map_level
            
            if not np.isfinite(vmin) or not np.isfinite(vmax):
                print("Error: Invalid data range (NaN or Inf values)")
                return
            
            # print(f"Var max: {variable.max()}, Var min: {variable.min()}")
            
            # print(f"Variable range: {vmin} to {vmax}, step: {step}")
            
            # print(f"Latitudes: {lat_min} to {lat_max}, Longitudes: {lon_min} to {lon_max}")
            
            # print(f"Variable shape: {variable.shape}, Lat shape: {lat.shape}, Lon shape: {lon.shape}")
                
            # Ensure we have a valid range for contours
            cont_levels = np.arange(np.ceil(vmin/10)*10, vmax, step)
            if len(cont_levels) < 2:
                # Fallback if range is too small
                cont_levels = np.linspace(vmin, vmax, 5)
                
            # print(f"Contour levels: {cont_levels}")
            
            co = ax.contour(lon, lat, variable, levels=cont_levels, cmap='jet', 
                        transform=ccrs.PlateCarree(), linewidths=1)
            
            # print("Contours co.levels:", co.levels)
            
            plt.clabel(co, inline=True, fontsize=8)
            
            #visual_adds
            self.visual_adds(fig, ax, co, self.map_type, variable_type, "v", actual_date)
            
            print("Map generated. Saving map...")
            # Save the figure and close it to prevent resource leaks
            self.save_map(actual_date)
            
        except Exception as e:
            print(f"Error in generate_contour_map: {str(e)}")
            # Clean up any open figures
            plt.close('all')
            raise

        return True
     
    def generate_scatter_map(self):
        print("Generando mapa de dispersión...")
        variable_type = None
        
        for key, value in VARIABLE_NAMES.items():
            if self.variable_name.lower() == key.lower():
                variable_type = value
                
        print(f"Variable: {self.variable_name} -> {variable_type}")
        
        if variable_type is None:
            print("Error: variable no válida")
            return

        # print(f"File name: {self.file_name}")
        
        try:
            data = pd.read_csv(obtain_csv_files(self.request_hash, "selected"))
            dates_nc = date_from_nc(self.file_name)
            corrected_dates = [from_nc_to_date(str(date)) for date in dates_nc]
            actual_date = from_elements_to_date(self.year, self.month, self.day, self.hour)
            
            #from corrected_dates, obtain the index of the date that is equal to actual_date
            if actual_date not in corrected_dates:
                print(f"Error: la fecha {actual_date} no se encuentra en el archivo netCDF")
                return
            
            time_index = corrected_dates.index(actual_date)
            
            #Filtrar los datos para el índice de tiempo actual
            data = data[data['time'] == time_index]
             
            lat = data['latitude'].copy()
            lon = data['longitude'].copy()
            cluster = data['cluster'].copy()
            variable = data[variable_type].copy()
            
            # Ensure we have valid data in numpy arrays
            lat = lat.to_numpy()
            lon = lon.to_numpy()
            cluster = cluster.to_numpy()
            variable = variable.to_numpy()

            # Generate the figure
            fig, ax = self.config_map()
            
            sc = ax.scatter(
                lon,
                lat,
                c=variable,
                cmap='jet',
                s=8,
                transform=ccrs.PlateCarree(),
                linewidths=0.3,
                edgecolors='black'
            )

            for i, txt in enumerate(cluster):
                # Add text labels to the scatter points
                ax.annotate(txt, (lon[i], lat[i]), fontsize=1, color='white')
                
            #visual_adds
            self.visual_adds(fig, ax, sc, self.map_type, variable_type, "v", actual_date)
            
            print("Map generated. Saving map...")
            # Save the figure and close it to prevent resource leaks
            self.save_map(actual_date)
            
        except Exception as e:
            print(f"Error in generate_contour_map: {str(e)}")
            # Clean up any open figures
            plt.close('all')
            raise

        return True
     
    def generate_3d_surface_map(self):
        print("Generando mapa de superficie 3D...")
        variable_type = None
        
        for key, value in VARIABLE_NAMES.items():
            if self.variable_name.lower() == key.lower():
                variable_type = value
                
        print(f"Variable: {self.variable_name} -> {variable_type}")
        
        if variable_type is None:
            print("Error: variable no válida")
            return

        print(f"File name: {self.file_name}")
        
        try:
            ds = get_dataset(self.file_name)
            dates_nc = date_from_nc(self.file_name)
            corrected_dates = [from_nc_to_date(str(date)) for date in dates_nc]
            actual_date = from_elements_to_date(self.year, self.month, self.day, self.hour)
            
            if actual_date not in corrected_dates:
                print(f"Fecha {actual_date} no encontrada en el archivo NetCDF")
                return

            time_index = corrected_dates.index(actual_date)
            print(f"Time index for {actual_date}: {time_index}")

            lat = ds.latitude.values
            lon = ds.longitude.values
            variable = ds[variable_type].values[time_index]
            
            print(f"Variable shape before adjustment: {variable.shape}, Lat shape: {lat.shape}, Lon shape: {lon.shape}")

            ds.close()
            
            #Adjust variable
            if variable_type == 'z':
                # Convert geopotential height to meters
                print("Converting geopotential height to meters...")
                variable = variable / g_0
            elif variable_type == 't':
                # Convert temperature from Kelvin to Celsius
                print("Converting temperature from Kelvin to Celsius...")
                variable = variable - k_factor
                
            print(f"Variable shape: {variable.shape}, Lat shape: {lat.shape}, Lon shape: {lon.shape}")
            
            if np.max(lon) > 180:
                lon, variable = self.adjust_lon(lon, variable)

            lat_max, lon_min, lat_min, lon_max = self.area_covered
            lat_idx = np.nonzero((lat >= lat_min) & (lat <= lat_max))[0]
            lon_idx = np.nonzero((lon >= lon_min) & (lon <= lon_max))[0]

            lat = lat[lat_idx]
            lon = lon[lon_idx]
            variable = variable[..., lat_idx[:, None], lon_idx]

            lon_grid, lat_grid = np.meshgrid(lon, lat)
            
            print(f"Lon grid shape: {lon_grid.shape}, Lat grid shape: {lat_grid.shape}, Variable shape: {variable.shape}")

            fig = plt.figure(figsize=(10, 6), dpi=200)
            ax = fig.add_subplot(111, projection='3d')

            # Plot 3D surface
            surf = ax.plot_surface(lon_grid, lat_grid, variable[0], cmap='viridis', linewidth=0, antialiased=False)

            ax.set_xlabel('Longitude')
            ax.set_ylabel('Latitude')
            ax.set_zlabel(self.variable_name)
            ax.set_title(f"{self.variable_name} on {actual_date}")

            fig.colorbar(surf, ax=ax, shrink=0.5, aspect=5)

            output_path = f"{OUT_DIR}/{self.request_hash}/{self.variable_name}_3D_{actual_date}.{self.file_format}"
            plt.savefig(output_path)
            plt.close()

            print(f"Mapa 3D guardado en {output_path}")
        except Exception as e:
            print(f"Error in generate_3d_map: {str(e)}")
            # Clean up any open figures
            plt.close('all')
            raise
        
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
                plt.title(f'{map_type} - Geopotential height at {self.pressure_level}hPa - {date}', loc='center')
            elif var_type == 't':
                plt.title(f'{map_type} - Temperature at {self.pressure_level}hPa - {date}', loc='center')
        else:
            plt.title(f'Variable at {self.pressure_level}hPa - {date}', loc='center')
        
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
        
        try:
            # Save the figure and close it to prevent resource leaks
            plt.savefig(file_saved, bbox_inches='tight', dpi=250, format=self.file_format)
            upload_files_to_request_hash(self.request_hash, OUT_DIR+"/"+self.request_hash)
        except Exception as e:
            print(f"Error saving figure: {str(e)}")
        finally:
            plt.close('all')  # Close all figures to ensure proper cleanup
            
        print(f"Image saved in: {file_saved}") 

# Function for parallel processing
def generate_map_parallel(args):
    """Process map generation in parallel."""
    try:
        (file_name, request_hash, variable_name, pressure_level, 
         year, month, day, hour, map_type, map_level, 
         file_format, area_covered) = args
        
        # Create directory if it doesn't exist
        os.makedirs(f"{OUT_DIR}/{request_hash}", exist_ok=True)
        
        MapGenerator(
            file_name, request_hash, variable_name, float(pressure_level),
            year, month, day, hour, map_type, int(map_level),
            file_format, [float(area) for area in area_covered]
        )
        return True
    except Exception as e:
        print(f"Error in generate_map_parallel: {str(e)}")
        return False
