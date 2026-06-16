import { useQuery } from "@tanstack/react-query";

import { getWorkspaceData } from "./pop-organize.functions";

export const workspaceQueryKey = ["workspace"] as const;

export function useWorkspaceData() {
  return useQuery({
    queryKey: workspaceQueryKey,
    queryFn: () => getWorkspaceData(),
  });
}

export type WorkspaceResult = Awaited<ReturnType<typeof getWorkspaceData>>;
