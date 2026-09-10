import type { Task } from "./domain";

/**
 * O endpoint móvel guarda em `task.nativeData` uma cópia crua do que o aplicativo enviou. Ela
 * existe porque o `Task` não representa tudo que o aplicativo tem — uma recorrência
 * "Personalizada", por exemplo, não tem equivalente em `TaskRecurrence` e se degradaria na volta.
 *
 * O preço é que `taskToMobileTask` devolve o `nativeData` COM PRECEDÊNCIA sobre o campo real.
 * Quando o painel edita a tarefa, o campo real muda e a cópia fica velha: o aplicativo continua
 * lendo o valor antigo e o devolve na sincronização seguinte, apagando a edição do painel.
 *
 * Só atinge tarefa criada no aplicativo, que é a única que tem `nativeData`.
 *
 * A saída não é inverter a precedência — isso é que degradaria o que o domínio não representa. É
 * invalidar na cópia apenas o que o painel acabou de reescrever, para a leitura seguinte cair no
 * campo real. Na sincronização seguinte o aplicativo reenvia e a cópia se refaz correta.
 */
const nativeShadowGroups = {
  /** sombreiam `task.dueDate` */
  dueDate: ["dueLabel"],
  /** sombreiam `task.target` */
  target: ["assignmentType", "assignmentTargetId", "assignmentTargetLabel"],
  /** sombreiam `task.responsibleId` e `task.responsibleIds` */
  responsible: ["assignees"],
  /** sombreiam `task.recurrence` */
  recurrence: [
    "recurrence",
    "recurrenceRule",
    "recurrenceDetail",
    "recurrenceInterval",
    "recurrenceEndMode",
    "recurrenceEndValue",
    "recurrenceTimes",
  ],
  /** sombreia `task.recurrenceOccurrence` */
  recurrenceOccurrence: ["recurrenceOccurrence"],
} as const;

export type NativeShadowGroup = keyof typeof nativeShadowGroups;

type TaskWithNativeData = Task & { nativeData?: Record<string, unknown> };

/**
 * Apaga da cópia crua os campos que o painel acabou de reescrever. Chamar sempre que uma função
 * do painel alterar `dueDate`, `target`, `responsibleId`/`responsibleIds`, `recurrence` ou
 * `recurrenceOccurrence` de uma tarefa.
 *
 * `dueTime`, `duration`, `attachmentName` e `reminder` não estão em grupo nenhum de propósito:
 * não têm campo real correspondente no `Task`, então apagá-los perderia dado que o painel não
 * sabe repor.
 */
export function invalidateNativeShadow(task: Task, ...groups: NativeShadowGroup[]) {
  const nativeData = (task as TaskWithNativeData).nativeData;
  if (!nativeData) return;
  for (const group of groups) {
    for (const field of nativeShadowGroups[group]) delete nativeData[field];
  }
}
