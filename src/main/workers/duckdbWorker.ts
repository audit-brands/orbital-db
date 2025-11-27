import { parentPort } from 'worker_threads';
import { DuckDBService } from '../DuckDBService';

interface WorkerRequest {
  id: number;
  method: keyof DuckDBService | 'closeAllConnections';
  args?: unknown[];
}

interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
}

const service = new DuckDBService();

const port = parentPort;

if (!port) {
  throw new Error('DuckDB worker must be spawned as a worker thread.');
}

const callServiceMethod = async (method: WorkerRequest['method'], args: unknown[] = []) => {
  const target = service as unknown as Record<string, (...innerArgs: unknown[]) => unknown>;
  const fn = target[method];
  if (typeof fn !== 'function') {
    throw new Error(`Unknown DuckDB service method: ${method}`);
  }
  return await fn.apply(service, args);
};

port.on('message', async (message: WorkerRequest) => {
  const { id, method, args } = message;
  try {
    const result = await callServiceMethod(method, args);
    const response: WorkerResponse = { id, ok: true, result };
    port.postMessage(response);
  } catch (error) {
    const err = error as Error;
    const response: WorkerResponse = {
      id,
      ok: false,
      error: {
        message: err.message || 'Unknown error',
        stack: err.stack,
      },
    };
    port.postMessage(response);
  }
});

process.on('beforeExit', async () => {
  await service.closeAllConnections();
});
