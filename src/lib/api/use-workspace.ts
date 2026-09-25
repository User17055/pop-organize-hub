import { useQuery } from "@tanstack/react-query";

import { getWorkspaceData } from "./pop-organize.functions";

export const workspaceQueryKey = ["workspace"] as const;

export function useWorkspaceData() {
  return useQuery({
    queryKey: workspaceQueryKey,
    queryFn: () => getWorkspaceData(),
    placeholderData: (previousData) => previousData,
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      const typedError = error as Error & { statusCode?: number; status?: number };
      if (typedError.statusCode === 401 || typedError.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 0,
  });
}

export type WorkspaceResult = Awaited<ReturnType<typeof getWorkspaceData>>;
