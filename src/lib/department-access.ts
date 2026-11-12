import type { Database } from "./database";

export type ManagerAccessMode = "own" | "selected" | "all";

export function isManagerAccessMode(value: unknown): value is ManagerAccessMode {
  return value === "own" || value === "selected" || value === "all";
}

/**
 * Grava até onde o gestor de um setor enxerga. O painel (criar e editar setor) e o endpoint móvel
 * chamam esta função, para que os dois lados não escrevam a mesma regra com palavras diferentes.
 *
 * "own": o setor dele e os que ele gerencia; "selected": esses mais os escolhidos; "all": todos.
 * A lista de escolhidos só vale em "selected"; nos outros modos ela é apagada.
 * A permissão (dono ou administrador) e a existência dos setores ficam com quem chama.
 */
export function applyManagerAccess(
  manager: Database["employees"][number],
  mode: ManagerAccessMode,
  visibleDepartmentIds: readonly string[] = [],
) {
  manager.departmentAccessMode = mode;
  manager.visibleDepartmentIds =
    mode === "selected" ? [...new Set(visibleDepartmentIds)] : undefined;
}
