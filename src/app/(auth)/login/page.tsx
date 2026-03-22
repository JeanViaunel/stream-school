import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-muted/40 to-background p-4">
      <LoginForm />
    </main>
  );
}
