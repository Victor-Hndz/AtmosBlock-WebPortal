import { createTheme } from "@mantine/core";

const theme = createTheme({
  /** 🎨 Colores personalizados */
  colors: {
    brand: [
      "#ebfbee", // Lightest
      "#d3f9d8",
      "#b2f2bb",
      "#8ce99a",
      "#69db7c",
      "#51cf66",
      "#40c057",
      "#37b24d",
      "#2f9e44",
      "#2b8a3e", // Darkest
    ],
  },

  /** 🏷️ Fuente personalizada */
  fontFamily: "Inter, sans-serif",

  /** 🌙 Soporte para modo oscuro */
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 8 }, // Diferente tonalidad en claro/oscuro

  /** 📐 Configuración de radio y espaciado */
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },

  /** 🌟 Estilos globales */
  headings: {
    fontFamily: "Poppins, sans-serif",
    sizes: {
      h1: { fontSize: "32px", fontWeight: "bold" },
      h2: { fontSize: "28px", fontWeight: "bold" },
      h3: { fontSize: "24px", fontWeight: "bold" },
    },
  },
});

export default theme;
