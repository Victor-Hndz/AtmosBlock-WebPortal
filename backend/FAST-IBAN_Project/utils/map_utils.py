from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import cartopy.crs as ccrs 
import cartopy as cartopy 
import numpy as np
import xarray as xr
import pandas as pd
import os
import re

patron_fecha = r"\d{4}.*UTC"
patron_aamm = r"\d{4}-\d{2}-"
patron_dias = r"\d{4}-\d{2}-\d{2}_\d{2}_"
patron_dia_unico = r"\d{4}-\d{2}-\d{2}_"
patron_horas = r"_(?:\d{2}-)+\d{2}UTC$"
patron_tiempo = r"\d{2}"

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
    

def time_validator(instante: int, dates: list) -> str:
    """Verifica si un instante de tiempo dado es válido y devuelve la fecha exacta correspondiente.

    Args:
        instante (int): Entero con el instante de tiempo.
        dates (list): Lista con las fechas del conjunto de datos.

    Returns:
        str: Cadena con el resultado de la verificación.
    """
    try:
        inst = dates[instante]
        return f"El instante {instante} es válido y corresponde a la fecha exacta {inst}"
    except IndexError:
        return f"El instante {instante} no es válido"
    
    
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

def obtain_csv_files(date: str, file: str) -> str:
    """Obtiene los archivos CSV correspondientes a una fecha específica.

    Args:
        date (str): Cadena con la fecha específica.
        file (str): Archivo a imprimir.

    Returns:
        str: Cadena con los archivos CSV correspondientes.
    """
    fecha_actual = pd.Timestamp.now()
    directory = "out/"
    fecha = re.search(patron_fecha, date).group()
    
    # Lista para almacenar los archivos CSV que coinciden con la fecha proporcionada
    archivos_coincidentes = []
    
    for archivo in os.listdir(directory):
        if archivo.endswith(".csv") and file in archivo:
            # Obtener la fecha del archivo actual
            try:
                partes = archivo.split("_")
                fecha_archivo = partes[4] + "_" + partes[5]
                # Verificar si la fecha del archivo coincide con la fecha proporcionada
                if fecha_archivo == fecha:
                    archivos_coincidentes.append(archivo)
            except:
                pass
                
    #si hay mas de 3 archivos, eliminar todos menos los 3 más recientes
    while len(archivos_coincidentes) > 3:
        # Calcular las diferencias de tiempo entre la fecha actual y la segunda fecha en cada archivo
        diferencias_de_tiempo = {}
        for archivo in archivos_coincidentes:
            # Obtener la segunda fecha del archivo
            segunda_fecha = pd.to_datetime(archivo.split('_')[-2], format='%d-%m-%Y')
            # Calcular la diferencia de tiempo entre la fecha actual y la segunda fecha
            diferencia_tiempo = abs(fecha_actual - segunda_fecha)
            diferencias_de_tiempo[archivo] = diferencia_tiempo
            
        # Encontrar el archivo con la segunda fecha más lejana a la fecha actual
        archivo_mas_lejano = max(diferencias_de_tiempo, key=diferencias_de_tiempo.get)
        
        # Eliminar el archivo más lejano
        os.remove(directory + archivo_mas_lejano)
        archivos_coincidentes.remove(archivo_mas_lejano)
    
    # Si hay archivos coincidentes
    if archivos_coincidentes:
        # Calcular las diferencias de tiempo entre la fecha actual y la segunda fecha en cada archivo
        diferencias_de_tiempo = {}
        for archivo in archivos_coincidentes:
            # Obtener la segunda fecha del archivo
            segunda_fecha = pd.to_datetime(archivo.split('_')[-2], format='%d-%m-%Y')
            # Calcular la diferencia de tiempo entre la fecha actual y la segunda fecha
            diferencia_tiempo = abs(fecha_actual - segunda_fecha)
            diferencias_de_tiempo[archivo] = diferencia_tiempo

        # Encontrar el archivo con la segunda fecha más cercana a la fecha actual
        archivo_mas_cercano = min(diferencias_de_tiempo, key=diferencias_de_tiempo.get)
        return archivo_mas_cercano
    else:
        print("No se encontraron archivos CSV para la fecha proporcionada.")
        return None
    
    
def extract_date(fecha: str, tiempo: int) -> str:
    """A partir de una cadena con una fecha completa y un instante de tiempo, saca una cadena con la fecha exacta correcta.

    Args:
        fecha (str): Cadena con la fecha base completa.
        tiempo (int): Entero con el instante de tiempo.

    Returns:
        str: Cadena con la fecha nueva corregida.
    """
    if(re.search(patron_dias, fecha)):
        #contar los instantes de tiempo que hay
        time = re.search(patron_horas, fecha).group()
        
        #contar uno por cada vez que patron_tiempo encaje
        t_mod = len(re.findall(patron_tiempo, time))
        
        #dependiendo del valor de "tiempo", obtener el dia y el instante de ese dia
        dia = int(tiempo/t_mod)
        t = tiempo % t_mod
        
        #extraemos el día
        dia_ini = int(re.search(patron_dias, fecha).group()[8:10])
        dia = dia_ini + dia
        
        #si dia es de un solo dígito, añadir un 0 al principio
        if(dia < 10):
            dia = "0" + str(dia)
        
        #extraemos el instante de tiempo
        t = re.findall(patron_tiempo, time)[t]
        
        #montamos la nueva fecha
        new_date = re.search(patron_aamm, fecha).group() + str(dia) + "_" + t + "UTC"
    else:        
        #dependiendo del valor de "tiempo", obtener el instante de ese día
        if(tiempo < 10):
            tiempo = "0" + str(tiempo)
        
        #montamos la nueva fecha
        new_date = re.search(patron_dia_unico, fecha).group() + tiempo + "UTC"
        
    return new_date


def adjust_lon(lon, z):
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


def filt_data(lat, lon, z, lat_range, lon_range):
    """Filtra los datos de lat, lon y z para que estén dentro de los rangos especificados.

    Args:
        lat (_type_): Latitudes a filtrar.
        lon (_type_): Longitudes a filtrar.
        z (_type_): Z para ajustar.
        lat_range (_type_): rangos de latitud.
        lon_range (_type_): rangos de longitud.

    Returns:
        tuple(lat, lon, z): Tupla con lat, lon y z ajustados.
    """
    #si no son arrays de numpy, convertirlos
    if(not isinstance(lat, np.ndarray)):
        lat = np.array(lat)
    if(not isinstance(lon, np.ndarray)):
        lon = np.array(lon)
    if(not isinstance(z, np.ndarray)):
        z = np.array(z)

    
    
    lat_idx = np.where((lat >= lat_range[0]) & (lat <= lat_range[1]))[0]
    lon_idx = np.where((lon >= lon_range[0]) & (lon <= lon_range[1]))[0]
    
    lat = lat[lat_idx]
    lon = lon[lon_idx]
    
    if(len(z.shape) == 1):
        z_idx = np.where((lat >= lat_range[0]) & (lat <= lat_range[1]))[0]
        z = z[z_idx]
    else:
        z = z[lat_idx]
        z = z[:, lon_idx]
    
    return lat, lon, z


def config_map(lat_range, lon_range):
    """Configura un mapa con los rangos de latitud y longitud especificados.
    Crea una figura y un eje para el mapa del mundo, establece límites manuales para cubrir todo el mundo y agrega detalles geográficos al mapa.

    Args:
        lat_range (_type_): rangos de latitud para el mapa.
        lon_range (_type_): rangos de longitud para el mapa.

    Returns:
        tuple (fig, ax): Tupla con la figura y el eje del mapa.
    """
    # Crear una figura para un mapa del mundo
    fig, ax = plt.subplots(figsize=(11, 5), dpi=250, subplot_kw=dict(projection=ccrs.PlateCarree()))
    ax.set_global()

    # Establecer límites manuales para cubrir todo el mundo
    ax.set_xlim(lon_range[0], lon_range[1])
    ax.set_ylim(lat_range[0], lat_range[1])

    # Agregar detalles geográficos al mapa
    ax.coastlines()
    ax.add_feature(cartopy.feature.BORDERS, linestyle=':')
    
    return fig, ax


def visual_adds(fig, ax, map, new_date, lat_range, lon_range, niveles=None, tipo=None):
    """Añade detalles visuales a la figura y el eje especificados.
    Añade valores de contorno, títulos, etiquetas, barra de colores y marcas de latitud y longitud.

    Args:
        fig (Figure): figura a la que se le añadirán detalles visuales.
        ax (Axes): eje al que se le añadirán detalles visuales.
        map (_type_): valores del mapa.
        new_date (_type_): fecha para el título.
        lat_range (_type_): rangos de latitud.
        lon_range (_type_): rangos de longitud.
        niveles (_type_, optional): niveles del contorno. Defaults to None.
        tipo (_type_, optional): valor de máximo o mínimo. Defaults to None.
    """
    
    # var_type = 't'
    var_type = 'z'
    orientation = 'v'
    # orientation = 'h'
    

    # Añade títulos y etiquetas
    if(tipo != None):
        # plt.title(f'{tipo} - Geopotential height at 500hPa - {new_date}', loc='center')
        # plt.title(f'{tipo} - Geopotential height at 500hPa - 2019-06-26_00UTC', loc='center')
        if var_type == 'z':
            plt.title(f'{tipo} - Geopotential height at 500hPa - {new_date}', loc='center')
        elif var_type == 't':
            plt.title(f'{tipo} - Temperature at 850hPa - {new_date}', loc='center')
    else:
        plt.title(f'Geopotential height at 500hPa - {new_date}', loc='center')

        
    # plt.xlabel('Longitude (deg)')
    # plt.ylabel('Latitude (deg)')

    if map != None:
        # Añadir la barra de colores en la parte inferior (centrada)

        if orientation == 'v':
            cax = fig.add_axes([ax.get_position().x1+0.01,
                            ax.get_position().y0,
                            0.02,
                            ax.get_position().height])
            cbar = plt.colorbar(map, cax=cax, orientation='vertical') 
        elif orientation == 'h':
            cax = fig.add_axes([(ax.get_position().x1 + ax.get_position().x0)/2 - (ax.get_position().width * 0.4)/2,
                        ax.get_position().y0 - 0.12,
                        ax.get_position().width * 0.4,
                        0.02])
            cbar = plt.colorbar(map, cax=cax, orientation='horizontal')
    
        # Ajustar el tamaño de letra de los números
        cbar.ax.tick_params(labelsize=10)  # Cambia 10 por el tamaño de letra deseado

        # Añadir etiqueta a la barra de colores y ajustar el tamaño de letra
        if var_type == 'z':
            cbar.set_label('Geopotential height (m)', fontsize=10)  # Cambia 10 por el tamaño de letra deseado
        elif var_type == 't':
            cbar.set_label('Temperature (ºC)', fontsize=10)  # Cambia 10 por el tamaño de letra deseado
    
    # Agregar marcas de latitud en el borde izquierdo
    ax.set_yticks(range(lat_range[0], lat_range[1]+1, 10), crs=ccrs.PlateCarree())
    ax.set_yticklabels([f'{deg}°' for deg in range(lat_range[0], lat_range[1]+1, 10)])
    
    # Agregar marcas de longitud en el borde inferior
    ax.set_xticks(range(lon_range[0], lon_range[1]+1, 20), crs=ccrs.PlateCarree())
    ax.set_xticklabels([f'{deg}°' for deg in range(lon_range[0], lon_range[1]+1, 20)])


def save_file(nombre_base: str, extension: str):
    """Guarda la figura en la ubicación especificada con un nombre único.

    Args:
        nombre_base (str): nombre base del archivo.
        extension (str): extensión del archivo.
        tipo (str, optional): valor de máximo o mínimo. Defaults to None.
    """
    # Inicializar el contador para los números incrementales 
    contador = 0 
    
    # Generar un nombre de archivo único 
    while True: 
        if contador == 0: 
            nombre_archivo = f"{nombre_base}{extension}" 
        else: 
            nombre_archivo = f"{nombre_base}({contador}){extension}" 
        if not os.path.exists(nombre_archivo): 
            break 
        contador += 1 
    
    # Guardar la figura en la ubicación especificada 
    plt.savefig(nombre_archivo) 
    
    print(f"Imagen guardada como: {nombre_archivo}") 
