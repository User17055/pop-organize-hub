import { useQuery } from "@tanstack/react-query";

import { getWorkspaceData } from "./pop-organize.functions";

export const workspaceQueryKey = ["workspace"] as const;

export function useWorkspaceData() {
  return useQuery({
    queryKey: workspaceQueryKey,
    queryFn: () => getWorkspaceData(),
    placeholderData: (previousData) => previousData,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 2_000,
  });
}

export type WorkspaceResult = Awaited<ReturnType<typeof getWorkspaceData>>;
