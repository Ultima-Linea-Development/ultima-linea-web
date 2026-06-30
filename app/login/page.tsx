"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/layout/Container";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import Input, { InputAdornment } from "@/components/ui/Input";
import Form from "@/components/ui/Form";
import FormField from "@/components/ui/FormField";
import Div from "@/components/ui/Div";
import Alert from "@/components/ui/Alert";
import Icon from "@/components/ui/Icons";
import { authApi } from "@/lib/api";
import { isStaff, mustCompleteSetup, ONBOARDING_PATH, setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isStaff()) return;
    router.push(mustCompleteSetup() ? ONBOARDING_PATH : "/admin");
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });

      if (response.error || !response.data) {
        setError(response.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      setAuthSession(response.data.token, response.data.user);

      router.push(mustCompleteSetup() ? ONBOARDING_PATH : "/admin");
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  };

  return (
    <Container>
      <Box
        display="flex"
        direction="col"
        justify="start"
        align="center"
        gap="4"
      >
        <Box display="flex" direction="col" gap="2" className="w-full max-w-md">
          <Typography variant="h2" uppercase={true} align="center">
            Iniciar Sesión
          </Typography>

          <Form onSubmit={handleSubmit} spacing="md" mt={4}>
            <Div spacing="md">
              <FormField htmlFor="email" label="Email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>
            </Div>

            <Div spacing="md">
              <FormField htmlFor="password" label="Contraseña">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  width="full"
                  disabled={loading}
                  endIcon={
                    <InputAdornment
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading}
                    >
                      <Icon
                        name={showPassword ? "visibilityOff" : "visibility"}
                        className="size-5"
                      />
                    </InputAdornment>
                  }
                />
              </FormField>
            </Div>

            <Alert
              open={!!error}
              message={error}
              variant="destructive"
              onClose={() => setError("")}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </Form>
        </Box>
      </Box>
    </Container>
  );
}
