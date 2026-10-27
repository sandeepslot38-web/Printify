import { allowedOrigin, authenticatedUser, dbRequest, json, preflight, razorpayCredentials, razorpayRequest } from '../_shared/payment.ts'

const catalogue = {
  '01': { name: 'Rebel Star Graphic Tee', price: 899, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Ink'] },
  '02': { name: 'Cream Oversized Graphic Tee', price: 1099, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Cream'] },
  '03': { name: 'Sadar Theme DTF Shirt', price: 999, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['White'] },
  '04': { name: 'Spirit Graphic Tee', price: 899, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['White'] },
  '05': { name: 'Rebel Star Women’s Tee', price: 949, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Ink'] },
  '06': { name: 'Decorative Foot Print Shirt', price: 1099, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Ink'] },
  '07': { name: 'Face Print Pocket Shirt', price: 899, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['Ink'] },
  '08': { name: 'Sadar Festival Shirt', price: 999, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colours: ['White'] },
} as const

function validText(value: unknown, max: number) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max }

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405)
  const origin = request.headers.get('origin')
  if (!origin || !allowedOrigin(origin)) return json(request, { error: 'Origin not allowed' }, 403)
  let user: { id: string; email?: string }
  try { user = await authenticatedUser(request) } catch (error) { return json(request, { error: error instanceof Error ? error.message : 'Sign in to continue.' }, 401) }
  try {
    const body = await request.json()
    const customer = body.customer
    if (!customer || !validText(customer.name, 100) || !validText(customer.phone, 25) || !validText(customer.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || !validText(customer.line1, 200) || !validText(customer.city, 100) || !validText(customer.state, 100) || !/^\d{6}$/.test(customer.postal_code)) return json(request, { error: 'Enter valid contact and delivery details.' }, 400)
    const hasLatitude = customer.latitude !== undefined && customer.latitude !== null
    const hasLongitude = customer.longitude !== undefined && customer.longitude !== null
    const latitude = hasLatitude ? Number(customer.latitude) : null
    const longitude = hasLongitude ? Number(customer.longitude) : null
    if (hasLatitude !== hasLongitude || (hasLatitude && (!Number.isFinite(latitude) || latitude! < -90 || latitude! > 90 || !Number.isFinite(longitude) || longitude! < -180 || longitude! > 180))) return json(request, { error: 'The selected map location is invalid. Choose it again or enter your address manually.' }, 400)
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) return json(request, { error: 'Your cart is empty or has too many items.' }, 400)

    const items = body.items.map((line: Record<string, unknown>) => {
      const product = catalogue[String(line.productId) as keyof typeof catalogue]
      const quantity = Number(line.quantity)
      const size = String(line.size ?? '')
      const colour = String(line.colour ?? '')
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !(product.sizes as readonly string[]).includes(size) || !(product.colours as readonly string[]).includes(colour)) throw new Error('A cart item is invalid. Refresh the page and check your cart.')
      return { id: String(line.productId), name: product.name, size, colour, quantity, unitPrice: product.price }
    })
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    if (total < 1 || total > 500000) return json(request, { error: 'This order total is outside the online checkout limit.' }, 400)
    const orderNumber = `HH-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const razorpayOrder = await razorpayRequest('orders', 'POST', { amount: total * 100, currency: 'INR', receipt: orderNumber, notes: { order_number: orderNumber } })
    const address = { full_name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim(), line1: customer.line1.trim(), line2: typeof customer.line2 === 'string' ? customer.line2.trim() : '', city: customer.city.trim(), state: customer.state.trim(), postal_code: customer.postal_code, country: 'India', ...(latitude === null ? {} : { latitude, longitude }) }
    const inserted = await dbRequest('orders?select=id,order_number', 'POST', { order_number: orderNumber, user_id: user.id, email: address.email, phone: address.phone, address_snapshot: address, status: 'pending', currency: 'INR', subtotal_inr: total, discount_inr: 0, shipping_inr: 0, total_inr: total })
    const order = inserted?.[0]
    if (!order?.id) throw new Error('Could not save this order. Please contact the store before paying.')
    await dbRequest('order_items', 'POST', items.map((item) => ({ order_id: order.id, product_id: null, variant_id: null, product_snapshot: { id: item.id, name: item.name, colour: item.colour }, quantity: item.quantity, unit_price_inr: item.unitPrice, size: item.size })))
    await dbRequest('payments', 'POST', { order_id: order.id, provider: 'razorpay', provider_order_id: razorpayOrder.id, state: 'pending', amount_inr: total })
    await dbRequest('order_status_history', 'POST', { order_id: order.id, status: 'pending', note: 'Order created; awaiting payment.' })
    const { keyId } = razorpayCredentials()
    return json(request, { key_id: keyId, razorpay_order_id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, order_number: order.order_number })
  } catch (error) {
    console.error('create-payment-order failed:', error instanceof Error ? error.message : 'unknown error')
    return json(request, { error: error instanceof Error ? error.message : 'Could not start checkout. Try again.' }, 400)
  }
})

