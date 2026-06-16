export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function ErrorState({ label = "Não foi possível carregar os dados." }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-4 text-center text-sm text-destructive">
      {label}
    </div>
  );
}
