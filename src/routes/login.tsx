import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { login, loginWithGoogle } from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey } from "@/lib/api/use-workspace";

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: Record<string, string | number | boolean>,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

function GoogleLoginButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled: boolean;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) return;

    function renderButton() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => callbackRef.current(credential),
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        locale: "pt-BR",
        width: Math.min(buttonRef.current.clientWidth || 352, 352),
      });
    }

    if (window.google) {
      renderButton();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", renderButton, { once: true });
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", renderButton, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", renderButton);
  }, [clientId]);

  if (!clientId) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white text-sm font-semibold text-[#202124] opacity-70 shadow-sm"
        >
          <span className="flex items-center gap-0.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC05]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
          </span>
          Continuar com Google
        </button>
      </div>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <div ref={buttonRef} className="flex min-h-12 w-full justify-center overflow-hidden" />
    </div>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar - Pop Organize" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) => login({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/" });
    },
  });
  const googleMutation = useMutation({
    mutationFn: (credential: string) => loginWithGoogle({ data: { credential } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/" });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const errorMessage =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : googleMutation.error instanceof Error
        ? googleMutation.error.message
        : null;
  const isPending = loginMutation.isPending || googleMutation.isPending;

  return (
    <main className="login-screen relative min-h-screen overflow-x-hidden bg-background px-4 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:justify-center">
      <section className="login-card-enter relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/55 shadow-[0_28px_90px_-32px_hsl(var(--primary)/0.5)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]">
        <aside
          className="relative hidden min-h-[660px] overflow-hidden p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/20 bg-white/10 blur-sm" />
          <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-2xl" />

          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/30 bg-white/20 shadow-lg backdrop-blur-md">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-none">Pop Organize</p>
              <p className="mt-1 text-xs text-white/70">Seu trabalho, em ordem.</p>
            </div>
          </div>

          <div className="relative">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> Simples, rápido e organizado
            </span>
            <h1 className="max-w-sm font-display text-4xl font-bold leading-[1.12]">
              Tudo o que sua equipe precisa, em um só lugar.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
              Acompanhe tarefas, prazos e pessoas com clareza — sem complicação.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Rotina organizada por setores e grupos",
                "Prazos e prioridades sempre visíveis",
                "Acesso seguro para cada colaborador",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-white/90"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/55">© 2026 Pop Organize</p>
        </aside>

        <div className="relative flex min-h-[calc(100vh-2.5rem)] items-center justify-center p-5 pt-16 sm:min-h-[650px] sm:p-10 sm:pt-16 lg:min-h-[660px] lg:p-12 lg:pt-20">
          <Link
            to="/"
            className="absolute left-5 top-5 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary sm:left-8 sm:top-7"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="w-full max-w-[390px]">
            <div className="text-center lg:text-left">
              <p className="text-sm leading-6 text-muted-foreground">
                Entre para acessar seu espaço de trabalho.
              </p>
            </div>

            <div className="mt-7">
              <GoogleLoginButton
                onCredential={(credential) => googleMutation.mutate(credential)}
                disabled={isPending}
              />
            </div>

            <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-px flex-1 bg-border/80" />
              ou use seu e-mail
              <span className="h-px flex-1 bg-border/80" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-foreground">E-mail</span>
                <div className="group flex h-12 items-center rounded-2xl border border-border/90 bg-white/70 px-4 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/65"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-foreground">Senha</span>
                <div className="group flex h-12 items-center gap-3 rounded-2xl border border-border/90 bg-white/70 px-4 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/65"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="rounded-lg p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" />
                  Lembrar de mim
                </label>
                <button
                  type="button"
                  className="font-semibold text-primary transition hover:text-primary/75"
                >
                  Esqueci a senha
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                disabled={isPending}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_14px_35px_-12px_hsl(var(--primary)/0.75)] active:translate-y-0 active:scale-[0.97] active:shadow-sm disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                  </>
                ) : (
                  <>
                    Entrar na minha conta
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 border-t border-border/70 pt-6 text-center">
              <p className="text-xs leading-5 text-muted-foreground">
                Não faz parte de uma equipe? Você pode usar o aplicativo normalmente.
              </p>
              <Link
                to="/"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-5 text-sm font-semibold text-primary transition hover:bg-primary/10"
              >
                Continuar sem login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
