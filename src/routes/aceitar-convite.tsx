import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { acceptInvitation } from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey } from "@/lib/api/use-workspace";

export const Route = createFileRoute("/aceitar-convite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Aceitar convite - Pop Organize" }] }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const mutation = useMutation({
    mutationFn: () => acceptInvitation({ data: { token, password } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/" });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    if (!token) {
      setLocalError("O link do convite está incompleto.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("As senhas não coincidem.");
      return;
    }
    mutation.mutate();
  }

  const error = localError || (mutation.error instanceof Error ? mutation.error.message : "");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-card/90 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Crie sua senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você foi convidado para uma equipe no Pop Organize. A senha é pessoal e não será
          compartilhada com quem enviou o convite.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Confirmar senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
            />
          </label>

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || !token}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {mutation.isPending ? "Ativando conta..." : "Ativar minha conta"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          Já ativou sua conta?{" "}
          <Link to="/login" className="font-medium text-primary">
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
