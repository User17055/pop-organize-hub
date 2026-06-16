import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Pop Organize" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/" }), 600);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: gradient hero */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden p-12 flex-col justify-between text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)",
        }} />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display font-bold text-xl">Pop Organize</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-display font-bold leading-tight">
            Organize sua empresa de ponta a ponta.
          </h1>
          <p className="text-lg opacity-90 max-w-md">
            Tarefas, setores, grupos e equipes em uma única plataforma, simples e poderosa.
          </p>
          <ul className="space-y-2.5 max-w-md">
            {[
              "Atribua tarefas para empresa, setores ou grupos",
              "Fluxo de revisão e aprovação completo",
              "Dashboard com indicadores em tempo real",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm opacity-95">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-sm opacity-70">© 2026 Pop Organize</div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Pop Organize</span>
          </div>

          <h2 className="text-3xl font-display font-bold">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Entre na sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-foreground/70 mb-1.5 block">E-mail</span>
              <div className="flex items-center gap-2 px-3 h-11 rounded-lg bg-background border border-input focus-within:border-primary transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  defaultValue="joao@poporganize.com"
                  className="flex-1 bg-transparent outline-none text-sm"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/70 mb-1.5 block">Senha</span>
              <div className="flex items-center gap-2 px-3 h-11 rounded-lg bg-background border border-input focus-within:border-primary transition-colors">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  defaultValue="••••••••"
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
              <a href="#" className="text-primary font-medium hover:underline">Esqueci a senha</a>
            </div>
            <button
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition shadow-[var(--shadow-elegant)] inline-flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? "Entrando..." : (<>Entrar <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Não tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Criar agora</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
