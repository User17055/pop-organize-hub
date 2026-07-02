import { ShieldAlert } from "lucide-react";

export function AccessRestricted({ requiredLabel }: { requiredLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="font-display text-lg font-semibold text-foreground">Acesso restrito</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Esta área é visível apenas para {requiredLabel}. Fale com o administrador da empresa se
        precisar de acesso.
      </p>
    </div>
  );
}
