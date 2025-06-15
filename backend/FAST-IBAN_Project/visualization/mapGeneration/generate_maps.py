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
            self.generate_combined_map()
            pass
        elif self.map_type == DataType.TYPE_FORMS.value:
            self.generate_formations_map()
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
            print(f"Error in generate_scatter_map: {str(e)}")
            # Clean up any open figures
            plt.close('all')
            raise

        return True
     
    def generate_combined_map(self):
        print("Generando mapa combinado (disp + cont)...")
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
            cont_ds = get_dataset(self.file_name)
            disp_data = pd.read_csv(obtain_csv_files(self.request_hash, "selected"))
            
            dates_nc = date_from_nc(self.file_name)
            corrected_dates = [from_nc_to_date(str(date)) for date in dates_nc]
            actual_date = from_elements_to_date(self.year, self.month, self.day, self.hour)
            
            #from corrected_dates, obtain the index of the date that is equal to actual_date
            if actual_date not in corrected_dates:
                print(f"Error: la fecha {actual_date} no se encuentra en el archivo netCDF")
                return
            
            time_index = corrected_dates.index(actual_date)
            
            # Extract coordinates and data using xarray for better performance
            cont_lat = cont_ds.latitude.values
            cont_lon = cont_ds.longitude.values
            cont_variable = cont_ds[variable_type].values[time_index]
            
            # Ensure dataset is closed properly
            cont_ds.close()
            
            #Filtrar los datos para el índice de tiempo actual
            disp_data = disp_data[disp_data['time'] == time_index]
             
            disp_lat = disp_data['latitude'].copy()
            disp_lon = disp_data['longitude'].copy()
            disp_cluster = disp_data['cluster'].copy()
            disp_variable = disp_data[variable_type].copy()
            
            # Ensure we have valid data in numpy arrays
            disp_lat = disp_lat.to_numpy()
            disp_lon = disp_lon.to_numpy()
            disp_cluster = disp_cluster.to_numpy()
            disp_variable = disp_variable.to_numpy()
            
            #Adjust variable
            if variable_type == 'z':
                # Convert geopotential height to meters
                print("Converting geopotential height to meters...")
                cont_variable = cont_variable / g_0
            
            # Ajustar valores mayores a 180 restando 360
            if np.max(cont_lon) > 180:
                cont_lon, cont_variable = self.adjust_lon(cont_lon, cont_variable)
            
            # Adapt lat,lon and variable to the selected area
            lat_max, lon_min, lat_min, lon_max = self.area_covered
            
            lat_idx = np.nonzero((cont_lat >= lat_min) & (cont_lat <= lat_max))[0]
            lon_idx = np.nonzero((cont_lon >= lon_min) & (cont_lon <= lon_max))[0]
            
            if len(lat_idx) == 0 or len(lon_idx) == 0:
                print("Error: No data points within the specified area")
                return
            
            cont_lat = cont_lat[lat_idx]
            cont_lon = cont_lon[lon_idx]
            cont_variable = cont_variable[..., lat_idx[:, None], lon_idx]  # broadcasting over lat/lon
            
            # Mask invalid values
            cont_variable = ma.masked_invalid(cont_variable)
            
            # Calculate contour levels
            vmin = np.nanmin(cont_variable) 
            vmax = np.nanmax(cont_variable)
            step = self.map_level
            
            if not np.isfinite(vmin) or not np.isfinite(vmax):
                print("Error: Invalid data range (NaN or Inf values)")
                return
            
            # Ensure we have a valid range for contours
            cont_levels = np.arange(np.ceil(vmin/10)*10, vmax, step)
            if len(cont_levels) < 2:
                # Fallback if range is too small
                cont_levels = np.linspace(vmin, vmax, 5)
                
            # print(f"Contour levels: {cont_levels}")
            
            # Generate the figure
            fig, ax = self.config_map()
            
            co = ax.contour(cont_lon, cont_lat, cont_variable, levels=cont_levels, cmap='jet', 
                        transform=ccrs.PlateCarree(), linewidths=1)
            
            plt.clabel(co, inline=True, fontsize=8)
            
            # Then draw scatter plot so it appears on top
            sc = ax.scatter(
                disp_lon,
                disp_lat,
                c=disp_variable,
                cmap='jet',
                s=8,
                transform=ccrs.PlateCarree(),
                linewidths=0.3,
                edgecolors='black',
                zorder=10  # Higher zorder ensures points are drawn on top
            )
            
            # Enumerate cluster labels
            for i, txt in enumerate(disp_cluster):
                # Add text labels to the scatter points
                ax.annotate(txt, (disp_lon[i], disp_lat[i]), fontsize=1, color='white', zorder=11)
            
            
            #visual_adds
            self.visual_adds(fig, ax, sc, self.map_type, variable_type, "v", actual_date)
            
            print("Map generated. Saving map...")
            # Save the figure and close it to prevent resource leaks
            self.save_map(actual_date)
            
        except Exception as e:
            print(f"Error in generate_combined_map: {str(e)}")
            # Clean up any open figures
            plt.close('all')
            raise

        return True
     
    def generate_formations_map(self):
        print("Generando mapa de formaciones...")
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
            select_data = pd.read_csv(obtain_csv_files(self.request_hash, "selected"))
            forms_data = pd.read_csv(obtain_csv_files(self.request_hash, "formations"))
            dates_nc = date_from_nc(self.file_name)
            corrected_dates = [from_nc_to_date(str(date)) for date in dates_nc]
            actual_date = from_elements_to_date(self.year, self.month, self.day, self.hour)
            
            #from corrected_dates, obtain the index of the date that is equal to actual_date
            if actual_date not in corrected_dates:
                print(f"Error: la fecha {actual_date} no se encuentra en el archivo netCDF")
                return
            
            time_index = corrected_dates.index(actual_date)
            
            #Filtrar los datos para el índice de tiempo actual
            select_data = select_data[select_data['time'] == time_index]
             
            s_lat = select_data['latitude'].copy()
            s_lon = select_data['longitude'].copy()
            s_cluster = select_data['cluster'].copy()
            s_type = select_data['type'].copy()
            s_variable = select_data[variable_type].copy()
            
            #Filtrar los datos de formaciones para el índice de tiempo actual
            forms_data = forms_data[forms_data['time'] == time_index]
            max_ids = forms_data['max_id'].copy()
            min1_ids = forms_data['min1_id'].copy()
            min2_ids = forms_data['min2_id'].copy()
            f_types = forms_data['type'].copy()
            
            Points = namedtuple('Points', ['lat', 'lon', 'var', 'cluster', 'type'])
            Formations = namedtuple('Formations', ['max', 'min1', 'min2', 'type'])
            
            formations_array = []
            
            for max_id, min1_id, min2_id, f_type in zip(max_ids, min1_ids, min2_ids, f_types):
                max_points = [Points(lat, lon, var, clus, t) for lat, lon, var, clus, t in zip(s_lat, s_lon, s_variable, s_cluster, s_type) if clus == max_id]
                min1_points = [Points(lat, lon, var, clus, t) for lat, lon, var, clus, t in zip(s_lat, s_lon, s_variable, s_cluster, s_type) if clus == min1_id]
                min2_points = [Points(lat, lon, var, clus, t) for lat, lon, var, clus, t in zip(s_lat, s_lon, s_variable, s_cluster, s_type) if clus == min2_id] if f_type == 'OMEGA' else None
        
                formations_array.append(Formations(max_points, min1_points, min2_points, f_type))
        
            dataset_nc = get_dataset(self.file_name)
            
             # Extract coordinates and data using xarray for better performance
            nc_lat = dataset_nc.latitude.values
            nc_lon = dataset_nc.longitude.values
            nc_variable = dataset_nc[variable_type].values[time_index]
            
            # Ensure dataset is closed properly
            dataset_nc.close()
            
            #Adjust variable
            if variable_type == 'z':
                # Convert geopotential height to meters
                print("Converting geopotential height to meters...")
                nc_variable = nc_variable / g_0
           
            
            # Ajustar valores mayores a 180 restando 360
            if np.max(nc_lon) > 180:
                nc_lon, nc_variable = self.adjust_lon(nc_lon, nc_variable)
            
            # Adapt lat,lon and variable to the selected area
            lat_max, lon_min, lat_min, lon_max = self.area_covered
            
            lat_idx = np.nonzero((nc_lat >= lat_min) & (nc_lat <= lat_max))[0]
            lon_idx = np.nonzero((nc_lon >= lon_min) & (nc_lon <= lon_max))[0]
            
            if len(lat_idx) == 0 or len(lon_idx) == 0:
                print("Error: No data points within the specified area")
                return
            
            nc_lat = nc_lat[lat_idx]
            nc_lon = nc_lon[lon_idx]
            nc_variable = nc_variable[..., lat_idx[:, None], lon_idx]  # broadcasting over lat/lon
            
            # Mask invalid values
            nc_variable = ma.masked_invalid(nc_variable)
            
            # Generate the figure
            fig, ax = self.config_map()
            
            # Calculate contour levels
            vmin = np.nanmin(nc_variable) 
            vmax = np.nanmax(nc_variable)
            step = self.map_level
            
            if not np.isfinite(vmin) or not np.isfinite(vmax):
                print("Error: Invalid data range (NaN or Inf values)")
                return
            
            co = None
            
            for formation in formations_array:
                all_points = []
                for points in [formation.max, formation.min1, formation.min2]:
                    if points:
                        latitude = [p.lat for p in points]
                        longitude = [p.lon for p in points]
                        ids = [p.cluster for p in points]
                        type = [p.type for p in points]
                        
                        # Dibujar los puntos en el scatter plot
                        for i, t in enumerate(type):
                            color = 'red' if t == 'MAX' else 'blue'
                            sc = ax.scatter(longitude, latitude, c=color, s=8, 
                                    transform=ccrs.PlateCarree(), 
                                    linewidths=0.3, edgecolors='black', zorder=10
                            )

                        all_points.extend(zip(latitude, longitude))
                        
                        # Encontrar la posición más arriba a la derecha
                        max_lat_idx = np.argmax(latitude)
                        max_lat = latitude[max_lat_idx]
                        corresponding_lon = longitude[max_lat_idx]
                        
                        margin = 0.5
                        
                        # Anotar el ID del grupo en la posición media
                        num = ax.annotate(
                            ids[0], 
                            xy=(corresponding_lon + margin, max_lat + margin), 
                            fontsize=6, 
                            ha='left', color='white', transform=ccrs.PlateCarree(), zorder=11
                        )
                        plt.setp(
                            num, 
                            path_effects=[path_effects.Stroke(linewidth=1, foreground='black'), 
                                path_effects.Normal()]
                        )
                        
                if all_points:
                    lon_points = [point[1] for point in all_points]
                    
                    if(abs(min(lon_points) - max(lon_points)) >= 180):
                        norm_points = [(lat, lon + 360 if lon < 0 else lon) for lat, lon in all_points]
                        lats, lons = zip(*norm_points) 
                        points = np.array(norm_points)
                    else:
                        lats, lons = zip(*all_points)
                        points = np.array(all_points)
                    
                    min_lat, max_lat = min(lats), max(lats)
                    min_lon, max_lon = min(lons), max(lons)
                    padding = 0.3
                    
                    hull = ConvexHull(points)
                    polygon_points = points[hull.vertices]
                    centroid = np.mean(polygon_points, axis=0)
                    polygon_points = polygon_points + padding * (polygon_points - centroid)
                    
                    # Trazar el polígono
                    ax.plot(polygon_points[:, 1], polygon_points[:, 0], 
                            color='black', linewidth=0.75, 
                            transform=ccrs.PlateCarree(), zorder=10
                    )
                    ax.plot([polygon_points[0, 1], polygon_points[-1, 1]], 
                            [polygon_points[0, 0], polygon_points[-1, 0]], 
                            color='black', linewidth=0.75, transform=ccrs.PlateCarree(), 
                            zorder=10
                    )
                    
                    # Anotar el tipo de la formación en el mapa
                    mid_lat = (min_lat + max_lat) / 2
                    mid_lon = (min_lon + max_lon) / 2
                    
                    if mid_lon >= 170:
                        mid_lon = 170
                    
                    if formation.type == 'OMEGA':
                        an_xy = (mid_lon, mid_lat - 8)
                    else:
                        an_xy = (mid_lon, mid_lat)
                        
                    type_an = ax.annotate(formation.type, an_xy, fontsize=4, ha='center', 
                                          color='white', transform=ccrs.PlateCarree(), zorder=13)
                    plt.setp(type_an, 
                             path_effects=[path_effects.Stroke(linewidth=1, foreground='black'), 
                                           path_effects.Normal()]
                    )
            
            #Valor entre los contornos
            cont_levels = np.arange(np.ceil(vmin/10)*10, vmax, step)
            if len(cont_levels) < 2:
                # Fallback if range is too small
                cont_levels = np.linspace(vmin, vmax, 5)
                
            co = ax.contour(nc_lon, nc_lat, nc_variable, levels=cont_levels, cmap='jet', 
                            transform=ccrs.PlateCarree(), vmax=s_variable.max(), 
                            vmin=s_variable.min(), linewidths=0.5, zorder=7
                            )
            
            # Valores de contorno
            cont_txt = plt.clabel(co, inline=True, fontsize=4, zorder=8)
            plt.setp(cont_txt, path_effects=[path_effects.Stroke(linewidth=0.5, foreground='white'), 
                                             path_effects.Normal()]
                    )

            # Visual adds
            self.visual_adds(fig, ax, co, self.map_type, variable_type, "v", actual_date)
            
            print("Map generated. Saving map...")
            # Save the figure and close it to prevent resource leaks
            self.save_map(actual_date)
        
        except Exception as e:
            print(f"Error in generate_formations_map: {str(e)}")
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
