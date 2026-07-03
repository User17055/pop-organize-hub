import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import logo from "@/assets/logo.png";
import { login } from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey } from "@/lib/api/use-workspace";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar - Pop Organize" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("joao@poporganize.com");
  const [password, setPassword] = useState("demo1234");
  const loginMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) => login({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/" });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const errorMessage = loginMutation.error instanceof Error ? loginMutation.error.message : null;

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden p-12 flex-col justify-between text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, white 0%, transparent 42%), radial-gradient(circle at 85% 80%, white 0%, transparent 42%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Pop Organize" className="h-10 w-10 object-contain" />
            <span className="font-display font-bold text-xl">Pop Organize</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-display font-bold leading-tight">
            Organize sua empresa de ponta a ponta.
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-md">
            Tarefas, setores, grupos e equipes em uma única plataforma, simples e poderosa.
          </p>
          <ul className="space-y-2.5 max-w-md">
            {[
              "Atribua tarefas para empresa, setores ou grupos",
              "Filtros, checklist e calendário de vencimentos",
              "Fluxo de revisão e aprovação completo",
              "Dashboard com indicadores em tempo real",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-primary-foreground/95">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-sm text-primary-foreground/70">© 2026 Pop Organize</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <img src={logo} alt="Pop Organize" className="h-10 w-10 object-contain" />
            <span className="font-display font-bold text-xl">Pop Organize</span>
          </div>

          <h2 className="text-2xl font-display font-bold">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Entre na sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-foreground/70 mb-1.5 block">E-mail</span>
              <div className="flex items-center gap-2 px-3 h-10 rounded-md bg-background border border-input focus-within:border-primary transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/70 mb-1.5 block">Senha</span>
              <div className="flex items-center gap-2 px-3 h-10 rounded-md bg-background border border-input focus-within:border-primary transition-colors">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  required
                />
              </div>
            </label>
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-input accent-primary" />
                <span className="text-muted-foreground">Lembrar de mim</span>
              </label>
              <Link to="/login" className="text-primary font-medium hover:underline">
                Esqueci a senha
              </Link>
            </div>
            {errorMessage && <div className="text-sm text-destructive">{errorMessage}</div>}
            <button
              disabled={loginMutation.isPending}
              style={{ background: "var(--gradient-primary)" }}
              className="w-full h-10 rounded-xl text-primary-foreground font-medium text-sm hover:opacity-90 transition inline-flex items-center justify-center gap-2 disabled:opacity-70 shadow-[var(--shadow-elegant)]"
            >
              {loginMutation.isPending ? (
                "Entrando..."
              ) : (
                <>
                  Entrar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Demo: use <span className="font-medium text-foreground">joao@poporganize.com</span> e
            senha <span className="font-medium text-foreground">demo1234</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
