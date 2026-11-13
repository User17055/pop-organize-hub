/** Keeps delayed browser/network events bound to the call that produced them. */
export class PopCallSession {
  private generation = 0;
  private active = false;
  private queue: Promise<unknown> = Promise.resolve();
  private tools = new Map<string, Promise<unknown>>();

  begin(): number | null {
    if (this.active) return null;
    this.active = true;
    this.tools.clear();
    this.queue = Promise.resolve();
    return ++this.generation;
  }
  end() {
    this.active = false;
    ++this.generation;
    this.tools.clear();
    this.queue = Promise.resolve();
  }
  isCurrent(generation: number) {
    return this.active && generation === this.generation;
  }
  runTool<T>(generation: number, id: string, operation: () => Promise<T>): Promise<T | undefined> {
    if (!this.isCurrent(generation)) return Promise.resolve(undefined);
    const existing = this.tools.get(id);
    if (existing) return existing as Promise<T | undefined>;
    const result = this.queue
      .catch(() => undefined)
      .then(() => (this.isCurrent(generation) ? operation() : undefined));
    this.queue = result;
    this.tools.set(id, result);
    return result;
  }
}
