'''
 print("\n[ ] Iniciando generación de mapas...")
        
        # GENERATE MAPS
        # Iterate over map types, ranges, and levels to generate maps
        for map_type in self.map_types:
            for map_range in self.map_ranges:
                for map_level in self.map_levels:
                    if map_type == DataType.TYPE_COMB:
                        gm.generate_contour_map()
                    elif map_type == DataType.TYPE_DISP:
                        gm.generate_scatter_map()
                    elif map_type == DataType.TYPE_COMB:
                        gm.generate_combined_map()
                    elif map_type == DataType.TYPE_FORMS:
                        gm.generate_formations_map()
'''