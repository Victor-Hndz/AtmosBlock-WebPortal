import React from "react";
import { MantineProvider } from "@mantine/core";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import NavigationMenu from "@components/NavigationMenu/NavigationMenu";
import Home from "@pages/home/homePage";
import theme from "@theme/theme";
import { AuthProvider } from "@context/AuthContext";

const App: React.FC = () => (
  <MantineProvider theme={theme}>
    <AuthProvider>
      <Router>
        <NavigationMenu />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          {/* <Route path="/about" element={<About />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/requestForm" element={<RequestForm />} /> */}
          {/* <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      /> */}
        </Routes>
      </Router>
    </AuthProvider>
  </MantineProvider>
);

export default App;
