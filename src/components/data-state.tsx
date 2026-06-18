export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
        <span>{label}</span>
      </div>
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
