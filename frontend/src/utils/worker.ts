let cachedWorkerUrl: string | null = null;

export async function getWorkerUrl(): Promise<string> {
  if (cachedWorkerUrl) {
    return cachedWorkerUrl;
  }

  // Try local first, fallback to CDN
  try {
    const response = await fetch('/worker.mjs');
    if (!response.ok) throw new Error('Local worker not found');
    const blob = await response.blob();
    const file = new File([blob], 'worker.mjs', { type: 'text/javascript' });
    cachedWorkerUrl = URL.createObjectURL(file);
  } catch {
    // Fallback to CDN
    const response = await fetch('https://thatopen.github.io/engine_fragment/resources/worker.mjs');
    const blob = await response.blob();
    const file = new File([blob], 'worker.mjs', { type: 'text/javascript' });
    cachedWorkerUrl = URL.createObjectURL(file);
  }

  return cachedWorkerUrl;
}

export function revokeWorkerUrl(): void {
  if (cachedWorkerUrl) {
    URL.revokeObjectURL(cachedWorkerUrl);
    cachedWorkerUrl = null;
  }
}
