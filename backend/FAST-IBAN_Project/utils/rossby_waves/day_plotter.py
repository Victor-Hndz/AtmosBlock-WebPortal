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

# Leer el archivo CSV
df = pd.read_csv('min_lat_pts-overturning_largestPVcontour_2PVU-330K-2000.csv')

# Crear la figura y el eje usando una proyección polar para el hemisferio norte
fig = plt.figure(figsize=(8, 8))
ax = plt.subplot(1, 1, 1, projection=ccrs.NorthPolarStereo())

# Añadir características geográficas al mapa
ax.coastlines()

# Añadir líneas de latitud y longitud con etiquetas
gl = ax.gridlines(draw_labels=True, dms=True, x_inline=False, y_inline=False)

# Formatear las etiquetas de latitud y longitud
gl.xformatter = ccrs.Geodetic()._as_mpl_transform(ax)
gl.yformatter = ccrs.Geodetic()._as_mpl_transform(ax)

# Etiquetas personalizadas para longitud
gl.xlabel_style = {'size': 10, 'color': 'gray'}
gl.ylabel_style = {'size': 10, 'color': 'gray'}

# Desactivar etiquetas en la parte superior y derecha
gl.top_labels = False
gl.right_labels = False

# Establecer un rango de valores y añadir etiquetas personalizadas
gl.xlocator = plt.MaxNLocator(7)  # Controlar cuántas marcas de longitud
gl.ylocator = plt.MaxNLocator(7)  # Controlar cuántas marcas de latitud

# Ajustar manualmente las etiquetas de longitud y latitud
gl.xformatter = plt.FuncFormatter(lambda x, pos: format_longitude(x))
gl.yformatter = plt.FuncFormatter(lambda y, pos: format_latitude(y))

# Crear un colormap de escala 'jet'
norm = mcolors.Normalize(vmin=1, vmax=365)
colormap = cm.jet

# Dibujar cada punto en el mapa con colores según el día del año
for index, row in df.iterrows():
    lat = row['lats']
    lon = row['lons']
    date = row['dats']
    
    # Convertir la fecha a un día del año
    day_of_year = date_to_day_of_year(date)
    
    # Obtener el color del gradiente según el día del año
    color = colormap(norm(day_of_year))
    
    # Graficar el punto en la latitud y longitud correspondiente con el color del gradiente
    ax.plot(lon, lat, marker='o', color=color, markersize=5, transform=ccrs.PlateCarree())

# Establecer límites para que solo se vea el hemisferio norte
ax.set_extent([-180, 180, 0, 90], crs=ccrs.PlateCarree())

# Añadir una barra de colores para mostrar el gradiente del año
sm = plt.cm.ScalarMappable(cmap=colormap, norm=norm)
sm.set_array([])
cbar = plt.colorbar(sm, ax=ax, orientation='horizontal', fraction=0.046, pad=0.04)
cbar.set_label('Día del Año')

# Guardar la imagen en formato SVG
plt.savefig('output.svg', format='svg')

# Mostrar el mapa
# plt.show()
