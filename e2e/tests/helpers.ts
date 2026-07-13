const API = process.env.E2E_API_URL || 'http://127.0.0.1:8001/api/v1'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@trackchat.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

export async function adminToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`login failed: ${res.status}`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('login missing access_token')
  return data.access_token
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${path} ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET ${path} ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}
