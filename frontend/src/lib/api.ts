import { useAuth } from '@/store/auth';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

/** Gọi REST API của backend; ném ApiError kèm thông báo tiếng Việt từ server. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra backend đang chạy rồi thử lại.', 0);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    // Token hết hạn hoặc tài khoản bị khóa: đăng xuất để người dùng đăng nhập lại
    if (res.status === 401 && options.token) {
      useAuth.getState().logout();
    }
    throw new ApiError(extractMessage(data) ?? `Lỗi ${res.status}`, res.status, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return undefined;
}

/** Ảnh sản phẩm nằm trong /public của frontend; URL tuyệt đối thì dùng nguyên. */
export function imageSrc(url: string): string {
  if (!url) return '/images/ca-phe-sua.svg';
  return url;
}
