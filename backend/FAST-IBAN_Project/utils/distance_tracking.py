import pandas as pd
from geopy.distance import geodesic

# Función para calcular la distancia entre dos puntos en kilómetros
def calcular_distancia(lat1, lon1, lat2, lon2):
    return geodesic((lat1, lon1), (lat2, lon2)).kilometers

# Cargar el archivo CSV
df = pd.read_csv('../out/tracking_formation-id-8_2019-06-23_00-06-12-18UTC.csv')

# Inicializar variables para almacenar la distancia total y la distancia punto a punto
distancia_total = 0.0

# Calcular la distancia entre puntos consecutivos
for i in range(1, len(df)):
    # Puntos en el tiempo t y t+1
    punto_anterior = (df.loc[i-1, 'min2_lat'], df.loc[i-1, 'min2_lon'])
    punto_actual = (df.loc[i, 'min2_lat'], df.loc[i, 'min2_lon'])
    
    # Calcular la distancia entre el punto anterior y el actual
    distancia = geodesic(punto_anterior, punto_actual).kilometers
    # print(f"Distancia entre punto {i-1} y {i}: {distancia:.2f} km")
    if distancia > 300:
        continue
    distancia_total += distancia

# Calcular la distancia desde el primer punto al último punto
distancia_inicio_fin = geodesic(
    (df.loc[0, 'min2_lat'], df.loc[0, 'min2_lon']),
    (df.loc[len(df)-1, 'min2_lat'], df.loc[len(df)-1, 'min2_lon'])
).kilometers

print(f"Distancia total recorrida: {distancia_total:.2f} km")
# print(f"Distancia del punto inicial al final: {distancia_inicio_fin:.2f} km")
