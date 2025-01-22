import pandas as pd
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
import os

def generar_grafico(data, es_max=True, tiempo=0):
    #obtener solo los datos del tiempo seleccionado
    data = data[data['time'] == tiempo]
    
    latitudes = data['latitude'].copy()
    longitudes = data['longitude'].copy()
    variable = data['z'].copy()


    plt.figure(figsize=(10, 6))
    ax = plt.axes(projection=ccrs.PlateCarree())
    ax.set_xlim(-180, 180)
    ax.set_ylim(-90, 90)
    
    ax.coastlines()
    ax.add_feature(cfeature.BORDERS, linestyle=':')
    ax.add_feature(cfeature.LAND, edgecolor='black')

    sc = ax.scatter(longitudes, latitudes, c=variable, cmap='jet', transform=ccrs.PlateCarree())
    
    cbar = plt.colorbar(sc, ax=ax, orientation='vertical')
    cbar.set_label('Geopotencial (m)')

    tipo = 'max' if es_max else 'min'
    plt.title(f'Geopotencial {tipo} en 500 hPa')
    plt.xlabel('Longitud')
    plt.ylabel('Latitud')
    
    # Guardar con el nombre original
    nombre_base = f"mapa_geopotencial_puntos_t{tiempo}_{tipo}"
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
data = pd.read_csv('data/Geopotential_selected_max.csv')
tiempo = 0
generar_grafico(data, es_max=True, tiempo=tiempo)

# Lee el archivo CSV y genera el gráfico
data = pd.read_csv('data/Geopotential_selected_min.csv')
tiempo = 0
generar_grafico(data, es_max=False, tiempo=tiempo)

print("Imágenes guardadas exitosamente.")
