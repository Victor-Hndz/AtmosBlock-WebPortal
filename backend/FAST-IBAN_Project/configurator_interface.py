import sys
import configparser
import yaml
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QLabel, QLineEdit, QPushButton, QComboBox, QCheckBox, QSpinBox, QGroupBox, QRadioButton, QHBoxLayout

class ConfigApp(QWidget):
    def __init__(self):
        super().__init__()

        self.init_ui()

    def init_ui(self):
        self.setWindowTitle('Generador de Configuración')
        self.setGeometry(100, 100, 600, 400)

        layout = QVBoxLayout()

        self.label_map_type = QLabel('Tipo de Mapa:')
        self.checkbox_contours = QCheckBox('Contornos')
        self.checkbox_scatter = QCheckBox('Dispersión')
        self.checkbox_combined = QCheckBox('Combinado')
        self.checkbox_combined_circles = QCheckBox('Combinado con Círculos')
        self.checkbox_selected = QCheckBox('De Seleccionados')

        self.groupbox_map_type = QGroupBox()
        layout_map_type = QVBoxLayout(self.groupbox_map_type)
        layout_map_type.addWidget(self.checkbox_contours)
        layout_map_type.addWidget(self.checkbox_scatter)
        layout_map_type.addWidget(self.checkbox_combined)
        layout_map_type.addWidget(self.checkbox_combined_circles)
        layout_map_type.addWidget(self.checkbox_selected)

        self.label_min_max_both = QLabel('Min/Máx/Ambos:')
        self.radio_min = QRadioButton('Mínimos')
        self.radio_max = QRadioButton('Máximos')
        self.radio_both = QRadioButton('Ambos')

        self.groupbox_min_max_both = QGroupBox()
        layout_min_max_both = QVBoxLayout(self.groupbox_min_max_both)
        layout_min_max_both.addWidget(self.radio_min)
        layout_min_max_both.addWidget(self.radio_max)
        layout_min_max_both.addWidget(self.radio_both)

        self.label_num_levels = QLabel('Número de Niveles:')
        self.spin_num_levels = QSpinBox()
        self.spin_num_levels.setRange(1, 100)

        self.label_time_instant = QLabel('Instante de Tiempo:')
        self.checkbox_time_00 = QCheckBox('00:00')
        self.checkbox_time_06 = QCheckBox('06:00')
        self.checkbox_time_12 = QCheckBox('12:00')
        self.checkbox_time_18 = QCheckBox('18:00')

        self.groupbox_time_instant = QGroupBox()
        layout_time_instant = QVBoxLayout(self.groupbox_time_instant)
        layout_time_instant.addWidget(self.checkbox_time_00)
        layout_time_instant.addWidget(self.checkbox_time_06)
        layout_time_instant.addWidget(self.checkbox_time_12)
        layout_time_instant.addWidget(self.checkbox_time_18)

        self.label_latitude_range = QLabel('Rango de Latitudes:')
        self.edit_latitude_min = QLineEdit()
        self.edit_latitude_max = QLineEdit()

        self.label_longitude_range = QLabel('Rango de Longitudes:')
        self.edit_longitude_min = QLineEdit()
        self.edit_longitude_max = QLineEdit()

        self.label_data_type = QLabel('Tipo:')
        self.radio_rex = QRadioButton('Rex')
        self.radio_omega = QRadioButton('Omega')

        self.groupbox_data_type = QGroupBox()
        layout_data_type = QVBoxLayout(self.groupbox_data_type)
        layout_data_type.addWidget(self.radio_rex)
        layout_data_type.addWidget(self.radio_omega)

        self.btn_generate = QPushButton('Generar Configuración')
        self.btn_generate.clicked.connect(self.generate_config)

        layout.addWidget(self.label_map_type)
        layout.addWidget(self.groupbox_map_type)
        layout.addWidget(self.label_min_max_both)
        layout.addWidget(self.groupbox_min_max_both)
        layout.addWidget(self.label_num_levels)
        layout.addWidget(self.spin_num_levels)
        layout.addWidget(self.label_time_instant)
        layout.addWidget(self.groupbox_time_instant)
        layout.addWidget(self.label_latitude_range)
        layout.addWidget(self.edit_latitude_min)
        layout.addWidget(self.edit_latitude_max)
        layout.addWidget(self.label_longitude_range)
        layout.addWidget(self.edit_longitude_min)
        layout.addWidget(self.edit_longitude_max)
        layout.addWidget(self.label_data_type)
        layout.addWidget(self.groupbox_data_type)
        layout.addWidget(self.btn_generate)

        self.setLayout(layout)

    def generate_config(self):
        selected_options = []

        if self.checkbox_contours.isChecked():
            selected_options.append('contornos')
        if self.checkbox_scatter.isChecked():
            selected_options.append('dispersión')
        if self.checkbox_combined.isChecked():
            selected_options.append('combinado')
        if self.checkbox_combined_circles.isChecked():
            selected_options.append('combinado con círculos')
        if self.checkbox_selected.isChecked():
            selected_options.append('de seleccionados')

        min_max_both = ''
        if self.radio_min.isChecked():
            min_max_both = 'mínimos'
        elif self.radio_max.isChecked():
            min_max_both = 'máximos'
        elif self.radio_both.isChecked():
            min_max_both = 'ambos'

        num_levels = self.spin_num_levels.value()

        selected_times = []
        if self.checkbox_time_00.isChecked():
            selected_times.append('00:00')
        if self.checkbox_time_06.isChecked():
            selected_times.append('06:00')
        if self.checkbox_time_12.isChecked():
            selected_times.append('12:00')
        if self.checkbox_time_18.isChecked():
            selected_times.append('18:00')

        latitude_min = self.edit_latitude_min.text()
        latitude_max = self.edit_latitude_max.text()
        longitude_min = self.edit_longitude_min.text()
        longitude_max = self.edit_longitude_max.text()

        data_type = ''
        if self.radio_rex.isChecked():
            data_type = 'rex'
        elif self.radio_omega.isChecked():
            data_type = 'omega'

        file_name = 'config'

        config_ini = configparser.ConfigParser()
        config_ini['OPTIONS'] = {
            'tipo_de_mapa': ', '.join(selected_options),
            'min_max_ambos': min_max_both,
            'num_niveles': str(num_levels),
            'instante_de_tiempo': ', '.join(selected_times),
            'rango_de_latitudes': f'{latitude_min} - {latitude_max}',
            'rango_de_longitudes': f'{longitude_min} - {longitude_max}',
            'tipo': data_type
        }

        with open(f'{file_name}.ini', 'w') as config_file:
            config_ini.write(config_file)

        config_yaml = {
            'OPTIONS': {
                'tipo_de_mapa': selected_options,
                'min_max_ambos': min_max_both,
                'num_niveles': num_levels,
                'instante_de_tiempo': selected_times,
                'rango_de_latitudes': {'min': latitude_min, 'max': latitude_max},
                'rango_de_longitudes': {'min': longitude_min, 'max': longitude_max},
                'tipo': data_type
            }
        }

        with open(f'{file_name}.yaml', 'w') as yaml_file:
            yaml.dump(config_yaml, yaml_file, default_flow_style=False)

        print('Configuraciones generadas exitosamente.')

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = ConfigApp()
    window.show()
    sys.exit(app.exec_())
