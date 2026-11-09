import type { Database } from "./database";
import { invalidateNativeShadow } from "./native-shadow";
import { canDeleteDepartment } from "./permissions";

export type DepartmentRemovalResult =
  { ok: true } | { ok: false; status: 403 | 404 | 409; message: string };

/**
 * Exclusão de setor. O painel e o endpoint móvel chamam esta função, para a regra não existir em
 * duas versões; cada um transforma a recusa no próprio tipo de erro.
 */
export function removeDepartment(
  workspace: Database,
  departmentId: string,
  currentUser: Database["employees"][number] | undefined,
): DepartmentRemovalResult {
  const department = workspace.departments.find((item) => item.id === departmentId);
  if (!department) return { ok: false, status: 404, message: "Setor não encontrado." };
  if (
    !canDeleteDepartment({
      department,
      currentUser,
      employees: workspace.employees,
      departments: workspace.departments,
      permissionGroups: workspace.permissionGroups,
    })
  ) {
    return {
      ok: false,
      status: 403,
      message: "Seu grupo de permissão não pode excluir setores.",
    };
  }

  // Toda pessoa e todo convite precisam de um setor (`departmentId` é obrigatório). Excluir
  // deixaria essas linhas apontando para o nada, então a escolha de para onde vão é de quem
  // administra, antes de excluir.
  const people =
    workspace.employees.filter((employee) => employee.departmentId === departmentId).length +
    workspace.invitations.filter((invitation) => invitation.departmentId === departmentId).length;
  if (people > 0) {
    return {
      ok: false,
      status: 409,
      message:
        people === 1
          ? "Este setor ainda tem 1 pessoa. Mova-a para outro setor antes de excluir."
          : `Este setor ainda tem ${people} pessoas. Mova-as para outro setor antes de excluir.`,
    };
  }

  workspace.departments = workspace.departments.filter((item) => item.id !== departmentId);
  for (const employee of workspace.employees) {
    if (employee.visibleDepartmentIds?.includes(departmentId)) {
      employee.visibleDepartmentIds = employee.visibleDepartmentIds.filter(
        (id) => id !== departmentId,
      );
    }
  }
  // Tarefa do setor passa para a empresa, como já acontece com grupo excluído.
  for (const task of workspace.tasks) {
    if (task.target.type !== "department" || task.target.id !== departmentId) continue;
    task.target = { type: "company", id: workspace.company.id, label: workspace.company.name };
    invalidateNativeShadow(task, "target");
  }
  return { ok: true };
}
