type ApiPayload = { error?: string };

const liveStorageMessage =
  'This feature is temporarily unavailable because secure account storage is not connected on the live site yet.';

export async function readApiResponse<T extends object>(
  response: Response,
  fallbackMessage: string,
): Promise<T & ApiPayload> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as T & ApiPayload;
    } catch {
      return { error: fallbackMessage } as T & ApiPayload;
    }
  }

  let message = '';
  try {
    message = (await response.text()).trim();
  } catch {
    // Use the caller's friendly fallback when the body cannot be read.
  }
  if (message === 'The site could not complete this request.') message = liveStorageMessage;
  if (!message || message.startsWith('<') || message.length > 240) message = fallbackMessage;
  return { error: message } as T & ApiPayload;
}

