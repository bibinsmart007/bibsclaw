import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { Resource } from '@opentelemetry/resources';
const sdk = new NodeSDK({
  resource: new Resource({ 'service.name': 'bibsclaw' }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});
export function initTracing(): void {
  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown());
}
