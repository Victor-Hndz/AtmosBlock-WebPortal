import netCDF4 as Nc
import pandas as pd
import matplotlib.pyplot as plt
import cartopy.crs as ccrs 
import cartopy as cartopy 
import os
import configparser
import yaml

# m/s^2
g_0 = 9.80665


def generar_grafico(data, es_max, niveles, tiempo, lat_range, lon_range):   
    # obtener solo los datos del tiempo seleccionado
    data = data[data['time'] == tiempo]
    
    latitudes = data['latitude'].copy()
    longitudes = data['longitude'].copy()
    variable = data['z'].copy()
    
    # Abrir el archivo NetCDF
    archivo_nc = Nc.Dataset('data/geopot_500hPa_2022-03-14_00-06-12-18UTC_HN.nc', 'r')
    
    # Obtener los datos de tiempo, latitud, longitud y la variable z
    lat = archivo_nc.variables['latitude'][:]
    lon = archivo_nc.variables['longitude'][:]
    z = archivo_nc.variables['z'][:]

    # Cerrar el archivo NetCDF
    archivo_nc.close()

    z = z[tiempo]
    z = z / g_0
    
    # Crear una figura para un mapa del mundo
    plt.figure(figsize=(15, 9), dpi=250)
    ax = plt.axes(projection=ccrs.PlateCarree())

    # Establecer límites manuales para cubrir todo el mundo
    ax.set_xlim(lon_range[0], lon_range[1])
    ax.set_ylim(lat_range[0], lat_range[1])

    # Agregar detalles geográficos al mapa
    ax.coastlines()
    ax.add_feature(cartopy.feature.BORDERS, linestyle=':')

    # Agregar puntos de dispersión
    sc = ax.scatter(longitudes, latitudes, c=variable, cmap='jet', transform=ccrs.PlateCarree(), s=10)

    # Plotea los puntos en el mapa
    co = ax.contour(lon, lat, z, levels=niveles, cmap='jet',
                    transform=ccrs.PlateCarree(), linewidths=0.5, vmax=variable.max(), vmin=variable.min())
    
    # valores de contorno
    plt.clabel(co, inline=True, fontsize=8)

    cbar = plt.colorbar(sc, ax=ax, orientation='vertical', pad=0.02, aspect=16, shrink=0.8)
    cbar.set_label('Geopotencial (m)')

    tipo = 'max' if es_max else 'min'
    
    # Añade títulos y etiquetas
    plt.title(f'Geopotencial {tipo} en 500 hPa con {niveles} niveles')
    plt.xlabel('Longitud (deg)')
    plt.ylabel('Latitud (deg)')
    
    # Agregar marcas de latitud en el borde izquierdo
    ax.set_yticks(range(lat_range[0], lat_range[1]+1, 10), crs=ccrs.PlateCarree())
    ax.set_yticklabels([f'{deg}' for deg in range(lat_range[0], lat_range[1]+1, 10)], fontsize=8)
    
    # Agregar marcas de longitud en el borde inferior
    ax.set_xticks(range(lon_range[0], lon_range[1]+1, 20), crs=ccrs.PlateCarree())
    ax.set_xticklabels([f'{deg}' for deg in range(lon_range[0], lon_range[1]+1, 20)], fontsize=8)
    
    
    # Muestra la figura
    # plt.show()

    # La barra de progreso llegará al 100% cuando termine de generar el mapa.
    print("Mapa generado. Guardando mapa...")

    # Definir el nombre base del archivo y la extensión 
    nombre_base = f"mapa_geopotencial_contornos_puntos_%il_t%i_{tipo}" % (niveles, tiempo)
    extension = ".svg" 
    
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
    
    # Guardar la figura como imagen en la ubicación especificada 
    plt.savefig(nombre_archivo) 
    
    # Informa que la imagen ha sido guardada 
    print(f"Imagen guardada como: {nombre_archivo}") 

#Main function
def main():
    # Seleccionar archivo de configuración basado en el sistema operativo
    if os.name == 'posix':  # Linux
        with open('config.yaml', 'r') as infile:
            options = yaml.safe_load(infile)
    elif os.name == 'nt':  # Windows
        config = configparser.ConfigParser()
        config.read('config.ini')
        options = {section: dict(config[section]) for section in config.sections()}

    # Elegir un conjunto de opciones
    chosen_options = options['OPTIONS_MAX']
    generar_grafico(data=pd.read_csv(chosen_options['data_csv']), es_max=chosen_options['es_max'], niveles=chosen_options['levels'], 
                    tiempo=chosen_options['time'], lat_range=chosen_options['lat_range'], lon_range=chosen_options['lon_range'])

    chosen_options = options['OPTIONS_MIN']
    generar_grafico(data=pd.read_csv(chosen_options['data_csv']), es_max=chosen_options['es_max'], niveles=chosen_options['levels'], 
                    tiempo=chosen_options['time'], lat_range=chosen_options['lat_range'], lon_range=chosen_options['lon_range'])

if __name__ == '__main__':
    main()