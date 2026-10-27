import { allowedOrigin, authenticatedUser, dbRequest, json, preflight } from '../_shared/payment.ts'

const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
const textValue = (value: unknown, max: number) => typeof value === 'string' && value.trim().length <= max

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405)
  const origin = request.headers.get('origin')
  if (!origin || !allowedOrigin(origin)) return json(request, { error: 'Origin not allowed' }, 403)

  let user: { id: string; email?: string }
  try { user = await authenticatedUser(request) } catch { return json(request, { error: 'Sign in to continue.' }, 401) }
  try {
    const roles = await dbRequest(`user_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role`)
    if (roles?.[0]?.role !== 'admin') return json(request, { error: 'Admin access is required to update tracking.' }, 403)

    const body = await request.json()
    if (typeof body.orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.orderId)) return json(request, { error: 'Choose a valid order.' }, 400)
    if (!statuses.includes(body.status)) return json(request, { error: 'Choose a valid order status.' }, 400)
    if (!textValue(body.carrierName, 100) || !textValue(body.trackingNumber, 120) || !textValue(body.currentLocation, 180) || !textValue(body.trackingUrl, 500) || !textValue(body.note, 300)) return json(request, { error: 'One of the tracking fields is too long.' }, 400)
    const trackingUrl = body.trackingUrl.trim()
    if (trackingUrl && !/^https:\/\//i.test(trackingUrl)) return json(request, { error: 'Tracking links must use HTTPS.' }, 400)
    const eta = body.estimatedDeliveryAt ? String(body.estimatedDeliveryAt) : null
    if (eta && !/^\d{4}-\d{2}-\d{2}$/.test(eta)) return json(request, { error: 'Enter an estimated delivery date.' }, 400)

    const existing = await dbRequest(`orders?id=eq.${body.orderId}&select=id,order_number,status`)
    if (!existing?.[0]) return json(request, { error: 'Order not found.' }, 404)
    const updatedAt = new Date().toISOString()
    await dbRequest(`orders?id=eq.${body.orderId}`, 'PATCH', {
      status: body.status,
      carrier_name: body.carrierName.trim() || null,
      tracking_number: body.trackingNumber.trim() || null,
      tracking_url: trackingUrl || null,
      estimated_delivery_at: eta,
      current_location: body.currentLocation.trim() || null,
      updated_at: updatedAt,
    })
    await dbRequest('order_status_history', 'POST', {
      order_id: body.orderId,
      status: body.status,
      note: body.note.trim() || `Order updated by store admin to ${body.status.replaceAll('_', ' ')}.`,
      created_at: updatedAt,
    })
    return json(request, { updated: true, order_number: existing[0].order_number })
  } catch (error) {
    console.error('update-order-tracking failed:', error instanceof Error ? error.message : 'unknown error')
    return json(request, { error: error instanceof Error ? error.message : 'Could not save tracking update.' }, 400)
  }
})
