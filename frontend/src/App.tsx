import AppRoutes from "@/routes";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/redux/hooks";

/**
 * Root application component
 * @returns The main application with internationalized routes
 */
function App() {
  const { i18n } = useTranslation();
  const { currentLanguage } = useAppSelector(state => state.language);

  // Sync language with Redux state
  useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  return <AppRoutes />;
}

export default App;
