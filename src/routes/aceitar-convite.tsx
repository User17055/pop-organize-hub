import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  acceptInvitation,
  getInvitationPreview,
  requestInvitationCode,
} from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey } from "@/lib/api/use-workspace";

export const Route = createFileRoute("/aceitar-convite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Aceitar convite - Pop Organize" }] }),
  component: AcceptInvitationPage,
});

const inputClass =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-center font-display text-xl font-bold tracking-[0.4em] outline-none focus:border-primary";
const buttonClass =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function AcceptInvitationPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");

  const preview = useQuery({
    queryKey: ["invitation-preview", token],
    queryFn: () => getInvitationPreview({ data: { token } }),
    enabled: token.length >= 20,
    retry: false,
  });

  const requestCode = useMutation({
    mutationFn: () => requestInvitationCode({ data: { token } }),
    onSuccess: () => {
      setNotice(codeSent ? "Enviamos um código novo." : "");
      setCodeSent(true);
    },
  });

  const accept = useMutation({
    mutationFn: (withCode: boolean) =>
      acceptInvitation({ data: withCode ? { token, code } : { token } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/" });
    },
  });

  function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    accept.mutate(true);
  }

  const info = preview.data;
  const error = errorText(accept.error) || errorText(requestCode.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-card/90 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Aceitar convite</h1>

        {token.length < 20 ? (
          <p className="mt-2 text-sm text-destructive">O link do convite está incompleto.</p>
        ) : preview.isPending ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : preview.isError || !info ? (
          <p className="mt-2 text-sm text-destructive">
            {errorText(preview.error) || "Este convite é inválido ou expirou."}
          </p>
        ) : info.signedInAsInvited ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Você foi convidado para a equipe <strong>{info.companyName}</strong> e já está
              conectado com {info.maskedEmail}.
            </p>
            {error && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => accept.mutate(false)}
              disabled={accept.isPending}
              className={`${buttonClass} mt-6`}
            >
              {accept.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {accept.isPending ? "Entrando na equipe..." : "Aceitar convite"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Você foi convidado para a equipe <strong>{info.companyName}</strong>. Para entrar,
              confirme o e-mail {info.maskedEmail} com um código de 6 números. Não é preciso criar
              senha.
            </p>
            {info.signedInAsOther && (
              <p className="mt-2 text-xs text-muted-foreground">
                Este navegador está conectado com outra conta. Ao confirmar o código, você passa a
                usar a conta do convite.
              </p>
            )}

            {!codeSent ? (
              <button
                type="button"
                onClick={() => requestCode.mutate()}
                disabled={requestCode.isPending}
                className={`${buttonClass} mt-6`}
              >
                {requestCode.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {requestCode.isPending ? "Enviando..." : "Enviar código"}
              </button>
            ) : (
              <form onSubmit={handleCodeSubmit} className="mt-6 space-y-4">
                <label className="block space-y-1.5 text-sm font-medium">
                  Código enviado para {info.maskedEmail}
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    pattern="\d{6}"
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={accept.isPending || code.length !== 6}
                  className={buttonClass}
                >
                  {accept.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {accept.isPending ? "Entrando na equipe..." : "Aceitar convite"}
                </button>
                <button
                  type="button"
                  onClick={() => requestCode.mutate()}
                  disabled={requestCode.isPending}
                  className="w-full text-center text-sm font-medium text-primary disabled:opacity-60"
                >
                  Reenviar código
                </button>
              </form>
            )}

            {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
            {error && (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </>
        )}

        <div className="mt-5 text-center text-sm text-muted-foreground">
          O e-mail do convite é uma conta Google?{" "}
          <Link to="/login" className="font-medium text-primary">
            Entrar com Google
          </Link>
        </div>
      </div>
    </main>
  );
}
