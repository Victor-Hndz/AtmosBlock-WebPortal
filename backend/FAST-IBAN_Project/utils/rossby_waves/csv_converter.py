import csv
import os
import sys

# Función para verificar si un archivo ya existe y generar un nuevo nombre si es necesario
def generar_nombre_salida(input_file):
    base_name = os.path.splitext(input_file)[0]  # Nombre sin la extensión
    output_file = base_name + '.csv'
    
    # Si el archivo de salida ya existe, agregar un número (n)
    n = 1
    while os.path.exists(output_file):
        output_file = f"{base_name}({n}).csv"
        n += 1
    
    return output_file

# Función para convertir el archivo de texto a CSV
def convertir_txt_a_csv(input_file):
    output_file = generar_nombre_salida(input_file)
    
    with open(input_file, 'r', encoding='utf-8') as txtfile:
        # Leer líneas del archivo de texto
        lines = txtfile.readlines()
        
        # Abrir archivo CSV para escritura
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            csv_writer = csv.writer(csvfile)
            
            # Escribir la cabecera
            headers = lines[0].strip().split('\t')
            csv_writer.writerow(headers)
            
            # Obtener los índices de las columnas 'lons' y 'lats'
            lons_idx = headers.index('lons')
            lats_idx = headers.index('lats')
            
            # Escribir las filas
            for line in lines[1:]:
                # Separar por tabulaciones y eliminar espacios
                row = line.strip().split('\t')
                
                # Reemplazar comas por puntos en las columnas 'lons' y 'lats'
                row[lons_idx] = row[lons_idx].replace(',', '.')
                row[lats_idx] = row[lats_idx].replace(',', '.')
                
                # Escribir la fila al archivo CSV
                csv_writer.writerow(row)
    
    print(f"Archivo CSV generado: {output_file}")


# Verificar si se ha proporcionado un archivo de entrada
if len(sys.argv) > 1:
    archivo_entrada = sys.argv[1]
    convertir_txt_a_csv(archivo_entrada)
else:
    print("Por favor, proporciona el archivo de entrada como argumento.")
