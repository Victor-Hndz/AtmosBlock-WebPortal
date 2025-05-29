#!/bin/bash
echo "📥 Descargando shapefiles de Cartopy en la ruta predeterminada..."

python3 -c "
import cartopy.io.shapereader as shpreader

# Solo combinaciones válidas
shpreader.natural_earth(resolution='110m', category='physical', name='coastline')
shpreader.natural_earth(resolution='110m', category='cultural', name='admin_0_boundary_lines_land')
"

echo "✅ Descarga de shapefiles completa."

