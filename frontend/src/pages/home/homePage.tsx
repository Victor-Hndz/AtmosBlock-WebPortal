import classes from "./homePage.module.css";
import { Container, Title, Text, Button, Group } from "@mantine/core";
import { useState } from "react";

const Home: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Bienvenido a nuestra plataforma!");
    }, 1500);
  };

  return (
    <div className={classes.wrapper}>
      <Container className={classes.container}>
        <Group className={classes.content}>
          <div>
            <Title order={1} className={classes.title}>
              Bienvenido a <span className={classes.highlight}>Nuestra Plataforma</span>
            </Title>
            <Text className={classes.description}>
              Explora, descubre y sumérgete en una experiencia única con nuestra plataforma. Diseñada para facilitar tu
              vida con tecnología de última generación.
            </Text>
            <Button size="lg" className={classes.button} onClick={handleClick} loading={loading}>
              ¡Empezar Ahora!
            </Button>
          </div>
          {/* <Image src="/hero-image.svg" alt="Hero" className={classes.image} /> */}
        </Group>
      </Container>
    </div>
  );
};

export default Home;
