import { z } from "zod";
import type { Database } from "./database";
import { canViewTask } from "./permissions";
import { validatePopCallDraft } from "./pop-call-policy";
import { popDraftSchema, type PopTaskDraft, type PopWorkspaceContext } from "./pop-draft";
export const popChatSchema = z
  .object({
    message: z.string().trim().max(6000).default(""),
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
      .max(16)
      .default([]),
    attachments: z
      .array(z.object({ name: z.string().min(1).max(180), dataUrl: z.string().max(7_000_000) }))
      .max(3)
      .default([]),
    draft: popDraftSchema.nullable().optional(),
    sourceTaskId: z.string().max(200).nullable().optional(),
  })
  .refine(
    (value) => value.message.length > 0 || value.attachments.length > 0,
    "Escreva uma mensagem ou selecione um arquivo.",
  );

export const popChatResponseSchema = z.object({
  reply: z.string(),
  draft: popDraftSchema.nullable(),
  sourceTaskId: z.string().nullable(),
  missingFields: z.array(z.string()),
});
export const popTaskSearchSchema = z.object({
  query: z.string(),
  date: z.string().nullable(),
  status: z.enum(["pending", "completed", "all"]),
  limit: z.number().int().min(1).max(12),
  assignee: z.enum(["me", "my_team", "all"]).nullable().optional(),
  beforeDate: z.string().nullable().optional(),
  person: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable().optional(),
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional(),
});
export function popTaskIsMine(task: Database["tasks"][number], userId: string) {
  return (
    [task.responsibleId, ...(task.responsibleIds ?? [])].includes(userId) ||
    (task.target.type === "user" && task.target.id === userId)
  );
}
const failure = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

export function visiblePopTasks(workspace: Database, userId: string) {
  const currentUser = workspace.employees.find((person) => person.id === userId);
  return workspace.tasks.filter((task) =>
    canViewTask({
      task,
      currentUser,
      employees: workspace.employees,
      departments: workspace.departments,
      groups: workspace.groups,
      permissionGroups: workspace.permissionGroups,
    }),
  );
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const similarNameWord = (word: string, candidate: string) => {
  if (candidate.includes(word)) return true;
  if (word.length < 5 || Math.abs(word.length - candidate.length) > 1) return false;
  let previous = Array.from({ length: candidate.length + 1 }, (_, index) => index);
  for (let row = 1; row <= word.length; row++) {
    const current = [row];
    for (let col = 1; col <= candidate.length; col++)
      current[col] = Math.min(
        current[col - 1] + 1,
        previous[col] + 1,
        previous[col - 1] + (word[row - 1] === candidate[col - 1] ? 0 : 1),
      );
    previous = current;
  }
  return previous[candidate.length] <= 1;
};
function searchPopTasksBase(workspace: Database, userId: string, raw: unknown) {
  const input = popTaskSearchSchema.parse(raw);
  const user = workspace.employees.find((person) => person.id === userId);
  const departments = workspace.departments.filter(
    (item) =>
      item.id === user?.departmentId ||
      item.managerId === userId ||
      item.memberIds?.includes(userId),
  );
  const groups = workspace.groups.filter(
    (item) => item.leaderId === userId || item.memberIds.includes(userId),
  );
  const resolve = (
    items: Array<{ id: string; name: string }>,
    value?: string | null,
    mine: string[] = [],
  ) => {
    if (!value?.trim()) return null;
    if (["me", "mine", "my", "eu", "meu", "minha"].includes(normalize(value).trim())) return mine;
    const exact = items.filter(
      (item) => item.id === value || normalize(item.name) === normalize(value.trim()),
    );
    if (exact.length) return exact.map((item) => item.id);
    const words = normalize(value).split(/\s+/).filter(Boolean);
    return items
      .filter((item) =>
        words.every((word) =>
          normalize(item.name)
            .split(/\s+/)
            .some((candidate) => similarNameWord(word, candidate)),
        ),
      )
      .map((item) => item.id);
  };
  const peopleFilter = resolve(workspace.employees, input.person, [userId]);
  const departmentFilter = resolve(
    workspace.departments,
    input.department,
    departments.map((item) => item.id),
  );
  const groupFilter = resolve(
    workspace.groups,
    input.group,
    groups.map((item) => item.id),
  );
  const relations = (task: Database["tasks"][number]) => {
    const people = workspace.employees.filter((person) =>
      [
        task.responsibleId,
        ...(task.responsibleIds ?? []),
        ...(task.target.type === "user" ? [task.target.id] : []),
      ].includes(person.id),
    );
    const sectors = workspace.departments.filter(
      (item) =>
        (task.target.type === "department" && task.target.id === item.id) ||
        people.some((person) => person.departmentId === item.id),
    );
    const taskGroups = workspace.groups.filter(
      (item) => task.target.type === "group" && task.target.id === item.id,
    );
    return { people, sectors, taskGroups };
  };
  const relatedToTeam = (task: Database["tasks"][number]) => {
    if (popTaskIsMine(task, userId)) return false;
    if (task.target.type === "department" && departments.some((item) => item.id === task.target.id))
      return true;
    if (task.target.type === "group" && groups.some((item) => item.id === task.target.id))
      return true;
    return workspace.employees.some(
      (person) =>
        [
          task.responsibleId,
          ...(task.responsibleIds ?? []),
          ...(task.target.type === "user" ? [task.target.id] : []),
        ].includes(person.id) && departments.some((item) => item.id === person.departmentId),
    );
  };
  const stopWords = new Set([
    "a",
    "o",
    "as",
    "os",
    "de",
    "do",
    "da",
    "dos",
    "das",
    "para",
    "por",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "tarefa",
    "tarefas",
    "atividade",
    "atividades",
    "grupo",
    "setor",
    "responsavel",
    "colaborador",
    "colaboradora",
  ]);
  const tokens = normalize(input.query)
    .split(/[\s,;:!?]+/)
    .filter((word) => word && !stopWords.has(word));
  const titleQuery = tokens.join(" ");
  const relevance = (title: string) =>
    normalize(title).trim() === titleQuery ? 0 : normalize(title).startsWith(titleQuery) ? 1 : 2;
  const matches = visiblePopTasks(workspace, userId).filter((task) => {
    const related = relations(task);
    const text = normalize(
      [
        task.title,
        task.description,
        task.id,
        task.target.label,
        ...related.people.map((item) => item.name),
        ...related.sectors.map((item) => item.name),
        ...related.taskGroups.map((item) => item.name),
      ].join(" "),
    );
    return (
      (!input.date || task.dueDate === input.date) &&
      (!input.fromDate || task.dueDate >= input.fromDate) &&
      (!input.toDate || task.dueDate <= input.toDate) &&
      (!input.beforeDate || task.dueDate < input.beforeDate) &&
      (!input.priority || task.priority === input.priority) &&
      (peopleFilter === null ||
        related.people.some((person) => peopleFilter.includes(person.id))) &&
      (departmentFilter === null ||
        related.sectors.some((item) => departmentFilter.includes(item.id))) &&
      (groupFilter === null || related.taskGroups.some((item) => groupFilter.includes(item.id))) &&
      (input.assignee !== "me" || popTaskIsMine(task, userId)) &&
      (input.assignee !== "my_team" || relatedToTeam(task)) &&
      (input.status === "all" ||
        (input.status === "completed"
          ? task.status === "completed"
          : !["completed", "canceled"].includes(task.status))) &&
      tokens.every((token) => text.includes(token))
    );
  });
  return {
    total: matches.length,
    scope: input.assignee ?? "all",
    appliedFilters: {
      date: input.date,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      beforeDate: input.beforeDate ?? null,
      status: input.status,
      priority: input.priority ?? null,
      query: input.query,
      people:
        peopleFilter?.map((id) => workspace.employees.find((item) => item.id === id)?.name) ?? null,
      departments:
        departmentFilter?.map((id) => workspace.departments.find((item) => item.id === id)?.name) ??
        null,
      groups:
        groupFilter?.map((id) => workspace.groups.find((item) => item.id === id)?.name) ?? null,
    },
    unresolvedFilters: [
      peopleFilter?.length === 0 ? "person" : null,
      departmentFilter?.length === 0 ? "department" : null,
      groupFilter?.length === 0 ? "group" : null,
    ].filter(Boolean),
    ...(input.assignee === "my_team"
      ? {
          memberships: {
            departments: departments.map((item) => item.name),
            groups: groups.map((item) => item.name),
          },
          note: "Tarefas dos grupos/setores vinculados ao usuário, separadas das tarefas diretamente atribuídas a ele.",
        }
      : {}),
    tasks: matches
      .sort(
        (a, b) =>
          (tokens.length
            ? relevance(a.title) - relevance(b.title) || b.dueDate.localeCompare(a.dueDate)
            : 0) ||
          a.dueDate.localeCompare(b.dueDate) ||
          ["urgent", "high", "medium", "low"].indexOf(a.priority) -
            ["urgent", "high", "medium", "low"].indexOf(b.priority) ||
          (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99"),
      )
      .slice(0, input.limit)
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description.slice(0, 1600),
        priority: task.priority,
        status: task.status,
        completedBy:
          task.completedByName ||
          workspace.employees.find((person) => person.id === task.completedById)?.name ||
          null,
        completedAt: task.completedAt ?? null,
        dueDate: task.dueDate,
        dueTime: task.dueTime ?? null,
        durationMinutes: task.durationMinutes ?? null,
        responsible: workspace.employees
          .filter((person) =>
            [task.responsibleId, ...(task.responsibleIds ?? [])].includes(person.id),
          )
          .map((person) => person.name),
        target: task.target.label,
        responsibleDepartments: [
          ...new Set(
            workspace.employees
              .filter((person) =>
                [
                  task.responsibleId,
                  ...(task.responsibleIds ?? []),
                  ...(task.target.type === "user" ? [task.target.id] : []),
                ].includes(person.id),
              )
              .map(
                (person) =>
                  workspace.departments.find((item) => item.id === person.departmentId)?.name,
              )
              .filter(Boolean),
          ),
        ],
        recurring: Boolean(task.recurrence),
        checklist: (task.subtasks ?? []).map((item) => ({ title: item.title, done: item.done })),
        comments: (task.commentItems ?? []).slice(-10).map((item) => ({
          author:
            workspace.employees.find((person) => person.id === item.authorId)?.name ??
            "Colaborador",
          body: item.body.slice(0, 1200),
          createdAt: item.createdAt,
        })),
        attachments: (task.attachmentItems ?? []).map((item) => ({
          name: item.name,
          size: item.sizeLabel,
          createdAt: item.createdAt,
        })),
      })),
  };
}

export function searchPopTasks(workspace: Database, userId: string, raw: unknown) {
  const input = popTaskSearchSchema.parse(raw);
  const result = searchPopTasksBase(workspace, userId, input);
  return {
    ...result,
    ...(input.assignee === "me" && input.date && input.status === "pending" && result.total === 0
      ? { teamFallback: searchPopTasksBase(workspace, userId, { ...input, assignee: "my_team" }) }
      : {}),
  };
}

export function compactPopVoiceSearch(result: ReturnType<typeof searchPopTasks>) {
  const summarize = (source: ReturnType<typeof searchPopTasksBase>) => ({
    ...source,
    ...(source.memberships
      ? {
          memberships: {
            departments: source.memberships.departments
              .slice(0, 12)
              .map((name) => name.slice(0, 80)),
            groups: source.memberships.groups.slice(0, 12).map((name) => name.slice(0, 80)),
          },
        }
      : {}),
    tasks: source.tasks.slice(0, 6).map((task) => ({
      ...task,
      title: task.title.slice(0, 200),
      description: task.description.slice(0, 320),
      target: task.target.slice(0, 100),
      responsible: task.responsible.slice(0, 5).map((name) => name.slice(0, 80)),
      responsibleDepartments: task.responsibleDepartments
        .slice(0, 5)
        .map((name) => name?.slice(0, 80)),
      checklist: task.checklist
        .slice(0, 5)
        .map((item) => ({ ...item, title: item.title.slice(0, 100) })),
      comments: task.comments.slice(-2).map((item) => ({
        ...item,
        body: item.body.slice(0, 200),
        author: item.author.slice(0, 80),
      })),
      attachments: task.attachments
        .slice(0, 3)
        .map((item) => ({ ...item, name: item.name.slice(0, 100) })),
    })),
  });
  const output = {
    ...summarize(result),
    ...(result.teamFallback ? { teamFallback: summarize(result.teamFallback) } : {}),
  };
  // WebRTC tool messages must stay small; retain verified totals even for unusually long records.
  while (Buffer.byteLength(JSON.stringify(output), "utf8") > 24_000) {
    const tasks = output.teamFallback?.tasks.length ? output.teamFallback.tasks : output.tasks;
    if (!tasks.length) break;
    tasks.pop();
  }
  return output;
}

export function preparePopChatDraft(
  workspace: Database,
  context: PopWorkspaceContext,
  input: PopTaskDraft,
  missing: string[],
  date: string,
  sourceTaskId?: string | null,
) {
  let draft = structuredClone(input);
  // A company destination has exactly one valid id in this authenticated context.
  if (
    draft.targetType === "company" &&
    !draft.targetId &&
    !missing.some((field) => /destino|setor|grupo/i.test(field))
  )
    draft.targetId = context.company.id;
  if (sourceTaskId) {
    const source = visiblePopTasks(workspace, context.currentUser.id).find(
      (task) => task.id === sourceTaskId,
    );
    if (!source) throw failure("Atividade não encontrada neste espaço.", 404);
    // Improving content must not silently reassign the task or rebuild its recurrence.
    draft = {
      ...draft,
      targetType: source.target.type,
      targetId: source.target.id,
      responsibleId: source.responsibleId,
      requiresReview: source.requiresReview,
      reviewerId: source.reviewerId ?? null,
    };
    if (source.subtasks?.length)
      draft.checklist = (source.subtasks ?? []).map((item) => item.title);
  }
  const answer = validatePopCallDraft(draft, context, missing, date);
  return {
    ...answer,
    created: false,
    sourceTaskId: sourceTaskId ?? null,
    suggestionOnly: Boolean(sourceTaskId),
    preview: {
      responsible:
        context.employees.find(
          (person) =>
            person.id ===
            (answer.draft.targetType === "user"
              ? answer.draft.targetId
              : answer.draft.responsibleId),
        )?.name ?? (context.company.kind === "personal" ? context.currentUser.name : ""),
      target:
        answer.draft.targetType === "user"
          ? context.employees.find((item) => item.id === answer.draft.targetId)?.name
          : answer.draft.targetType === "department"
            ? context.departments.find((item) => item.id === answer.draft.targetId)?.name
            : answer.draft.targetType === "group"
              ? context.groups.find((item) => item.id === answer.draft.targetId)?.name
              : context.company.name,
      reviewer:
        context.employees.find((person) => person.id === answer.draft.reviewerId)?.name ?? null,
    },
  };
}

export function decodePopAttachment(file: { name: string; dataUrl: string }) {
  const name = file.name.replace(/[\\/\u0000-\u001f]/g, "_");
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const mime: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    json: "application/json",
    html: "text/html",
    xml: "application/xml",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const match = /^data:[a-z0-9.+/-]+;base64,([a-z0-9+/]*={0,2})$/i.exec(file.dataUrl);
  if (!mime[extension] || !match || match[1].length % 4 !== 0)
    throw failure(
      "Formato de arquivo não suportado. Use imagem, PDF, documento, planilha ou texto.",
    );
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw failure("Cada arquivo pode ter até 5 MB.", 413);
  return {
    name,
    dataUrl: `data:${mime[extension]};base64,${match[1]}`,
    image: mime[extension].startsWith("image/"),
    bytes: bytes.length,
  };
}
