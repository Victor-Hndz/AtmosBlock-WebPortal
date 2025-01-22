from PIL import Image

def resize_and_set_dpi(image_path, reference_image_path, output_image_path):
    # Carga de la imagen de origen
    image = Image.open(image_path)
    
    # Carga de la imagen de referencia
    ref_image = Image.open(reference_image_path)
    
    # Obtener DPI de la imagen de referencia
    ref_dpi = ref_image.info.get('dpi', (72, 72))
    
    # Obtener tamaño en píxeles de la imagen de referencia
    ref_size = ref_image.size
    
    # Redimensionar la imagen de origen para que coincida con el tamaño de la imagen de referencia
    resized_image = image.resize(ref_size, Image.ANTIALIAS)
    
    # Establecer los DPI de la imagen redimensionada para que coincidan con los de la imagen de referencia
    resized_image.save(output_image_path, dpi=ref_dpi)

    print(f"Imagen guardada como {output_image_path} con tamaño {ref_size} y DPI {ref_dpi}")

# Ejemplo de uso
resize_and_set_dpi('imagen_origen.jpg', 'imagen_referencia.jpg', 'imagen_adaptada.jpg')
