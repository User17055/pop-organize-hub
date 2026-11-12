/** Commit notifications carry no account or task data. Every reader rechecks authorization. */
type Updates = { revision: number; waiters: Set<() => void> };
const shared = globalThis as typeof globalThis & { __popTaskUpdates?: Updates };
const updates = shared.__popTaskUpdates ??= { revision: 0, waiters: new Set() };

export function taskUpdateRevision() { return updates.revision; }

export function notifyTaskUpdate() {
  updates.revision++;
  for (const wake of [...updates.waiters]) wake();
}

export function waitForTaskUpdate(revision: number, timeout: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (timer) clearTimeout(timer);
      updates.waiters.delete(finish);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    updates.waiters.add(finish);
    signal?.addEventListener("abort", finish, { once: true });
    timer = setTimeout(finish, Math.max(0, timeout));
    // Check after subscription so a commit between the read and wait cannot be lost.
    if (signal?.aborted || updates.revision !== revision) finish();
  });
}
