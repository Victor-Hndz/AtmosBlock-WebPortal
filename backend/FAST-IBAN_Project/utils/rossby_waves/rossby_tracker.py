import pandas as pd
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import matplotlib.cm as cm
import matplotlib.colors as mcolors
from datetime import datetime

# Funciones auxiliares para formatear las etiquetas de latitud y longitud
def format_latitude(value):
    if value > 0:
        return f"{abs(value):.0f}º N"
    elif value < 0:
        return f"{abs(value):.0f}º S"
    else:
        return "0º"

def format_longitude(value):
    if value > 0:
        return f"{abs(value):.0f}º E"
    elif value < 0:
        return f"{abs(value):.0f}º W"
    else:
        return "0º"

# Convertir fechas a día del año
def date_to_day_of_year(date_str):
    date = datetime.strptime(date_str, '%d/%m/%Y')
    return date.timetuple().tm_yday

# Convertir la fecha y hora en un formato datetime
def combine_date_time(row):
    return datetime.strptime(f"{row['dats']} {row['tims']}", '%d/%m/%Y %H:%M')

# Calcular la distancia euclidiana aproximada (en grados) entre dos puntos
def distance(lat1, lon1, lat2, lon2):
    return ((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) ** 0.5

# Leer el archivo CSV
df = pd.read_csv('min_lat_pts-overturning_largestPVcontour_2PVU-330K-2000.csv')

# Convertir las columnas de fecha y hora a un solo campo de tipo datetime
df['datetime'] = df.apply(combine_date_time, axis=1)

# Ordenar los datos por tiempo para asegurarnos de que están en el orden correcto
df = df.sort_values(by='datetime')

# Configurar una distancia de umbral para considerar que los puntos están "cerca"
distance_threshold = 20  # Esto depende de la escala que estés usando
time_threshold = 24  # horas

# Crear la figura y el eje usando la proyección polar del hemisferio norte
fig = plt.figure(figsize=(8, 8))
ax = plt.subplot(1, 1, 1, projection=ccrs.NorthPolarStereo())

# Añadir características geográficas al mapa
ax.coastlines()

# Añadir líneas de latitud y longitud con etiquetas
gl = ax.gridlines(draw_labels=True, dms=True, x_inline=True, y_inline=True)

# Formatear las etiquetas de latitud y longitud
gl.xformatter = plt.FuncFormatter(lambda x, pos: format_longitude(x))
gl.yformatter = plt.FuncFormatter(lambda y, pos: format_latitude(y))

# Establecer límites para que solo se vea el hemisferio norte
ax.set_extent([-180, 180, 0, 90], crs=ccrs.PlateCarree())

# Crear un colormap de escala 'jet'
norm = mcolors.Normalize(vmin=1, vmax=365)
colormap = cm.jet

# Identificar y plotear las trayectorias
trajs = []
last_date = None

for i in range(len(df)):
    print(f"Procesando punto {i} de {len(df)}", end='\r')
    
    trajectory = []
    lat1, lon1 = df.iloc[i]['lats'], df.iloc[i]['lons']
    trajectory.append((lon1, lat1))
    last_date = df.iloc[i]['dats']
    
    # Crear una ventana móvil
    window_start = df.iloc[i]['datetime'] - pd.Timedelta(hours=time_threshold)
    window_end = df.iloc[i]['datetime'] + pd.Timedelta(hours=time_threshold)

    # Filtrar puntos que caigan dentro de la ventana
    ventana_temporal = df[(df['datetime'] > window_start) & (df['datetime'] <= window_end)]

    # Comprobar solo los puntos dentro de la ventana temporal
    for j in range(len(ventana_temporal)):
        if j == i:
            continue  # Evitar procesar puntos ya agrupados
        
        lat2, lon2 = df.iloc[j]['lats'], df.iloc[j]['lons']
        dist = distance(lat1, lon1, lat2, lon2)
        
        # Comprobar si los puntos cumplen con el criterio de distancia
        if dist < distance_threshold and (lon2, lat2) not in trajectory:
            trajectory.append((lon2, lat2))
    
    # Si la trayectoria tiene más de un punto, guardarla
    if len(trajectory) > 2 and trajectory not in trajs:
        trajs.append((trajectory, last_date))
        
print(f"Se encontraron {len(trajs)} trayectorias")

# Plotear trayectorias
for traj in trajs:
    # print(f"Procesando trayectoria {trajs.index(traj) + 1} de {len(trajs)}", end='\r')
    # Obtener el color del gradiente según el día del año del primer punto
    day_of_year = date_to_day_of_year(traj[1])
    color = colormap(norm(day_of_year))

    # Extraer las coordenadas de la trayectoria
    lons, lats = zip(*traj[0])
    ax.plot(lons, lats, linestyle='--', color=color, transform=ccrs.PlateCarree())
    ax.plot(lons, lats, marker='o', color=color, markersize=5, transform=ccrs.PlateCarree())

# Añadir una barra de colores para mostrar el gradiente del año
sm = plt.cm.ScalarMappable(cmap=colormap, norm=norm)
sm.set_array([])
cbar = plt.colorbar(sm, ax=ax, orientation='horizontal', fraction=0.046, pad=0.04)
cbar.set_label('Día del Año')

print("Guardando imagen...")

# Guardar la imagen en formato SVG
plt.savefig('trayectorias_polar.svg', format='svg')

# Mostrar el mapa
# plt.show()
