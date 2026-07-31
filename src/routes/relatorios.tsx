import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AccessRestricted } from "@/components/access-restricted";
import { ErrorState, LoadingState } from "@/components/data-state";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import { hasPermission, resolvePermissionSet } from "@/lib/permission-groups";
import { TrendingUp, Users, UserCheck, UserX, Clock } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios - Pop Organize" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data, isLoading, error } = useWorkspaceData();

  if (isLoading) {
    return (
      <AppShell title="Relatórios" subtitle="Carregando indicadores">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Relatórios" subtitle="Indicadores de produtividade da empresa">
        <ErrorState />
      </AppShell>
    );
  }

  const { tasks, departments, groups, employees, currentUser, permissionGroups } = data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });
  if (!hasPermission(permissionSet, "pages.reports")) {
    return (
      <AppShell title="Relatórios" subtitle="Indicadores de produtividade da empresa">
        <AccessRestricted requiredLabel="quem tem a permissão “Ver Relatórios”" />
      </AppShell>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDept = departments.map((d) => {
    const dt = tasks.filter((t) => t.target.type === "department" && t.target.id === d.id);
    return {
      ...d,
      total: dt.length,
      done: dt.filter((t) => t.status === "completed").length,
      late: dt.filter((t) => new Date(`${t.dueDate}T00:00:00`) < today && t.status !== "completed")
        .length,
    };
  });

  const byGroup = groups.map((group) => {
    const groupTasks = tasks.filter(
      (task) => task.target.type === "group" && task.target.id === group.id,
    );
    return {
      ...group,
      total: groupTasks.length,
      done: groupTasks.filter((task) => task.status === "completed").length,
      late: groupTasks.filter(
        (task) => new Date(`${task.dueDate}T00:00:00`) < today && task.status !== "completed",
      ).length,
      unassigned: groupTasks.filter(
        (task) => !task.responsibleId && !(task.responsibleIds ?? []).length,
      ).length,
    };
  });

  const taskResponsibleIds = (task: (typeof tasks)[number]) =>
    Array.from(new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean)));
  const assignedTasks = tasks.filter((task) => taskResponsibleIds(task).length > 0);
  const unassignedTasks = tasks.filter((task) => taskResponsibleIds(task).length === 0);

  const ranking = employees
    .map((e) => ({
      ...e,
      done: tasks.filter(
        (task) => taskResponsibleIds(task).includes(e.id) && task.status === "completed",
      ).length,
      total: tasks.filter((task) => taskResponsibleIds(task).includes(e.id)).length,
    }))
    .sort((a, b) => b.total - a.total || b.done - a.done);

  const completedTasks = tasks.filter((task) => task.status === "completed");
  const averageDays = completedTasks.length
    ? completedTasks.reduce((sum, task) => {
        const created = new Date(`${task.createdAt}T00:00:00`).getTime();
        const due = new Date(`${task.dueDate}T00:00:00`).getTime();
        return sum + Math.max(1, Math.round((due - created) / 86_400_000));
      }, 0) / completedTasks.length
    : 0;

  return (
    <AppShell title="Relatórios" subtitle="Indicadores de produtividade da empresa">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
            <h2 className="font-display font-semibold text-base">Tarefas por setor</h2>
          </div>
          <div className="space-y-5">
            {byDept.map((d) => {
              const pct = d.total ? (d.done / d.total) * 100 : 0;
              return (
                <div key={d.id}>
                  <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="truncate text-sm font-medium">{d.name}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
                      <span className="text-success">{d.done} concluídas</span>
                      {d.late > 0 && <span className="text-destructive">{d.late} atrasadas</span>}
                      <span className="text-muted-foreground">{d.total} total</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-4.5 w-4.5 text-primary" />
            <h2 className="font-display font-semibold text-base">Responsabilidade</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-success">
                <UserCheck className="h-4 w-4" />
                <span className="text-xs font-semibold">Com responsável</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{assignedTasks.length}</div>
            </div>
            <div className="rounded-xl bg-warning/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-warning">
                <UserX className="h-4 w-4" />
                <span className="text-xs font-semibold">Sem responsável</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{unassignedTasks.length}</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {tasks.length} atividades consideradas em toda a empresa.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4.5 w-4.5 text-primary" />
            <h2 className="font-display font-semibold text-base">Tarefas por grupo</h2>
          </div>
          <div className="space-y-5">
            {byGroup.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>
            )}
            {byGroup.map((group) => {
              const pct = group.total ? (group.done / group.total) * 100 : 0;
              return (
                <div key={group.id}>
                  <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="truncate text-sm font-medium">{group.name}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
                      <span className="text-success">{group.done} concluídas</span>
                      {group.late > 0 && (
                        <span className="text-destructive">{group.late} atrasadas</span>
                      )}
                      {group.unassigned > 0 && (
                        <span className="text-warning">{group.unassigned} sem responsável</span>
                      )}
                      <span className="text-muted-foreground">{group.total} total</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-4.5 w-4.5 text-primary" />
            <h2 className="font-display font-semibold text-base">Por responsável</h2>
          </div>
          <div className="space-y-3">
            {ranking.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-primary-foreground bg-primary">
                  {e.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{e.total}</div>
                  <div className="text-[10px] text-muted-foreground">{e.done} concluídas</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 lg:col-span-3">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tempo médio planejado</div>
              <div className="text-2xl font-display font-bold text-foreground">
                {averageDays.toFixed(1).replace(".", ",")} dias
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground max-w-md">
            Os indicadores são calculados diretamente das tarefas, setores e funcionários
            persistidos no backend local.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
