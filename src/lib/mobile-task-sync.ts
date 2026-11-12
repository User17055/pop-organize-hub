import { parseTaskDuration } from "./task-duration";

/** Fields which must move together when reconciling a device with the server. */
export const mobileTaskFieldGroups = [
  ["title"], ["description"], ["priority"], ["completed"], ["reminder"],
  ["dueDate", "dueLabel"], ["dueTime"], ["duration"], ["checklist"],
  ["department", "assignee", "assignmentType", "assignmentTargetId", "assignmentTargetLabel", "assignees"],
  ["recurrence", "recurrenceRule", "recurrenceDetail", "recurrenceInterval", "recurrenceEndMode", "recurrenceEndValue", "recurrenceTimes"],
  ["attachmentName", "attachmentUri", "attachmentMimeType", "attachmentData"],
] as const;

type Fields = Record<string, unknown>;
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return JSON.stringify(Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)),
  ));
  return JSON.stringify(value ?? "");
}
function sameGroup(first: object, second: object, group: readonly string[]) {
  const a = first as Fields, b = second as Fields;
  const comparable = (key: string, value: unknown) => {
    if (key === "duration") return parseTaskDuration(String(value ?? ""));
    if (key === "title" || key === "description") return String(value ?? "").trim();
    if (key === "reminder" && ["Sem lembrete", "Sem notificação"].includes(String(value))) return "";
    return value;
  };
  // dueLabel is presentation text, not a second version of the date.
  return group.filter((key) => key !== "dueLabel").every((key) => stable(comparable(key, a[key])) === stable(comparable(key, b[key])));
}
export function changedMobileTaskFields(base: object, local: object): string[] {
  return mobileTaskFieldGroups.flatMap((group) => sameGroup(base, local, group) ? [] : [...group]);
}

/** Three-way merge: unrelated remote edits survive; competing edits fail atomically. */
export function reconcileMobileTask<T extends object>(base: T, local: T, remote: T, policy: "conflict" | "arrival" = "conflict"): T {
  const result = { ...remote };
  for (const group of mobileTaskFieldGroups) {
    if (sameGroup(base, local, group)) continue;
    if (policy === "conflict" && !sameGroup(base, remote, group) && !sameGroup(local, remote, group)) {
      throw Object.assign(new Error("Esta tarefa foi alterada em outro aparelho ou no site. Atualize e revise a alteração pendente."), {
        statusCode: 409, fields: [...group],
      });
    }
    for (const key of group) (result as Fields)[key] = (local as Fields)[key];
  }
  return result;
}

/** Arrival order applies explicit edits while preserving unrelated rows created elsewhere. */
export function reconcileMobileOrganization<T extends { folders: Array<{ id: string; name: string; parentId?: string; position: number }>;
  lists: Array<{ id: string; name: string; folderId?: string; taskIds: string[]; position: number }> }>(base: T, local: T, remote: T): T {
  function rows<R extends {id: string}>(before: R[], desired: R[], current: R[], fields: Array<keyof R>): R[] {
    const original = new Map(before.map(row => [row.id,row]));
    const incoming = new Map(desired.map(row => [row.id,row]));
    const result = current.flatMap(row => {
      const old = original.get(row.id), change = incoming.get(row.id);
      if (old && !change) return [];
      if (!old || !change) return [row];
      const next = {...row};
      for (const field of fields) if (stable(old[field]) !== stable(change[field])) next[field] = change[field];
      return [next];
    });
    const present = new Set(current.map(row => row.id));
    return [...result,...desired.filter(row => !original.has(row.id) && !present.has(row.id))];
  }
  return {...remote, folders: rows(base.folders,local.folders,remote.folders,["name","parentId","position"]),
    lists: rows(base.lists,local.lists,remote.lists,["name","folderId","taskIds","position"])};
}
