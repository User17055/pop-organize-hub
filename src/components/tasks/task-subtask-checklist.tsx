import { useState, type KeyboardEvent } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TaskSubtask } from "@/lib/domain";

export function TaskSubtaskChecklist({
  subtasks,
  canToggle,
  canEdit,
  onAdd,
  onToggle,
  onDelete,
  isAdding,
}: {
  subtasks: TaskSubtask[];
  canToggle: boolean;
  canEdit: boolean;
  onAdd: (title: string) => void;
  onToggle: (subtaskId: string, done: boolean) => void;
  onDelete: (subtaskId: string) => void;
  isAdding: boolean;
}) {
  const [title, setTitle] = useState("");
  const done = subtasks.filter((item) => item.done).length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function submitNewItem() {
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitNewItem();
    }
  }

  return (
    <section className="rounded-[16px] bg-muted/24 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <ListChecks className="h-3.5 w-3.5" />
          Checklist
        </div>
        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
          {done}/{total}
        </span>
      </div>

      {total > 0 && (
        <div className="mb-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {subtasks.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/40"
          >
            <Checkbox
              checked={item.done}
              disabled={!canToggle}
              onCheckedChange={(checked) => onToggle(item.id, checked === true)}
            />
            <span
              className={cn(
                "flex-1 min-w-0 truncate text-xs",
                item.done && "line-through text-muted-foreground",
              )}
            >
              {item.title}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remover item ${item.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {total === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">Nenhum item no checklist.</p>
        )}
      </div>

      {(canToggle || canEdit) && (
        <div className="mt-2.5 flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar item..."
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-primary transition"
          />
          <button
            type="button"
            onClick={submitNewItem}
            disabled={isAdding || !title.trim()}
            className="h-9 w-9 rounded-md bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center hover:bg-primary/90 transition shrink-0"
            aria-label="Adicionar item ao checklist"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
