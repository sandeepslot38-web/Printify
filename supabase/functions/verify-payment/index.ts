import { allowedOrigin, authenticatedUser, dbRequest, json, preflight, razorpayCredentials, razorpayRequest, hmacSha256Hex, safeEqual } from '../_shared/payment.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405)
  const origin = request.headers.get('origin')
  if (!origin || !allowedOrigin(origin)) return json(request, { error: 'Origin not allowed' }, 403)
  let user: { id: string; email?: string }
  try { user = await authenticatedUser(request) } catch (error) { return json(request, { error: error instanceof Error ? error.message : 'Sign in to continue.' }, 401) }
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await request.json()
    if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') return json(request, { error: 'Payment verification details are missing.' }, 400)
    const { keySecret } = razorpayCredentials()
    const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`)
    if (!safeEqual(expected, signature)) return json(request, { error: 'Payment verification failed. Contact the store before retrying.' }, 400)

    const matches = await dbRequest(`payments?provider_order_id=eq.${encodeURIComponent(orderId)}&select=id,order_id,amount_inr,state`)
    const paymentRecord = matches?.[0]
    if (!paymentRecord) return json(request, { error: 'We could not find this order. Contact the store before retrying.' }, 404)
    const owners = await dbRequest(`orders?id=eq.${paymentRecord.order_id}&select=user_id`)
    if (owners?.[0]?.user_id !== user.id) return json(request, { error: 'This payment does not belong to your account.' }, 403)
    if (paymentRecord.state === 'verified') return json(request, { verified: true })

    let providerPayment = await razorpayRequest(`payments/${encodeURIComponent(paymentId)}`)
    if (providerPayment.order_id !== orderId || providerPayment.amount !== paymentRecord.amount_inr * 100 || providerPayment.currency !== 'INR') return json(request, { error: 'Payment details do not match this order.' }, 400)
    if (providerPayment.status === 'authorized') {
      await razorpayRequest(`payments/${encodeURIComponent(paymentId)}/capture`, 'POST', { amount: providerPayment.amount, currency: 'INR' })
      providerPayment = await razorpayRequest(`payments/${encodeURIComponent(paymentId)}`)
    }
    if (providerPayment.status !== 'captured') return json(request, { error: 'Payment has not been captured yet. Contact the store if money was deducted.' }, 409)

    const verifiedAt = new Date().toISOString()
    await dbRequest(`payments?id=eq.${paymentRecord.id}`, 'PATCH', { state: 'verified', provider_payment_id: paymentId, verified_at: verifiedAt })
    await dbRequest(`orders?id=eq.${paymentRecord.order_id}`, 'PATCH', { status: 'confirmed', updated_at: verifiedAt })
    await dbRequest('order_status_history', 'POST', { order_id: paymentRecord.order_id, status: 'confirmed', note: 'Razorpay payment captured and verified.' })
    return json(request, { verified: true })
  } catch (error) {
    console.error('verify-payment failed:', error instanceof Error ? error.message : 'unknown error')
    return json(request, { error: error instanceof Error ? error.message : 'Payment verification is pending. Contact the store before retrying.' }, 400)
  }
})

