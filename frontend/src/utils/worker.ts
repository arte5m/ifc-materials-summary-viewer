let cachedWorkerUrl: string | null = null;

export async function getWorkerUrl(): Promise<string> {
  if (cachedWorkerUrl) {
    return cachedWorkerUrl;
  }

  const response = await fetch('https://thatopen.github.io/engine_fragment/resources/worker.mjs');
  const blob = await response.blob();
  const file = new File([blob], 'worker.mjs', { type: 'text/javascript' });
  cachedWorkerUrl = URL.createObjectURL(file);

  return cachedWorkerUrl;
}

export function revokeWorkerUrl(): void {
  if (cachedWorkerUrl) {
    URL.revokeObjectURL(cachedWorkerUrl);
    cachedWorkerUrl = null;
  }
}
