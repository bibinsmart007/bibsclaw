export class RequestTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}

export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestTimeoutError(timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export class TimeoutManager {
  private defaults: Map<string, number> = new Map();

  setDefault(endpoint: string, timeoutMs: number): void {
    this.defaults.set(endpoint, timeoutMs);
  }

  getDefault(endpoint: string, fallback = 30000): number {
    return this.defaults.get(endpoint) ?? fallback;
  }

  async call<T>(endpoint: string, fn: () => Promise<T>, overrideMs?: number): Promise<T> {
    const ms = overrideMs ?? this.getDefault(endpoint);
    return withTimeout(fn, ms);
  }
}
