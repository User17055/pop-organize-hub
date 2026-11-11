import type { ReactNode } from "react";

export type NavItem = {
  to: string;
  label: string;
  /** Rótulo da barra de abas do celular, onde cabe pouco. */
  shortLabel?: string;
  icon: (props: { className?: string }) => ReactNode;
  exact?: boolean;
  /** Item que é a mesma página com um filtro na URL (ex.: "Minhas tarefas" = `/tarefas?escopo=mine`). */
  escopo?: "mine";
};

/**
 * Item aceso? Um item com `escopo` acende só com aquele filtro na URL, e o item da mesma página sem
 * filtro apaga enquanto ele estiver ativo, para não haver duas abas acesas ao mesmo tempo.
 */
export function isNavItemActive(
  item: NavItem,
  pathname: string,
  escopo: string | undefined,
  items: NavItem[],
) {
  const pathMatches = item.exact ? pathname === item.to : pathname.startsWith(item.to);
  if (!pathMatches) return false;
  if (item.escopo) return escopo === item.escopo;
  return !items.some((other) => other.escopo && other.to === item.to && other.escopo === escopo);
}

export function navItemKey(item: NavItem) {
  return item.escopo ? `${item.to}?escopo=${item.escopo}` : item.to;
}
