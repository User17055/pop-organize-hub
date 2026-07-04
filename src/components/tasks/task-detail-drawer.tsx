import type { ChangeEvent, FormEvent } from "react";
import {
  Calendar,
  Check,
  FileText,
  Flag,
  MessageSquare,
  Paperclip,
  Pencil,
  Repeat,
  Send,
  Tag,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, PriorityBadge } from "@/components/app-shell";
import type { Department, Employee, Priority, Task } from "@/lib/domain";
import { priorityLabels } from "@/lib/domain";
import type { TaskPermissions } from "@/lib/permissions";
import { EmployeeAvatar } from "./employee-avatar";
import { GlassDatePicker } from "./glass-date-picker";
import { GlassSelect, RecurrenceFields } from "./recurrence-fields";
import { TaskSubtaskChecklist } from "./task-subtask-checklist";
import {
  isOverdue,
  recurrenceLabel,
  recurrenceOptions,
  type RecurrenceFormState,
  type TaskEditState,
} from "./task-form-types";

export function TaskDetailDrawer({
  task,
  permissions,
  employees,
  departments,
  editForm,
  onEditFormChange,
  onSubmit,
  onClose,
  onToggleComplete,
  onDelete,
  isSaving,
  isDeleting,
  isStatusPending,
  commentBody,
  onCommentBodyChange,
  onCommentSubmit,
  isCommenting,
  onAttachmentFile,
  isAttaching,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  isAddingSubtask,
  errorMessage,
}: {
  task: Task;
  permissions: TaskPermissions;
  employees: Employee[];
  departments: Department[];
  editForm: TaskEditState;
  onEditFormChange: (updater: (current: TaskEditState) => TaskEditState) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  isStatusPending: boolean;
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onCommentSubmit: () => void;
  isCommenting: boolean;
  onAttachmentFile: (event: ChangeEvent<HTMLInputElement>) => void;
  isAttaching: boolean;
  subtasks: Task["subtasks"];
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtaskId: string, done: boolean) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  isAddingSubtask: boolean;
  errorMessage?: string | null;
}) {
  const getEmployee = (id?: string) => employees.find((employee) => employee.id === id);

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col overflow-hidden rounded-lg">
      {/* Sticky header */}
      <header className="glass-header sticky top-0 z-[60] border-b border-white/70 px-5 pb-4 pt-5">
        <div className="mb-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glass-icon-button flex h-8 w-8 items-center justify-center rounded-md text-foreground"
            aria-label="Fechar atividade"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={!permissions.canComplete || isStatusPending}
            onClick={onToggleComplete}
            className={cn(
              "mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center transition shrink-0 disabled:opacity-50",
              task.status === "completed"
                ? "bg-success border-success text-white"
                : "border-muted-foreground/40 hover:border-foreground",
            )}
            aria-label={task.status === "completed" ? "Reabrir" : "Concluir"}
          >
            {task.status === "completed" && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <input
              value={editForm.title}
              disabled={!permissions.canEditContent}
              onChange={(e) =>
                onEditFormChange((current) => ({ ...current, title: e.target.value }))
              }
              className={cn(
                "w-full text-[15px] font-display font-semibold bg-transparent border-b border-transparent focus:border-border outline-none transition text-foreground placeholder:text-muted-foreground leading-snug",
                task.status === "completed" && "line-through text-muted-foreground",
              )}
            />
            <div className="text-[11px] text-muted-foreground mt-1.5">
              {task.status === "completed"
                ? "Concluída"
                : `Criada em ${new Date(`${task.createdAt}T00:00:00`).toLocaleDateString("pt-BR")}`}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {isOverdue(task) && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive font-semibold">
              Atrasada
            </span>
          )}
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Notes */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <Pencil className="h-3.5 w-3.5" /> Notas
          </div>
          <textarea
            value={editForm.description}
            disabled={!permissions.canEditContent}
            onChange={(e) =>
              onEditFormChange((current) => ({ ...current, description: e.target.value }))
            }
            rows={3}
            placeholder="Adicionar uma nota..."
            className="w-full px-3.5 py-3 rounded-md bg-muted/30 border border-border/60 outline-none focus:border-primary focus:bg-background text-xs resize-none disabled:opacity-60 transition leading-relaxed"
            required
          />
        </div>

        {/* Details grid */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Detalhes
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Due date */}
            <div className="col-span-2 flex items-center gap-3 rounded-[14px] bg-muted/28 p-3 sm:col-span-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Prazo
                </div>
                {permissions.canEditContent ? (
                  <GlassDatePicker
                    value={editForm.dueDate}
                    onChange={(dueDate) => onEditFormChange((current) => ({ ...current, dueDate }))}
                    compact
                    ariaLabel="Prazo da tarefa"
                    required
                  />
                ) : (
                  <div className="text-xs font-semibold text-foreground mt-0.5">
                    {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div className="col-span-2 flex items-center gap-3 rounded-[14px] bg-muted/28 p-3 sm:col-span-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-success/10 text-success">
                <Repeat className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Recorrência
                </div>
                {permissions.canEditContent ? (
                  <div className="mt-1">
                    <GlassSelect
                      value={editForm.recurrence.frequency}
                      options={recurrenceOptions}
                      onChange={(frequency) =>
                        onEditFormChange((current) => ({
                          ...current,
                          recurrence: {
                            ...current.recurrence,
                            frequency: frequency as RecurrenceFormState["frequency"],
                          },
                        }))
                      }
                      compact
                    />
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                    {recurrenceLabel(task.recurrence)}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="col-span-2 flex items-center gap-3 rounded-[14px] bg-muted/28 p-3 sm:col-span-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-destructive/10 text-destructive">
                <Flag className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Prioridade
                </div>
                {permissions.canEditContent ? (
                  <GlassSelect
                    value={editForm.priority}
                    options={Object.entries(priorityLabels).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    onChange={(priority) =>
                      onEditFormChange((current) => ({
                        ...current,
                        priority: priority as Priority,
                      }))
                    }
                    compact
                  />
                ) : (
                  <div className="text-xs font-semibold text-foreground mt-0.5">
                    {priorityLabels[task.priority]}
                  </div>
                )}
              </div>
            </div>

            {/* Target */}
            <div className="col-span-2 flex items-center gap-3 rounded-[14px] bg-muted/28 p-3 sm:col-span-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/50 text-accent-foreground">
                <Target className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Destino
                </div>
                <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {task.target.label}
                </div>
              </div>
            </div>

            {/* Responsible */}
            <div className="col-span-2 flex items-center gap-3 rounded-[14px] bg-muted/28 p-3 sm:col-span-1">
              <EmployeeAvatar
                employee={getEmployee(task.responsibleId)}
                departments={departments}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Responsável
                </div>
                <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {getEmployee(task.responsibleId)?.name}
                </div>
              </div>
            </div>

            {/* Reviewer */}
            {task.reviewerId && (
              <div className="col-span-2 flex items-center gap-3 rounded-[14px] bg-muted/28 p-3 sm:col-span-1">
                <EmployeeAvatar employee={getEmployee(task.reviewerId)} departments={departments} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Revisor
                  </div>
                  <div className="text-xs font-semibold text-foreground mt-0.5 truncate">
                    {getEmployee(task.reviewerId)?.name}
                  </div>
                </div>
              </div>
            )}
          </div>

          {permissions.canEditContent && editForm.recurrence.frequency !== "none" && (
            <div className="mt-2 rounded-[14px] bg-muted/28 p-3">
              <RecurrenceFields
                compact
                value={editForm.recurrence}
                onChange={(recurrence) =>
                  onEditFormChange((current) => ({
                    ...current,
                    recurrence,
                  }))
                }
              />
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <Tag className="h-3.5 w-3.5" /> Tags
          </div>
          {permissions.canEditContent ? (
            <input
              value={editForm.tags}
              onChange={(e) =>
                onEditFormChange((current) => ({ ...current, tags: e.target.value }))
              }
              className="w-full h-9 px-3 rounded-md bg-muted/30 border border-border/60 outline-none focus:border-primary focus:bg-background text-xs transition"
              placeholder="Separadas por vírgula"
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.length > 0 ? (
                task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Nenhuma tag</span>
              )}
            </div>
          )}
        </div>

        {/* Checklist / Comments / Attachments */}
        <div className="space-y-4">
          <TaskSubtaskChecklist
            subtasks={subtasks ?? []}
            canToggle={permissions.canChangeStatus || permissions.canEditContent}
            canEdit={permissions.canEditContent}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
            isAdding={isAddingSubtask}
          />

          <section className="rounded-[16px] bg-muted/24 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentários
              </div>
              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                {task.comments}
              </span>
            </div>

            <div className="space-y-2">
              {(task.commentItems ?? []).map((comment) => {
                const author = getEmployee(comment.authorId);
                return (
                  <div key={comment.id} className="rounded-md bg-muted/30 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <EmployeeAvatar employee={author} departments={departments} size="sm" />
                        <span className="text-[11px] font-semibold text-foreground">
                          {author?.name ?? "Usuario"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{comment.body}</p>
                  </div>
                );
              })}
              {task.comments > (task.commentItems?.length ?? 0) && (
                <div className="rounded-[12px] bg-background/58 px-3 py-2.5 text-center text-xs text-muted-foreground">
                  {task.comments - (task.commentItems?.length ?? 0)} comentário
                  {task.comments - (task.commentItems?.length ?? 0) === 1 ? "" : "s"} no histórico.
                </div>
              )}
            </div>

            {permissions.canChangeStatus && (
              <div className="mt-3 flex gap-2">
                <input
                  value={commentBody}
                  onChange={(event) => onCommentBodyChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onCommentSubmit();
                    }
                  }}
                  placeholder="Escrever comentário..."
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-xs outline-none focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={onCommentSubmit}
                  disabled={isCommenting || !commentBody.trim()}
                  className="h-9 w-9 rounded-md bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center hover:bg-primary/90 transition shrink-0"
                  aria-label="Enviar comentário"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </section>

          <section className="rounded-[16px] bg-muted/24 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Paperclip className="h-3.5 w-3.5" />
                Anexos
              </div>
              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                {task.attachments}
              </span>
            </div>

            <div className="space-y-2">
              {(task.attachmentItems ?? []).map((attachment) => {
                const author = getEmployee(attachment.uploadedById);
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-[12px] bg-background/58 p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{attachment.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {attachment.sizeLabel} · {author?.name ?? "Usuario"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {task.attachments > (task.attachmentItems?.length ?? 0) && (
                <div className="rounded-[12px] bg-background/58 px-3 py-2.5 text-center text-xs text-muted-foreground">
                  {task.attachments - (task.attachmentItems?.length ?? 0)} anexo
                  {task.attachments - (task.attachmentItems?.length ?? 0) === 1 ? "" : "s"} no
                  histórico.
                </div>
              )}
            </div>

            {permissions.canChangeStatus && (
              <div className="mt-3">
                <label
                  className={cn(
                    "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-background/64 px-3 text-xs font-medium transition hover:bg-background hover:text-primary",
                    isAttaching && "pointer-events-none opacity-60",
                  )}
                >
                  <Paperclip className="h-4 w-4" />
                  {isAttaching ? "Anexando..." : "Adicionar arquivo"}
                  <input type="file" onChange={onAttachmentFile} className="sr-only" />
                </label>
              </div>
            )}
          </section>
        </div>

        {!permissions.canEditContent && (
          <p className="text-xs text-muted-foreground">
            Sua hierarquia permite alterar status/conclusão, mas não editar o texto.
          </p>
        )}
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {(permissions.canEditContent || permissions.canDelete) && (
        <footer className="task-detail-footer flex shrink-0 gap-2 border-t px-5 py-3">
          {permissions.canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-destructive/25 bg-destructive/5 text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
              aria-label="Excluir tarefa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {permissions.canEditContent && (
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 flex-1 rounded-[14px] bg-foreground text-sm font-bold text-background transition hover:bg-foreground/90 disabled:opacity-60"
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </footer>
      )}
    </form>
  );
}
