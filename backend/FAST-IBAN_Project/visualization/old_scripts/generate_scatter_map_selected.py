import pandas as pd
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
import os
import numpy as np
from scipy import interpolate
from mpl_toolkits.mplot3d import Axes3D

def generar_grafico(data, tiempo, tipo):
    #obtener solo los datos del tiempo seleccionado
    # data = data[data['time'] == tiempo]

    latitudes_min1 = data['min1_lat'].copy()
    latitudes_min2 = data['min2_lat'].copy()
    latitudes_max = data['max_lat'].copy()
    
    longitudes_min1 = data['min1_lon'].copy()
    longitudes_min2 = data['min2_lon'].copy()
    longitudes_max = data['max_lon'].copy()
    
    z_min1 = data['z_min1'].copy()
    z_min2 = data['z_min2'].copy()
    z_max = data['z_max'].copy()


    plt.figure(figsize=(10, 6))
    ax = plt.axes(projection=ccrs.PlateCarree())
    ax.set_xlim(-180, 180)
    ax.set_ylim(-90, 90)
    
    ax.coastlines()
    ax.add_feature(cfeature.BORDERS, linestyle=':')
    ax.add_feature(cfeature.LAND, edgecolor='black')

    if tipo == 'omega':
        #maximo y minimo de los z
        all_max = max(max(z_max), max(z_min1), max(z_min2))
        all_min = min(min(z_max), min(z_min1), min(z_min2))
    
        sc1 = ax.scatter(longitudes_min1, latitudes_min1, c=z_min1, cmap='jet', transform=ccrs.PlateCarree(), vmax=all_max, vmin=all_min, s=10)
        ax.scatter(longitudes_min2, latitudes_min2, c=z_min2, cmap='jet', transform=ccrs.PlateCarree(), vmax=all_max, vmin=all_min, s=10)
        sc2 = ax.scatter(longitudes_max, latitudes_max, c=z_max, cmap='jet', transform=ccrs.PlateCarree(), vmax=all_max, vmin=all_min, s=30)
        
        ax.plot([longitudes_min1, longitudes_min2], [latitudes_min1, latitudes_min2], [z_min1, z_min2], c='purple', transform=ccrs.PlateCarree(), linewidth=1, linestyle='--')
        ax.plot([longitudes_min1, longitudes_max], [latitudes_min1, latitudes_max], [z_min1, z_max], c='green', transform=ccrs.PlateCarree(), linewidth=1, linestyle='--')
        ax.plot([longitudes_min2, longitudes_max], [latitudes_min2, latitudes_max], [z_min2, z_max], c='green', transform=ccrs.PlateCarree(), linewidth=1, linestyle='--')
        
    else:
        #maximo y minimo de los z
        all_max = max(max(z_max), max(z_min1))
        all_min = min(min(z_max), min(z_min1))
        
        sc1 = ax.scatter(longitudes_min1, latitudes_min1, c=z_min1, cmap='jet', transform=ccrs.PlateCarree(), vmax=all_max, vmin=all_min, s=10)
        sc2 = ax.scatter(longitudes_max, latitudes_max, c=z_max, cmap='jet', transform=ccrs.PlateCarree(), vmax=all_max, vmin=all_min, s=30)   
        ax.plot([longitudes_min1, longitudes_max], [latitudes_min1, latitudes_max], [z_min1, z_max], c='green', transform=ccrs.PlateCarree(), linewidth=1, linestyle='--')   
    
    cbar = plt.colorbar(sc1, ax=ax, orientation='vertical')
    cbar.set_label('Geopotencial (m)')

    plt.title(f'Puntos seleccionados de tipo {tipo} en 500 hPa')
    plt.xlabel('Longitud')
    plt.ylabel('Latitud')
    
    # Guardar con el nombre original
    nombre_base = f"mapa_geopotencial_puntos_selected_t{tiempo}_{tipo}"
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


# Lee el archivo CSV y genera el gráfico
data = pd.read_csv('data/Geopotential_candidates.csv')
omega_data = data[data['type'] == 'omega']
tiempo = 0
generar_grafico(omega_data, tiempo, 'omega')

# Lee el archivo CSV y genera el gráfico
data = pd.read_csv('data/Geopotential_candidates.csv')
rex_data = data[data['type'] == 'rex']
tiempo = 0
generar_grafico(rex_data, tiempo, 'rex')
