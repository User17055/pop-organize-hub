import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  ListPlus,
  ListTodo,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  createTaskFolder,
  createTaskListDefinition,
  deleteTaskOrganizerItem,
  updateTaskListTasks,
} from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey } from "@/lib/api/use-workspace";
import type { Task, TaskFolder, TaskListDefinition, WorkspaceData } from "@/lib/domain";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type CreateTarget =
  | { kind: "group" }
  | { kind: "subgroup"; parentId: string }
  | { kind: "list"; folderId: string };

function todayIso() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function taskTimeLabel(task: Task) {
  const today = todayIso();
  if (task.dueDate < today) return "Atrasada";
  if (task.dueDate === today) return "Hoje";
  return "Próxima";
}

function listCounts(list: TaskListDefinition, tasks: Task[]) {
  const today = todayIso();
  const selected = tasks.filter(
    (task) => list.taskIds.includes(task.id) && task.status !== "completed",
  );
  return {
    total: selected.length,
    overdue: selected.filter((task) => task.dueDate < today).length,
    today: selected.filter((task) => task.dueDate === today).length,
    upcoming: selected.filter((task) => task.dueDate > today).length,
  };
}

export function TaskOrganizerSheet({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WorkspaceData;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [newName, setNewName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const folders = data.taskFolders;
  const lists = data.taskLists;
  const rootFolders = useMemo(() => folders.filter((folder) => !folder.parentId), [folders]);
  const editingList = lists.find((list) => list.id === editingListId) ?? null;

  useEffect(() => {
    if (!open) return;
    setExpandedFolders(new Set(rootFolders.map((folder) => folder.id)));
  }, [open, rootFolders]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
  };
  const createFolderMutation = useMutation({
    mutationFn: (input: { name: string; parentId?: string }) => createTaskFolder({ data: input }),
    onSuccess: refresh,
  });
  const createListMutation = useMutation({
    mutationFn: (input: { name: string; folderId?: string }) =>
      createTaskListDefinition({ data: input }),
    onSuccess: refresh,
  });
  const updateTasksMutation = useMutation({
    mutationFn: (input: { listId: string; taskIds: string[] }) =>
      updateTaskListTasks({ data: input }),
    onSuccess: async () => {
      await refresh();
      setEditingListId(null);
      toast.success("Tarefas da lista atualizadas.");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (input: { kind: "folder" | "list"; id: string }) =>
      deleteTaskOrganizerItem({ data: input }),
    onSuccess: refresh,
  });

  function toggleFolder(id: string) {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function beginCreate(target: CreateTarget) {
    setCreateTarget(target);
    setNewName("");
  }

  async function submitCreate() {
    const name = newName.trim();
    if (name.length < 2 || !createTarget) return;
    try {
      if (createTarget.kind === "list") {
        await createListMutation.mutateAsync({ name, folderId: createTarget.folderId });
      } else {
        await createFolderMutation.mutateAsync({
          name,
          parentId: createTarget.kind === "subgroup" ? createTarget.parentId : undefined,
        });
      }
      setCreateTarget(null);
      setNewName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    }
  }

  function openTaskSelection(list: TaskListDefinition) {
    setEditingListId(list.id);
    setSelectedTaskIds(new Set(list.taskIds));
  }

  function openList(list: TaskListDefinition) {
    onOpenChange(false);
    navigate({ to: "/tarefas", search: { lista: list.id } });
  }

  function renderList(list: TaskListDefinition, nested = false) {
    const counts = listCounts(list, data.tasks);
    return (
      <div
        key={list.id}
        className={cn(
          "group/list flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-primary/[0.07]",
          nested && "ml-5 border-l border-border/70 pl-3",
        )}
      >
        <button
          type="button"
          onClick={() => openList(list)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ListTodo className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">{list.name}</span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{counts.total}</span>
        </button>
        <button
          type="button"
          onClick={() => openTaskSelection(list)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
          aria-label={`Selecionar tarefas de ${list.name}`}
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Excluir a lista ${list.name}?`))
              deleteMutation.mutate({ kind: "list", id: list.id });
          }}
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/list:flex"
          aria-label={`Excluir ${list.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  function renderFolder(folder: TaskFolder, isSubgroup = false) {
    const expanded = expandedFolders.has(folder.id);
    const childFolders = folders.filter((candidate) => candidate.parentId === folder.id);
    const childLists = lists.filter((list) => list.folderId === folder.id);
    return (
      <div key={folder.id} className={cn(isSubgroup && "ml-5 border-l border-border/70 pl-2")}>
        <div className="group/folder flex items-center gap-1 rounded-xl px-1 py-1 hover:bg-muted/55">
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 text-left"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold">{folder.name}</span>
          </button>
          {!isSubgroup && (
            <button
              type="button"
              onClick={() => beginCreate({ kind: "subgroup", parentId: folder.id })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
              aria-label={`Criar subgrupo em ${folder.name}`}
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => beginCreate({ kind: "list", folderId: folder.id })}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
            aria-label={`Criar lista em ${folder.name}`}
          >
            <ListPlus className="h-4 w-4" />
          </button>
        </div>
        {expanded && (
          <div className="space-y-1 py-1">
            {childFolders.map((child) => renderFolder(child, true))}
            {childLists.map((list) => renderList(list, true))}
            {childFolders.length === 0 && childLists.length === 0 && (
              <p className="ml-9 py-1 text-xs text-muted-foreground">Grupo vazio</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex h-full w-[min(92vw,25rem)] flex-col overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/70 px-5 pb-4 pt-5 text-left">
          <SheetTitle>Organização</SheetTitle>
          <SheetDescription>Grupos, subgrupos e listas de tarefas</SheetDescription>
        </SheetHeader>

        {editingList ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            <button
              type="button"
              onClick={() => setEditingListId(null)}
              className="mb-3 w-fit text-xs font-semibold text-primary"
            >
              ← Voltar para as listas
            </button>
            <div className="mb-3">
              <h3 className="font-display text-base font-bold">{editingList.name}</h3>
              <p className="text-xs text-muted-foreground">
                Selecione as tarefas que devem aparecer nesta lista.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pb-20">
              {data.tasks.map((task) => {
                const selected = selectedTaskIds.has(task.id);
                return (
                  <button
                    type="button"
                    key={task.id}
                    onClick={() =>
                      setSelectedTaskIds((current) => {
                        const next = new Set(current);
                        if (next.has(task.id)) next.delete(task.id);
                        else next.add(task.id);
                        return next;
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left",
                      selected
                        ? "border-primary/25 bg-primary/10"
                        : "border-transparent bg-muted/35",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{task.title}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarClock className="h-3 w-3" /> {taskTimeLabel(task)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
              <button
                type="button"
                disabled={updateTasksMutation.isPending}
                onClick={() =>
                  updateTasksMutation.mutate({
                    listId: editingList.id,
                    taskIds: [...selectedTaskIds],
                  })
                }
                className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {updateTasksMutation.isPending ? "Salvando..." : "Salvar tarefas"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {rootFolders.map((folder) => renderFolder(folder))}
              {rootFolders.length === 0 && (
                <div className="mx-2 rounded-2xl border border-dashed border-border p-5 text-center">
                  <Folder className="mx-auto h-7 w-7 text-primary/60" />
                  <p className="mt-2 text-sm font-semibold">Crie seu primeiro grupo</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Depois adicione subgrupos, listas e escolha as tarefas.
                  </p>
                </div>
              )}
            </div>

            {createTarget && (
              <div className="border-t border-border/70 p-3">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitCreate();
                      if (event.key === "Escape") setCreateTarget(null);
                    }}
                    placeholder={createTarget.kind === "list" ? "Nome da lista" : "Nome do grupo"}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => void submitCreate()}
                    disabled={newName.trim().length < 2}
                    className="h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-40"
                  >
                    Criar
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-border/70 p-3">
              <button
                type="button"
                onClick={() => beginCreate({ kind: "group" })}
                className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-primary hover:bg-primary/10"
              >
                <Plus className="h-5 w-5" /> Novo grupo
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
