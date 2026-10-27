const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function allowedOrigin(origin: string | null) {
  if (!origin) return true
  const configured = (Deno.env.get('STORE_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  const localOrigins = Deno.env.get('SB_REGION') ? [] : DEV_ORIGINS
  return [...localOrigins, ...configured].includes(origin)
}

export function corsHeaders(origin: string | null) {
  return {
    ...(origin && allowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-razorpay-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

export function json(request: Request, value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: corsHeaders(request.headers.get('origin')) })
}

export function preflight(request: Request) {
  if (request.method !== 'OPTIONS') return null
  if (!allowedOrigin(request.headers.get('origin'))) return new Response('Origin not allowed', { status: 403 })
  return new Response('ok', { headers: corsHeaders(request.headers.get('origin')) })
}

function serviceKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) return JSON.parse(keys).default as string
  throw new Error('Supabase server secret is not configured')
}

export async function dbRequest(path: string, method = 'GET', body?: unknown) {
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) throw new Error('Supabase URL is not configured')
  const key = serviceKey()
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : null
}

export async function authenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.replace(/^Bearer\s+/i, '')
  const projectUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || (() => {
    const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
    return keys ? JSON.parse(keys).default as string : ''
  })()
  if (!accessToken || !projectUrl || !publishableKey) throw new Error('Please sign in to continue.')
  const response = await fetch(`${projectUrl}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error('Your session expired. Sign in again to continue.')
  return await response.json() as { id: string; email?: string }
}

export function razorpayCredentials() {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured')
  return { keyId, keySecret }
}

export async function razorpayRequest(path: string, method = 'GET', body?: unknown) {
  const { keyId, keySecret } = razorpayCredentials()
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`Razorpay request failed (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`)
  return payload
}

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return mismatch === 0
}
