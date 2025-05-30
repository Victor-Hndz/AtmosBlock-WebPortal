# TFM – Web Application for Atmospheric Blocking Analysis

Este proyecto corresponde al Trabajo Fin de Máster (TFM) titulado: **Desarrollo Full-stack de un
Portal Web para el Análisis de Bloqueos Atmosféricos** y proporciona una solución completa para la visualización, análisis y generación de datos relacionados con bloqueos atmosféricos utilizando microservicios, Docker y fuentes de datos climáticos como Copernicus.

---

## 🔑 Obtención del Token de Acceso a Copernicus (CDSAPI\_KEY)

Para poder descargar datos desde el Climate Data Store (CDS) de Copernicus, es necesario disponer de una clave API válida. Sigue los pasos a continuación:

1. Accede al sitio web: [https://cds.climate.copernicus.eu](https://cds.climate.copernicus.eu)
2. Inicia sesión o regístrate gratuitamente.
3. Dirígete a tu perfil: [https://cds.climate.copernicus.eu/profile](https://cds.climate.copernicus.eu/profile)
4. Desplázate hasta la sección **API Token**.
5. Copia el token proporcionado (tendrá el formato: `8-4-4-4-12` caracteres).
6. Abre el archivo `.env` ubicado en la raíz del proyecto.
7. Sustituye el valor `YOUR-CDS-API-KEY` en la variable `CDSAPI_KEY` por tu token personal, de la siguiente forma:

   ```env
   CDSAPI_KEY="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

## 🚀 Comandos para ejecución

### 🛠️ Lanzamiento general (requiere `sudo`)

- **Ejecutar la aplicación completa**:
  ```bash
  ./launch_app.sh
  ```

- **Lanzamiento con limpieza previa de contenedores y caché**:
  ```bash
  ./launch_app.sh --clean
  ```

- **Eliminar contenedores de Docker**:
  ```bash
  ./docker_cleanup.sh
  ```

- **Eliminar contenedores y volúmenes**:
  ```bash
  ./docker_cleanup.sh --volumes
  ```

---

### ⚙️ Lanzamiento sin `sudo`

- **Construir y ejecutar solo el frontend**:
  ```bash
  ./frontend_build
  ```

- **Generar archivos .env (Sólo la primera vez)**
  ```bash
  ./generate_env.sh
  ```

---

## 📦 Requisitos previos

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- Acceso a la API de Copernicus (`CDSAPI_KEY`)
- Permisos de ejecución para los scripts:
  ```bash
  chmod +x nombre_script.sh
  ```

---

## 📬 Contacto

Para dudas, sugerencias o contribuciones, puedes contactar con el autor del TFM [Víctor](mailto:vic.hernandezs08@gmail.com) o consultar la documentación técnica incluida en este repositorio.

