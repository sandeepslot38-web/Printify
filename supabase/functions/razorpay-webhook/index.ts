import { dbRequest, json, preflight, hmacSha256Hex, safeEqual } from '../_shared/payment.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return preflight(request)
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  const signature = request.headers.get('x-razorpay-signature')
  if (!secret || !signature) return new Response('Webhook is not configured', { status: 503 })
  try {
    const rawBody = await request.text()
    const expected = await hmacSha256Hex(secret, rawBody)
    if (!safeEqual(expected, signature)) return new Response('Invalid signature', { status: 401 })
    const event = JSON.parse(rawBody)
    const entity = event.payload?.payment?.entity
    if (!entity?.order_id || !entity?.id) return new Response('Ignored', { status: 200 })
    const records = await dbRequest(`payments?provider_order_id=eq.${encodeURIComponent(entity.order_id)}&select=id,order_id,amount_inr,state`)
    const payment = records?.[0]
    if (!payment) return new Response('Order not found', { status: 404 })
    if (event.event === 'payment.captured' && entity.status === 'captured' && entity.amount === payment.amount_inr * 100 && entity.currency === 'INR') {
      if (payment.state !== 'verified') {
        const verifiedAt = new Date().toISOString()
        await dbRequest(`payments?id=eq.${payment.id}`, 'PATCH', { state: 'verified', provider_payment_id: entity.id, verified_at: verifiedAt })
        await dbRequest(`orders?id=eq.${payment.order_id}`, 'PATCH', { status: 'confirmed', updated_at: verifiedAt })
        await dbRequest('order_status_history', 'POST', { order_id: payment.order_id, status: 'confirmed', note: 'Razorpay webhook confirmed captured payment.' })
      }
    } else if (event.event === 'payment.failed' && payment.state === 'pending') {
      await dbRequest(`payments?id=eq.${payment.id}`, 'PATCH', { state: 'failed' })
    }
    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('razorpay-webhook failed:', error instanceof Error ? error.message : 'unknown error')
    return new Response('Webhook processing failed', { status: 500 })
  }
})
