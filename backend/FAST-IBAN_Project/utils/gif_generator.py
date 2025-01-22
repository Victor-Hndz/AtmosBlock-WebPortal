import cairosvg
import imageio.v2 as imageio
import os
import glob

def svg_to_png(svg_file, output_folder):
    # Convierte el archivo SVG a PNG
    png_file = os.path.join(output_folder, os.path.splitext(os.path.basename(svg_file))[0] + ".png")
    cairosvg.svg2png(url=svg_file, write_to=png_file)

    return png_file

def create_gif(png_files, output_gif):
    png_files.sort()
    images = []
    for png_file in png_files:
        images.append(imageio.imread(png_file))

    # Crea el GIF
    imageio.mimsave(output_gif, images, duration=500, loop=2)

    print("GIF creado exitosamente en:", output_gif)

def svg_to_gif_folder(input_folder, output_gif):
    # Carpeta temporal para archivos PNG
    temp_folder = os.path.join(input_folder, "gif/temp_png")
    # Verifica si existe la carpeta temporal
    if not os.path.exists(temp_folder):
        os.makedirs(temp_folder)

    # Encuentra todos los archivos en la carpeta de entrada
    files = glob.glob(os.path.join(input_folder, "*"))

    # Separa los archivos SVG y PNG
    svg_files = [file for file in files if file.lower().endswith('.svg')]
    png_files = [file for file in files if file.lower().endswith('.png')]

    # Si hay archivos PNG, crea el GIF directamente    
    if png_files:
        create_gif(png_files, output_gif)
    elif os.path.exists(temp_folder) and os.listdir(temp_folder):
        png_files = glob.glob(os.path.join(temp_folder, "*.png"))
        create_gif(png_files, output_gif)
    else:
        # Convierte todos los archivos SVG a PNG
        for svg_file in svg_files:
            print("Convirtiendo:", svg_file)
            png_file = svg_to_png(svg_file, temp_folder)
            png_files.append(png_file)

        # Crea el GIF
        create_gif(png_files, output_gif)

    # No se eliminan los archivos PNG temporales
    # Se mantiene la carpeta temporal para futuras conversiones

# Uso del código
# input_folder = "../out/"
# output_gif = "../out//gif/gif.gif"
# svg_to_gif_folder(input_folder, output_gif)
