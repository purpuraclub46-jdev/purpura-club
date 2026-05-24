import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { LogoMark } from "@/shared/components/brand/logo";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md glass">
      <CardHeader className="items-center gap-3 text-center">
        <LogoMark size={56} className="brand-glow rounded-xl" />
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Purpura Club
          </p>
          <CardTitle className="text-2xl">Acceso de administrador</CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta para gestionar sorteos, ecommerce y membresías.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
