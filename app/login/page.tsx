"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/layout/Container";
import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/Input";
import Form from "@/components/ui/Form";
import Label from "@/components/ui/Label";
import Div from "@/components/ui/Div";
import Alert from "@/components/ui/Alert";
import { authApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin()) {
      router.push("/admin");
    }
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

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      document.cookie = `token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`;
      
      router.push("/admin");
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
        justify="center"
        align="center"
        gap="4"
        className="min-h-[60vh]"
      >
        <Box display="flex" direction="col" gap="2" className="w-full max-w-md">
          <Typography variant="h2" uppercase={true} align="center">
            Iniciar Sesión
          </Typography>

          <Form onSubmit={handleSubmit} spacing="md" mt={4}>
            <Div spacing="md">
              <Label htmlFor="email" display="block" spacing="sm">
                <Typography variant="body2" mb={1}>
                  Email
                </Typography>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                />
              </Label>
            </Div>

            <Div spacing="md">
              <Label htmlFor="password" display="block" spacing="sm">
                <Typography variant="body2" mb={1}>
                  Contraseña
                </Typography>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </Label>
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
