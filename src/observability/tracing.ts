export interface TraceSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  children: TraceSpan[];
}
export class TracingService {
  private spans: TraceSpan[] = [];
  startSpan(name: string, attrs: Record<string, unknown> = {}): TraceSpan {
    const span: TraceSpan = {
      id: `span-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name, startTime: Date.now(), attributes: attrs, children: [],
    };
    this.spans.push(span);
    return span;
  }
  endSpan(span: TraceSpan): void { span.endTime = Date.now(); }
  getTraces(): TraceSpan[] { return this.spans; }
  clear(): void { this.spans = []; }
}
export function initTracing(): TracingService {
  const service = new TracingService();
  process.on('SIGTERM', () => service.clear());
  return service;
}
export const tracer = new TracingService();
