import styles from "@pages/home/homePage.module.css";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { Group, Text, ActionIcon } from "@mantine/core";

const NavigationMenu: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <nav className={styles.navbar}>
      <Group align="apart" className={styles.navGroup}>
        {/* Home Link */}
        <Link to="/" className={styles.navLink}>
          <Text size="lg">Home</Text>
        </Link>

        {/* Center Links */}
        {user && (
          <Link to="/profile" className={styles.navLink}>
            <Text size="lg">Profile</Text>
          </Link>
        )}

        {/* Auth Links */}
        {user ? (
          <Group>
            <Text size="md" c="dimmed">
              Welcome, {user.name}!
            </Text>
            <ActionIcon
              variant="filled"
              color="red"
              radius="xl"
              size="lg"
              onClick={handleLogout}
            ></ActionIcon>
          </Group>
        ) : (
          <Group>
            <Link to="/login" className={styles.navLink}>
              <Text size="lg">Login</Text>
            </Link>
            <Link to="/register" className={styles.navLink}>
              <Text size="lg">Register</Text>
            </Link>
          </Group>
        )}
      </Group>
    </nav>
  );
};

export default NavigationMenu;
