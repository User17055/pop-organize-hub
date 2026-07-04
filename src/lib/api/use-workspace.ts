import { useQuery } from "@tanstack/react-query";

import { getWorkspaceData } from "./pop-organize.functions";

export const workspaceQueryKey = ["workspace"] as const;

export function useWorkspaceData() {
  return useQuery({
    queryKey: workspaceQueryKey,
    queryFn: () => getWorkspaceData(),
    placeholderData: (previousData) => previousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const typedError = error as Error & { statusCode?: number; status?: number };
      if (typedError.statusCode === 401 || typedError.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 20_000,
  });
}

export type WorkspaceResult = Awaited<ReturnType<typeof getWorkspaceData>>;
