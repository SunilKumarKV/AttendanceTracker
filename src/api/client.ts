import { getAuthToken } from '../auth/authStorage';

const DEFAULT_TIMEOUT_MS = 15000;

export interface ApiClientOptions extends RequestInit {
  timeoutMs?: number;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export class ApiClientError extends Error implements ApiError {
  status?: number;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.details = error.details;
  }
}

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL ?? '';

const normalizeError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiClientError({ message: 'The AttendanceTracker API did not respond in time. Please try again.' });
  }

  if (error instanceof Error) {
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
      return new ApiClientError({
        message: 'The AttendanceTracker API is unavailable. Check your connection or try again shortly.',
      });
    }

    return new ApiClientError({ message: error.message });
  }

  return new ApiClientError({ message: 'Something went wrong' });
};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

export const apiClient = async <T>(path: string, options: ApiClientOptions = {}): Promise<T> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const token = getAuthToken();
  const baseUrl = getBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      const message = typeof data === 'object' && data
        ? 'message' in data
          ? String(data.message)
          : 'error' in data && data.error && typeof data.error === 'object' && 'message' in data.error
            ? String(data.error.message)
            : 'Request failed'
        : 'Request failed';

      throw new ApiClientError({
        message,
        status: response.status,
        details: data,
      });
    }

    return data as T;
  } catch (error) {
    throw normalizeError(error);
  } finally {
    window.clearTimeout(timeout);
  }
};
