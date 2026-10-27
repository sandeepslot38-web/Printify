import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ImagePlus, Instagram, LogOut, MapPin, Menu, Minus, PackageCheck, Phone, Plus, Search, ShoppingBag, Shirt, Star, UserRound, X } from 'lucide-react'
import { categories, products, type Product } from './products'
import { formatPrice, storeConfig, whatsappUrl } from './storeConfig'

type CartLine = { productId: string; size: string; colour: string; quantity: number }
type Selection = { product: Product; size: string; colour: string; quantity: number }
type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
type RazorpayOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; prefill: { name: string; email: string; contact: string }; theme: { color: string }; handler: (response: RazorpaySuccess) => void; modal: { ondismiss: () => void } }
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void } } }
type GoogleMapsApi = { maps: { importLibrary: (name: string) => Promise<Record<string, any>> } }
declare global { interface Window { google?: GoogleMapsApi; googleMapsLoader?: Promise<GoogleMapsApi> } }
type CustomerSession = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string; user_metadata?: { full_name?: string } } }
type TrackingDraft = { status: string; carrierName: string; trackingNumber: string; trackingUrl: string; estimatedDeliveryAt: string; currentLocation: string; note: string }
type CustomerOrder = { id: string; order_number: string; status: string; total_inr: number; currency: string; created_at: string; carrier_name: string | null; tracking_number: string | null; tracking_url: string | null; estimated_delivery_at: string | null; current_location: string | null; address_snapshot: { full_name?: string; line1?: string; line2?: string; city?: string; state?: string; postal_code?: string }; order_items: { product_snapshot: { name?: string; colour?: string }; quantity: number; unit_price_inr: number; size: string }[]; order_status_history: { status: string; note: string; created_at: string }[] }
const readCart = (): CartLine[] => { try { return JSON.parse(localStorage.getItem('hh-brandings-cart') || '[]') } catch { return [] } }
const readCustomerSession = (): CustomerSession | null => { try { return JSON.parse(localStorage.getItem('hh-brandings-session') || 'null') } catch { return null } }
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

async function authRequest(path: string, body?: unknown, accessToken?: string, method = body === undefined ? 'GET' : 'POST') {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Customer accounts are not connected yet. Configure Supabase to continue.')
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, { method, headers: { apikey: supabaseAnonKey, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || 'Could not complete account request.')
  return payload
}

function toCustomerSession(payload: Record<string, any>): CustomerSession | null {
  if (!payload.access_token || !payload.refresh_token || !payload.user?.id) return null
  return { access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600), user: payload.user }
}

const trackingStages = [
  { status: 'pending', label: 'Ordered' },
  { status: 'processing', label: 'Order Ready' },
  { status: 'shipped', label: 'In Transit' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
]
const trackingStageIndex = (status: string) => status === 'pending' ? 0 : status === 'confirmed' || status === 'processing' ? 1 : trackingStages.findIndex((stage) => stage.status === status)
const formatDate = (date: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) => new Intl.DateTimeFormat('en-IN', options).format(new Date(date))

function OrderTrackingView({ order, isAdmin, onBack, onSave, saving, notice, error }: { order: CustomerOrder; isAdmin: boolean; onBack: () => void; onSave: (orderId: string, draft: TrackingDraft) => void; saving: boolean; notice: string; error: string }) {
  const currentStage = trackingStageIndex(order.status)
  const address = order.address_snapshot || {}
  const terminal = order.status === 'cancelled' || order.status === 'refunded'
  const destination = [address.city, address.state, address.postal_code].filter(Boolean).join(', ')

  return <main className="order-tracking-page"><button className="tracking-back" onClick={onBack}><ArrowLeft size={15}/> Back to orders</button><div className="tracking-title"><span className="eyebrow">H&H BRANDINGS · ORDER TRACKING</span><h2>Order: <em>#{order.order_number}</em></h2><p>Status: <b className={`order-status status-${order.status}`}>{order.status.replaceAll('_', ' ')}</b></p></div>
    <div className="tracking-eta">{order.estimated_delivery_at ? <>Expected to arrive on <b>{formatDate(order.estimated_delivery_at)}</b></> : <>We’ll share an estimated arrival date when it’s available.</>}</div>
    <section className={`tracking-progress ${terminal ? 'tracking-terminal' : ''}`} aria-label="Order progress">{terminal ? <div className="tracking-terminal-message">This order was {order.status}. Contact the store if you need help.</div> : trackingStages.map((stage, index) => <div className={`tracking-stage ${index < currentStage ? 'complete' : ''} ${index === currentStage ? 'current' : ''}`} key={stage.status}><i><Check size={13}/></i><b>{stage.label}</b>{order.order_status_history?.find((entry) => entry.status === stage.status || (stage.status === 'processing' && entry.status === 'confirmed')) && <small>{formatDate(order.order_status_history.find((entry) => entry.status === stage.status || (stage.status === 'processing' && entry.status === 'confirmed'))!.created_at, { month: 'short', day: 'numeric' })}</small>}</div>)}</section>
    <div className="tracking-detail-grid"><section className="tracking-shipping"><h3>Shipping details</h3><p>{address.full_name || 'Customer'}{destination ? ` · ${destination}` : ''}</p><address>{[address.line1, address.line2, destination].filter(Boolean).join(', ')}</address>{order.carrier_name && <p className="carrier-line">Carrier · <b>{order.carrier_name}</b></p>}{order.tracking_number && <p className="carrier-line">Tracking number · <b>{order.tracking_number}</b></p>}{order.tracking_url && <a className="tracking-external" href={order.tracking_url} target="_blank" rel="noreferrer">Open carrier tracking <ArrowUpRight size={15}/></a>}
      <h4>Latest updates</h4><div className="tracking-updates">{[...(order.order_status_history || [])].reverse().map((entry, index) => <article key={`${entry.created_at}-${index}`}><time>{formatDate(entry.created_at, { hour: '2-digit', minute: '2-digit' })}</time><div><b>{entry.status.replaceAll('_', ' ')}</b><p>{entry.note}</p><small>{formatDate(entry.created_at, { dateStyle: 'medium' })}</small></div></article>)}{!order.order_status_history?.length && <p>No tracking updates yet.</p>}</div>
    </section><section className="package-location"><h3>Package location</h3><span className="eyebrow">LATEST SCAN</span><div className="route-map" aria-label="Schematic route from package scan to destination"><i className="route-line route-line-one"/><i className="route-line route-line-two"/><span className="route-pin route-pin-current"><PackageCheck size={16}/></span><span className="route-pin route-pin-destination"><MapPin size={16}/></span><b className="route-label route-label-current">{order.current_location || 'Awaiting first scan'}</b><b className="route-label route-label-destination">{destination || 'Delivery address'}</b></div><div className="location-caption"><MapPin size={16}/><span><b>{order.current_location || 'Package is being prepared'}</b><small>Destination · {destination || 'Address on order'}</small></span></div><div className="tracked-order-total"><span>{order.order_items.length} item{order.order_items.length === 1 ? '' : 's'} · Order total</span><b>{formatPrice(order.total_inr)}</b></div></section></div>
    {isAdmin && <section className="tracking-admin"><div><span className="eyebrow">ADMIN TOOLS</span><h3>Update shipment</h3><p>Save a status update and it will appear in the customer’s order timeline.</p></div><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave(order.id, { status: String(data.get('status')), carrierName: String(data.get('carrier_name')), trackingNumber: String(data.get('tracking_number')), trackingUrl: String(data.get('tracking_url')), estimatedDeliveryAt: String(data.get('estimated_delivery_at')), currentLocation: String(data.get('current_location')), note: String(data.get('note')) }) }}><div className="admin-tracking-fields"><label>Status<select name="status" defaultValue={order.status}><option value="pending">Ordered</option><option value="confirmed">Confirmed</option><option value="processing">Order ready</option><option value="shipped">In transit</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></label><label>Estimated arrival<input name="estimated_delivery_at" type="date" defaultValue={order.estimated_delivery_at || ''}/></label><label>Carrier<input name="carrier_name" defaultValue={order.carrier_name || ''} placeholder="Carrier name"/></label><label>Tracking number<input name="tracking_number" defaultValue={order.tracking_number || ''} placeholder="Tracking number"/></label><label>Carrier tracking URL<input name="tracking_url" type="url" defaultValue={order.tracking_url || ''} placeholder="https://…"/></label><label>Latest scan location<input name="current_location" defaultValue={order.current_location || ''} placeholder="e.g. Hyderabad sorting hub"/></label><label className="admin-note-field">Update note<input name="note" required maxLength={300} placeholder="e.g. Package departed Hyderabad hub"/></label></div>{error && <p className="checkout-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="button button-dark" disabled={saving}>{saving ? 'Saving update…' : <>Save tracking update <ArrowUpRight size={15}/></>}</button></form></section>}
  </main>
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google)
  if (window.googleMapsLoader) return window.googleMapsLoader
  window.googleMapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`
    script.async = true
    script.onload = () => window.google?.maps ? resolve(window.google) : reject(new Error('Google Maps did not initialize.'))
    script.onerror = () => { window.googleMapsLoader = undefined; reject(new Error('Google Maps could not load.')) }
    document.head.appendChild(script)
  })
  return window.googleMapsLoader
}
const loadRazorpay = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) { resolve(true); return }
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(Boolean(window.Razorpay))
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

function App() {
  const [contentPage, setContentPage] = useState<'store' | 'contact' | 'reviews'>('store')
  const [reviewRating, setReviewRating] = useState(5)
  const placeAutocompleteHostRef = useRef<HTMLDivElement>(null)
  const addressLineRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const stateRef = useRef<HTMLInputElement>(null)
  const postalCodeRef = useRef<HTMLInputElement>(null)
  const [addressCoordinates, setAddressCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [cart, setCart] = useState<CartLine[]>(readCart)
  const [showIntro, setShowIntro] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [category, setCategory] = useState('All tees')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('Featured')
  const [notice, setNotice] = useState('')
  const [customPreview, setCustomPreview] = useState('')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState('')
  const [preparedOrder, setPreparedOrder] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [paymentNeedsReview, setPaymentNeedsReview] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const [accountSession, setAccountSession] = useState<CustomerSession | null>(readCustomerSession)
  const [accountOpen, setAccountOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [ordersRefresh, setOrdersRefresh] = useState(0)
  const [trackingSaving, setTrackingSaving] = useState(false)
  const [trackingNotice, setTrackingNotice] = useState('')
  const [trackingError, setTrackingError] = useState('')

  useEffect(() => { localStorage.setItem('hh-brandings-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      let stored = readCustomerSession()
      try {
        if (stored && supabaseUrl && supabaseAnonKey) {
          if (stored.expires_at <= Math.floor(Date.now() / 1000) + 60) {
            const refreshed = toCustomerSession(await authRequest('token?grant_type=refresh_token', { refresh_token: stored.refresh_token }))
            if (!refreshed) throw new Error('Your session expired. Sign in again.')
            stored = refreshed
          }
          const user = await authRequest('user', undefined, stored.access_token)
          stored = { ...stored, user }
          localStorage.setItem('hh-brandings-session', JSON.stringify(stored))
          if (active) setAccountSession(stored)
        } else if (stored) {
          localStorage.removeItem('hh-brandings-session')
          if (active) setAccountSession(null)
        }
      } catch {
        localStorage.removeItem('hh-brandings-session')
        if (active) setAccountSession(null)
      } finally { if (active) setAuthLoading(false) }
    }
    void restoreSession()
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!accountOpen || !accountSession || !supabaseUrl || !supabaseAnonKey) return
    let active = true
    setOrdersLoading(true); setOrdersError('')
    const query = 'orders?select=id,order_number,status,total_inr,currency,created_at,carrier_name,tracking_number,tracking_url,estimated_delivery_at,current_location,address_snapshot,order_items(product_snapshot,quantity,unit_price_inr,size),order_status_history(status,note,created_at)&order=created_at.desc&order_status_history.order=created_at.asc'
    const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${accountSession.access_token}` }
    Promise.all([fetch(`${supabaseUrl}/rest/v1/${query}`, { headers }), fetch(`${supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(accountSession.user.id)}&select=role`, { headers })])
      .then(async ([ordersResponse, roleResponse]) => {
        const [orders, roles] = await Promise.all([ordersResponse.json(), roleResponse.json()])
        if (!ordersResponse.ok) throw new Error(orders.message || 'Could not load your orders.')
        if (active) { setCustomerOrders(orders); setIsAdmin(roleResponse.ok && roles.some((role: { role: string }) => role.role === 'admin')) }
      })
      .catch((error) => { if (active) setOrdersError(error instanceof Error ? error.message : 'Could not load your orders.') })
      .finally(() => { if (active) setOrdersLoading(false) })
    return () => { active = false }
  }, [accountOpen, accountSession, ordersRefresh])
  useEffect(() => { if (!referencePreview) return; return () => URL.revokeObjectURL(referencePreview) }, [referencePreview])
  useEffect(() => {
    if (!cartOpen || !accountSession || !googleMapsApiKey || !placeAutocompleteHostRef.current) return
    let active = true
    let element: HTMLElement | undefined
    const handlePlace = async (event: Event) => {
      try {
        const prediction = (event as any).placePrediction || (event as CustomEvent).detail?.placePrediction
        if (!prediction) return
        const place = prediction.toPlace()
        await place.fetchFields({ fields: ['addressComponents', 'location'] })
        if (!active) return
        const components = place.addressComponents || []
        const component = (type: string) => components.find((item: any) => item.types?.includes(type))?.longText || ''
        const street = [component('street_number'), component('route')].filter(Boolean).join(' ')
        if (addressLineRef.current && street) addressLineRef.current.value = street
        if (cityRef.current) cityRef.current.value = component('locality') || component('postal_town') || component('sublocality_level_1') || cityRef.current.value
        if (stateRef.current) stateRef.current.value = component('administrative_area_level_1') || stateRef.current.value
        if (postalCodeRef.current) postalCodeRef.current.value = component('postal_code') || postalCodeRef.current.value
        const lat = place.location?.lat?.(); const lng = place.location?.lng?.()
        if (typeof lat === 'number' && typeof lng === 'number') setAddressCoordinates({ latitude: lat, longitude: lng })
        setLocationStatus('Address selected. Review the delivery details before checkout.')
      } catch { setLocationStatus('Could not fill the address. You can enter it manually.') }
    }
    void loadGoogleMaps(googleMapsApiKey).then(async (google) => {
      const library = await google.maps.importLibrary('places')
      if (!active || !placeAutocompleteHostRef.current) return
      const autocomplete = new (library as any).PlaceAutocompleteElement({ includedRegionCodes: ['in'] })
      autocomplete.placeholder = 'Search for your delivery address'
      element = autocomplete
      autocomplete.addEventListener('gmp-select', handlePlace)
      placeAutocompleteHostRef.current.replaceChildren(autocomplete)
    }).catch(() => { if (active) setLocationStatus('Address search is unavailable. Enter your address below.') })
    return () => { active = false; element?.removeEventListener('gmp-select', handlePlace); placeAutocompleteHostRef.current?.replaceChildren() }
  }, [cartOpen, accountSession])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setShowIntro(true)
    const timeout = window.setTimeout(() => setShowIntro(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [])
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = products.filter((product) => (category === 'All tees' || product.category === category) && (!q || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(q)))
    if (sort === 'Price: low to high') result.sort((a, b) => a.price - b.price)
    if (sort === 'Price: high to low') result.sort((a, b) => b.price - a.price)
    return result
  }, [category, query, sort])
  const lineProduct = (line: CartLine) => products.find((p) => p.id === line.productId)
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0)
  const subtotal = cart.reduce((total, line) => total + (lineProduct(line)?.price ?? 0) * line.quantity, 0)
  const goTo = (id: string) => { setMenuOpen(false); setCartOpen(false); if (id === 'contact' || id === 'reviews') { setContentPage(id); window.scrollTo({ top: 0, behavior: 'smooth' }); return } setContentPage('store'); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 0) }
  const say = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2800) }
  const openProduct = (product: Product) => { setActiveProduct(product); setSelection({ product, size: '', colour: '', quantity: 1 }) }
  const addToCart = () => {
    if (!selection?.size || !selection.colour) { say('Choose a size and colour to continue.'); return }
    const { product, size, colour, quantity } = selection
    setCart((current) => {
      const found = current.find((line) => line.productId === product.id && line.size === size && line.colour === colour)
      return found ? current.map((line) => line === found ? { ...line, quantity: line.quantity + quantity } : line) : [...current, { productId: product.id, size, colour, quantity }]
    })
    setActiveProduct(null); say('Added to your bag.')
  }
  const changeQuantity = (line: CartLine, by: number) => setCart((current) => current.flatMap((item) => item.productId === line.productId && item.size === line.size && item.colour === line.colour ? (item.quantity + by > 0 ? [{ ...item, quantity: item.quantity + by }] : []) : [item]))
  const orderText = `Hi ${storeConfig.brand}, I'd like to place an order:\n\n${cart.map((line) => `${lineProduct(line)?.name} - Size ${line.size}, ${line.colour} - Qty ${line.quantity} - ${formatPrice((lineProduct(line)?.price ?? 0) * line.quantity)}`).join('\n')}\n\nSubtotal: ${formatPrice(subtotal)}\nPlease confirm availability, delivery and payment details.`
  const whatsapp = (message: string) => {
    const url = whatsappUrl(message)
    if (!url) { setPreparedOrder(message); say('Review the prepared message. Add the business number to enable WhatsApp.'); return }
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('Location is not available in this browser. Enter your address manually.'); return }
    if (!window.isSecureContext) { setLocationStatus('Current location requires a secure HTTPS connection. Enter your address manually.'); return }
    setLocationBusy(true); setLocationStatus('Requesting your location…')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const point = { latitude: coords.latitude, longitude: coords.longitude }
      setAddressCoordinates(point)
      setLocationStatus('Location found. Add your street address and PIN code below.')
      if (googleMapsApiKey) try {
        const google = await loadGoogleMaps(googleMapsApiKey)
        const library = await google.maps.importLibrary('geocoding')
        const geocoder = new (library as any).Geocoder()
        const result = await geocoder.geocode({ location: { lat: point.latitude, lng: point.longitude } })
        const components = result.results?.[0]?.address_components || []
        const component = (type: string) => components.find((item: any) => item.types?.includes(type))?.long_name || ''
        const street = [component('street_number'), component('route')].filter(Boolean).join(' ')
        if (addressLineRef.current && street) addressLineRef.current.value = street
        if (cityRef.current) cityRef.current.value = component('locality') || component('postal_town') || component('sublocality_level_1') || cityRef.current.value
        if (stateRef.current) stateRef.current.value = component('administrative_area_level_1') || stateRef.current.value
        if (postalCodeRef.current) postalCodeRef.current.value = component('postal_code') || postalCodeRef.current.value
        if (result.results?.[0]) setLocationStatus('Address found. Review and complete any missing fields before checkout.')
      } catch { setLocationStatus('Location found, but address lookup failed. Enter the address manually.') }
      setLocationBusy(false)
    }, (error) => {
      setLocationBusy(false)
      setLocationStatus(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. Enter the address manually.' : 'Could not get your location. Enter the address manually.')
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 })
  }
  const checkout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!accountSession) { setAuthMode('login'); setAuthError('Sign in or create an account before checkout. Your bag is saved.'); setAccountOpen(true); return }
    if (!supabaseUrl || !supabaseAnonKey) { setCheckoutError('Online checkout is not connected yet. Please contact the store to place your order.'); return }
    setCheckoutBusy(true)
    setCheckoutError('')
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Secure checkout could not load. Check your connection and try again.')
      const customer: Record<string, any> = Object.fromEntries(['name', 'email', 'phone', 'line1', 'line2', 'city', 'state', 'postal_code'].map((name) => [name, String(form.get(name) ?? '').trim()])); if (addressCoordinates) Object.assign(customer, addressCoordinates)
      const invoke = async (functionName: string, body: unknown) => {
        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey, Authorization: `Bearer ${accountSession.access_token}` }, body: JSON.stringify(body) })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Could not start payment. Please try again.')
        return payload
      }
      const order = await invoke('create-payment-order', { customer, items: cart.map((line) => ({ productId: line.productId, size: line.size, colour: line.colour, quantity: line.quantity })) })
      if (!window.Razorpay) throw new Error('Secure checkout could not load. Please try again.')
      const payment = new window.Razorpay({ key: order.key_id, amount: order.amount, currency: order.currency, name: storeConfig.brand, description: `Order ${order.order_number}`, order_id: order.razorpay_order_id, prefill: { name: customer.name, email: customer.email, contact: customer.phone }, theme: { color: '#a20b10' }, modal: { ondismiss: () => setCheckoutBusy(false) }, handler: async (result) => {
        try {
          await invoke('verify-payment', result)
          setCart([])
          setPaymentNeedsReview(false)
          setPreparedOrder('')
          localStorage.removeItem('hh-brandings-cart')
          setCartOpen(false)
          setCheckoutBusy(false)
          say(`Payment confirmed. Your order number is ${order.order_number}.`)
        } catch (error) { setCheckoutError(error instanceof Error ? `${error.message} Do not retry payment yet; contact the store to confirm your order.` : 'Payment verification is pending. Do not retry yet; contact the store to confirm your order.'); setPaymentNeedsReview(true); setCheckoutBusy(false) }
      } })
      payment.on('payment.failed', (failure) => { setCheckoutError(failure.error?.description || 'Payment was not completed. You can try again.'); setCheckoutBusy(false) })
      payment.open()
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Could not start payment. Please try again.')
      setCheckoutBusy(false)
    }
  }
  const submitCustom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const referenceLine = referenceImage ? `Reference image: ${referenceImage.name} (I'll attach it in WhatsApp)` : 'Reference image: None'
    const message = `Hi ${storeConfig.brand}, I'd like a custom T-shirt quote.\n\nName: ${data.get('name')}\nWhatsApp: ${data.get('phone')}\nT-shirt type: ${data.get('type')}\nQuantity: ${data.get('quantity')}\nSize requirements: ${data.get('sizes')}\nPreferred colour: ${data.get('colour')}\nDesign details: ${data.get('design')}\n${referenceLine}`
    setCustomPreview(message)
  }
  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthSubmitting(true); setAuthError(''); setAuthNotice('')
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') ?? '').trim()
    const password = String(values.get('password') ?? '')
    try {
      const result = authMode === 'signup'
        ? await authRequest('signup', { email, password, data: { full_name: String(values.get('full_name') ?? '').trim() } })
        : await authRequest('token?grant_type=password', { email, password })
      const session = toCustomerSession(result)
      if (!session) setAuthNotice('Check your email for a confirmation link, then return here to sign in.')
      else {
        localStorage.setItem('hh-brandings-session', JSON.stringify(session))
        setAccountSession(session); setAccountOpen(false); setAuthError('')
        say(`Signed in as ${session.user.email}. Continue checkout when you're ready.`)
      }
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Could not sign in. Please try again.') }
    finally { setAuthSubmitting(false) }
  }
  const signOut = async () => {
    if (accountSession) { try { await authRequest('logout', undefined, accountSession.access_token, 'POST') } catch { /* still clear this browser session */ } }
    localStorage.removeItem('hh-brandings-session')
    setAccountSession(null); setCustomerOrders([]); setIsAdmin(false); setTrackingOrderId(null); setAuthMode('login'); setAuthError(''); setAuthNotice('')
  }
  const openAccount = () => { setAuthMode('login'); setAuthError(''); setAuthNotice(''); setTrackingOrderId(null); setAccountOpen(true) }
  const updateOrderTracking = async (orderId: string, draft: TrackingDraft) => {
    if (!accountSession || !supabaseUrl || !supabaseAnonKey) return
    setTrackingSaving(true); setTrackingError(''); setTrackingNotice('')
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/update-order-tracking`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey, Authorization: `Bearer ${accountSession.access_token}` }, body: JSON.stringify({ orderId, ...draft }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save tracking update.')
      setTrackingNotice(`Tracking updated for ${result.order_number}.`)
      setOrdersRefresh((current) => current + 1)
    } catch (error) { setTrackingError(error instanceof Error ? error.message : 'Could not save tracking update.') }
    finally { setTrackingSaving(false) }
  }

  const chooseReferenceImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { say('Choose an image file to use as your reference.'); event.currentTarget.value = ''; return }
    if (file.size > 10 * 1024 * 1024) { say('Choose an image smaller than 10 MB.'); event.currentTarget.value = ''; return }
    setReferenceImage(file)
    setReferencePreview(URL.createObjectURL(file))
    setCustomPreview('')
  }
  const removeReferenceImage = () => {
    setReferenceImage(null)
    setReferencePreview('')
    const input = document.querySelector<HTMLInputElement>('#reference-image')
    if (input) input.value = ''
    setCustomPreview('')
  }

  const card = (product: Product) => <article className="product-card" key={product.id}>
    <button className="product-image" style={{ backgroundImage: `url(${product.fallbackImage})` }} onClick={() => openProduct(product)} aria-label={`View ${product.name}`}><img src={product.image} alt={product.alt} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = product.fallbackImage }} />{product.badge && <span className="badge">{product.badge}</span>}<span className="image-quick">Quick view <ArrowUpRight size={15}/></span></button>
    <div className="product-info"><div><button className="product-title" onClick={() => openProduct(product)}>{product.name}</button><span className="product-category">{product.category}</span></div><div className="product-price">{formatPrice(product.price)}{product.originalPrice && <s>{formatPrice(product.originalPrice)}</s>}</div></div>
    <div className="swatches" aria-label={`${product.name} available colours`}>{product.colours.slice(0, 4).map((colour) => <i key={colour.name} title={colour.name} style={{ background: colour.hex }} />)}<span>{product.colours.length} colours</span></div>
  </article>

  return <>
    {showIntro && <div className="brand-intro" role="status" aria-label={`${storeConfig.brand} ${storeConfig.city}`}><img src={storeConfig.logoImage} alt={`${storeConfig.brand} ${storeConfig.city}`}/></div>}
    <div className="announcement">{storeConfig.announcement}<span> - </span><button onClick={() => goTo('shop')}>SHOP THE DROP <ArrowRight size={13}/></button></div>
    <header className="site-header"><button className="mobile-menu icon-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu/></button><a className="brand-lockup" href="#home" onClick={(e) => { e.preventDefault(); goTo('home') }}><img src={storeConfig.logoImage} alt={`${storeConfig.brand} ${storeConfig.city}`}/><span><b>{storeConfig.brand}</b><small>{storeConfig.city.toUpperCase()}</small></span></a><nav className="desktop-nav"><button onClick={() => goTo('home')}>Home</button><button onClick={() => goTo('shop')}>Shop</button><button onClick={() => goTo('collections')}>Collections</button><button onClick={() => goTo('custom')}>Custom Prints</button><button onClick={() => goTo('about')}>About</button><button onClick={() => goTo('contact')}>Contact</button><button onClick={() => goTo('reviews')}>Reviews</button><button onClick={openAccount}>Track order</button></nav><div className="header-actions"><button className="icon-btn search-toggle" aria-label="Search products" onClick={() => { if (window.innerWidth <= 700) { setMobileSearch(!mobileSearch); goTo('shop') } else { goTo('shop'); window.setTimeout(() => document.querySelector<HTMLInputElement>('.search-field input')?.focus(), 350) } }}><Search/></button><button className="icon-btn account-toggle" onClick={openAccount} aria-label={accountSession ? 'Open customer dashboard' : 'Sign in to your account'} title={accountSession ? 'My account' : 'Sign in'}><UserRound/></button><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${cartCount} items`}><ShoppingBag/><span>Bag ({cartCount})</span></button></div></header>
    {menuOpen && <div className="mobile-menu-panel"><button className="panel-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X/></button>{[['Home','home'],['Shop','shop'],['Collections','collections'],['Custom Prints','custom'],['About','about'],['Contact','contact'],['Reviews','reviews']].map(([label,id]) => <button key={id} onClick={() => goTo(id)}>{label}<ArrowUpRight size={18}/></button>)}<button onClick={() => { setMenuOpen(false); openAccount() }}>Track order<UserRound size={18}/></button></div>}
    {mobileSearch && <div className="mobile-search"><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tees and prints" aria-label="Search products"/><button onClick={() => setMobileSearch(false)} aria-label="Close search"><X/></button></div>}

    {contentPage === 'contact' ? <main className="info-page contact-page"><section className="info-page-heading"><span className="eyebrow">H&H BRANDINGS | HYDERABAD</span><h1>Let's talk<br/><em>prints.</em></h1><p>Questions about a tee, a custom design or an order? Get in touch with our team.</p></section><section className="contact-info-grid"><div className="contact-info-card"><span className="info-icon"><Phone size={19}/></span><span className="eyebrow">CALL OR WHATSAPP</span><h2>91218 81137</h2><p>Reach us about products, custom prints and orders.</p><a className="button button-dark" href="tel:+919121881137">Call the studio <Phone size={15}/></a><a className="contact-text-link" href="https://wa.me/919121881137" target="_blank" rel="noreferrer">Message on WhatsApp <ArrowUpRight size={14}/></a></div><div className="contact-info-card"><span className="info-icon"><MapPin size={19}/></span><span className="eyebrow">FIND US</span><h2>Visit our studio</h2><p>{storeConfig.address}</p><a className="contact-text-link" href="https://maps.google.com/?q=Tirumala+Nagar,+Moula+Ali,+Hyderabad,+Telangana+500040" target="_blank" rel="noreferrer">Open directions in Google Maps <ArrowUpRight size={14}/></a><a className="instagram-link" href={storeConfig.instagramUrl} target="_blank" rel="noreferrer"><Instagram size={17}/> Visit us on Instagram</a></div></section><section className="contact-map-wrap"><div><span className="eyebrow">TIRUMALA NAGAR | MOULA ALI</span><h2>Made in Hyderabad.<br/><em>Made for you.</em></h2></div><iframe title="Map to H&H Brandings in Tirumala Nagar, Moula Ali, Hyderabad" src="https://maps.google.com/maps?q=Tirumala%20Nagar%2C%20Moula%20Ali%2C%20Hyderabad%2C%20Telangana%20500040&t=&z=14&ie=UTF8&iwloc=&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></section></main> : contentPage === 'reviews' ? <main className="info-page reviews-page"><section className="info-page-heading"><span className="eyebrow">YOUR WORDS MATTER</span><h1>Leave a<br/><em>review.</em></h1><p>We’re a growing studio. Tell us about your experience and help others find their next favorite print.</p></section><section className="review-compose"><div className="review-stars" role="group" aria-label="Choose a star rating">{[1,2,3,4,5].map((rating) => <button type="button" key={rating} onClick={() => setReviewRating(rating)} aria-label={`${rating} star${rating === 1 ? '' : 's'}`} aria-pressed={reviewRating === rating}><Star size={25} fill={rating <= reviewRating ? 'currentColor' : 'none'}/></button>)}</div><form className="review-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('review_name') || 'Customer').trim(); const text = String(data.get('review_text') || '').trim(); whatsapp(`Hi H&H Brandings, I'd like to share a ${reviewRating}-star review.\n\nName: ${name}\nReview: ${text}`) }}><label>Your name<input name="review_name" required maxLength={80} placeholder="Name"/></label><label>Your review<textarea name="review_text" required maxLength={1000} rows={5} placeholder="What did you think of your order or experience?"/></label><button className="button button-dark" type="submit">Send review on WhatsApp <ArrowUpRight size={16}/></button><small>Your review opens in WhatsApp for you to send. Reviews are not published on this page.</small></form></section><section className="review-note"><Star size={19}/><p>Every honest review helps us keep making better prints. Thank you for supporting a local Hyderabad business.</p></section></main> : <main>
      <section className="hero" id="home"><img className="hero-photo" src="/images/client/rebel-star-womens-tee.jpeg" alt="Streetwear styling for the H&H Brandings campaign" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/hh-brandings-hero.svg" }}/><div className="hero-overlay"/><div className="hero-copy"><span className="eyebrow">H&H BRANDINGS STUDIO | MADE FOR YOU</span><h1>Your idea.<br/><em>In rotation.</em></h1><p>Good tees. Better prints. Make the everyday a little more yours.</p><div className="hero-buttons"><button className="button button-light" onClick={() => goTo('shop')}>Shop collection <ArrowUpRight size={16}/></button><button className="hero-text-link" onClick={() => goTo('custom')}>Customize a tee <ArrowRight size={16}/></button></div></div><span className="hero-note">01 - PERSONAL STYLE, PRINTED</span><button className="hero-scroll" onClick={() => goTo('collections')}>SCROLL TO EXPLORE <ArrowDown size={14}/></button></section>

      <section className="intro-line"><span>SMALL BATCH PRINTS</span><p>Wear what <i>you mean.</i></p><span>{storeConfig.city.toUpperCase()} | EST. FOR THE EVERYDAY</span></section>
      <section className="section collections-section" id="collections"><div className="section-head"><div><span className="eyebrow">FIND YOUR FIT</span><h2>Pick your point of view.</h2></div><button className="under-link" onClick={() => goTo('shop')}>Shop all tees <ArrowUpRight size={16}/></button></div><div className="collection-grid">{[
        { title: 'Graphic Tees', caption: 'A little more to say.', image: '/images/client/rebel-star-front-back.jpeg', fallbackImage: '/images/client/rebel-star-front-back.jpeg', category: 'Graphic Tees' },
        { title: 'Oversized Tees', caption: 'Room to make it yours.', image: '/images/client/cream-oversized-front-back.jpeg', fallbackImage: '/images/client/cream-oversized-front-back.jpeg', category: 'Oversized Tees' },
        { title: 'Custom Prints', caption: 'Your artwork starts here.', image: '/images/client/sadar-dtf-poster-1.jpeg', fallbackImage: '/images/client/sadar-dtf-poster-1.jpeg', category: 'Custom Prints' },
        { title: 'Best Sellers', caption: 'The ones you come back to.', image: '/images/client/rebel-star-womens-tee.jpeg', fallbackImage: '/images/client/rebel-star-womens-tee.jpeg', category: 'Best Sellers' },
      ].map((item, i) => <button className={`collection-card collection-${i + 1}`} style={{ backgroundImage: `url(${item.fallbackImage})` }} key={item.title} onClick={() => { setCategory(item.category); goTo('shop') }}><img src={item.image} alt={`${item.title} collection`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = item.fallbackImage }}/><span className="collection-index">0{i + 1} / H&H EDIT</span><span className="collection-caption"><span><b>{item.title}</b><small>{item.caption}</small></span><i><ArrowUpRight size={18}/></i></span></button>)}</div></section>

      <section className="section shop-section" id="shop"><div className="section-head shop-head"><div><span className="eyebrow">THE H&H BRANDINGS LINEUP</span><h2>Good things, on repeat.</h2></div><p>Printed with care. Made for your everyday.</p></div><div className="catalog-controls"><div className="category-tabs" role="group" aria-label="Filter by category">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="catalog-tools"><label className="search-field"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tees" aria-label="Search tees"/><button onClick={() => setQuery('')} aria-label="Clear search" hidden={!query}><X size={14}/></button></label><label className="sort-control"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select><ChevronDown size={14}/></label></div></div><div className="product-grid">{visibleProducts.map(card)}</div>{visibleProducts.length === 0 && <div className="empty-results"><Shirt/><h3>No tees found</h3><p>Try another search or choose a different collection.</p><button className="under-link" onClick={() => { setQuery(''); setCategory('All tees') }}>Clear filters <ArrowRight size={15}/></button></div>}</section>

      <section className="custom-section" id="custom"><div className="custom-image" style={{ backgroundImage: "url(/images/client/sadar-dtf-poster-2.jpeg)" }}><img src="/images/client/sadar-dtf-poster-2.jpeg" alt="Sadar theme DTF shirt festival promotional design" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/client/sadar-dtf-poster-2.jpeg" }}/><span>YOUR DESIGN, IN GOOD COMPANY</span></div><div className="custom-content"><span className="eyebrow">MADE YOUR WAY</span><h2>Have a tee<br/>in <em>mind?</em></h2><p>Bring your idea, artwork or inside joke. We print personalized tees for you, your crew, your event or your next big thing.</p><ul><li><Check size={16}/> Custom graphics and personal details</li><li><Check size={16}/> Group, event and bulk orders</li><li><Check size={16}/> A real person to help with your print</li></ul><button className="button button-dark" onClick={() => goTo('custom-form')}>Tell us what you're thinking <ArrowRight size={16}/></button><small>We'll prepare an enquiry for you to review and send on WhatsApp.</small></div></section>

      <section className="custom-form-section" id="custom-form"><div className="form-intro"><span className="eyebrow">START A CUSTOM ORDER</span><h2>Let's make<br/><em>your idea real.</em></h2><p>Share a few details and we'll prepare a message you can review and send to the team.</p><div className="form-note"><span>01</span><p>No payment here. We'll confirm your quote and print details with you first.</p></div></div><form className="custom-form" onSubmit={submitCustom}><div className="form-row"><label>Your name<input name="name" required placeholder="Name"/></label><label>WhatsApp number<input name="phone" required type="tel" placeholder="Your number, with country code"/></label></div><div className="form-row"><label>T-shirt type<select name="type" required defaultValue=""><option value="" disabled>Select a fit</option><option>Classic fit</option><option>Oversized fit</option><option>Kids T-shirt</option><option>Help me choose</option></select></label><label>Quantity<input name="quantity" required type="number" min="1" defaultValue="1"/></label></div><div className="form-row"><label>Size requirements<input name="sizes" required placeholder="e.g. 2 M, 4 L, 2 XL"/></label><label>Preferred colour<input name="colour" required placeholder="e.g. Black, white, mixed"/></label></div><label>Tell us about your design<textarea name="design" required rows={4} placeholder="Artwork, placement, event date, or anything else we should know..."/></label><div className="reference-upload"><span className="reference-upload-label">REFERENCE IMAGE <small>OPTIONAL</small></span><input id="reference-image" className="reference-file-input" type="file" accept="image/*" onChange={chooseReferenceImage} aria-label="Upload a reference image"/><label className="reference-dropzone" htmlFor="reference-image"><ImagePlus size={21}/><span>{referenceImage ? <b>{referenceImage.name}</b> : <b>Add a reference image</b>}<small>Choose a photo or design · JPG, PNG or WebP · up to 10 MB</small></span><span className="reference-choose">Browse</span></label>{referencePreview && <div className="reference-preview"><img src={referencePreview} alt="Selected custom print reference preview"/><div><b>{referenceImage?.name}</b><small>Image selected. Attach it in WhatsApp after opening your enquiry.</small></div><button type="button" onClick={removeReferenceImage} aria-label="Remove reference image"><X size={16}/></button></div>}</div>
<button className="button button-dark" type="submit">Prepare WhatsApp enquiry <ArrowUpRight size={16}/></button>{customPreview && <div className="message-preview" role="status"><b>YOUR MESSAGE IS READY TO REVIEW</b><pre>{customPreview}</pre><button type="button" className="button button-green" onClick={() => whatsapp(customPreview)}>Open WhatsApp <ArrowUpRight size={15}/></button>{!storeConfig.whatsappNumber && <small>Demo setup: add the client's number in src/storeConfig.ts to activate the WhatsApp link.</small>}</div>}</form></section>

      <section className="story-section" id="about"><div className="story-copy"><span className="eyebrow">A LITTLE ABOUT US</span><h2>Made to be<br/><em>more you.</em></h2><p>H&H Brandings is a demo identity for a custom print studio built around self-expression. Start with a tee you love, bring us your idea, and we'll help turn it into something you'll reach for again and again.</p><button className="under-link" onClick={() => goTo('custom')}>Make something personal <ArrowUpRight size={16}/></button></div><div className="story-photo" style={{ backgroundImage: "url(/images/client/spirit-shirt-back.jpeg)" }}><img src="/images/client/spirit-shirt-back.jpeg" alt="White printed shirt showing a Spirit graphic on the back" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/client/spirit-shirt-back.jpeg" }}/><span>IDEAS LOOK GOOD ON YOU.</span></div><div className="story-values"><div><span>01 / THE BASE</span><b>Comfort-first cotton</b><small>Everyday staples picked for a soft feel and easy fit.</small></div><div><span>02 / THE PRINT</span><b>Care in every detail</b><small>Thoughtful methods and crisp artwork, made to wear.</small></div><div><span>03 / YOUR IDEA</span><b>Room to make it yours</b><small>Personal gifts, team tees and ideas still taking shape.</small></div></div></section>

<section className="payment-section"><div><span className="eyebrow">SECURE ONLINE CHECKOUT</span><h2>Checkout<br/><em>with confidence.</em></h2><p>Pay for the items in your bag using a payment method offered by Razorpay Checkout. The order is confirmed only after payment is verified.</p><small>Delivery charges, if applicable, are confirmed separately by the business.</small></div><div className="gateway-card"><span className="gateway-icon"><ShoppingBag size={23}/></span><b>RAZORPAY SECURE CHECKOUT</b><small>Enter delivery details and continue from your shopping bag.</small></div></section>

      <section className="contact-band" id="contact"><div><span className="eyebrow">LET'S TALK T-SHIRTS</span><h2>Good ideas look<br/><em>better printed.</em></h2></div><button className="button button-light" onClick={() => whatsapp(`Hi ${storeConfig.brand}, I'd love to talk about a custom T-shirt order.`)}>Say hello on WhatsApp <ArrowUpRight size={16}/></button></section>
    </main>}
    <footer className="footer"><div className="footer-top"><div className="footer-brand"><a className="brand-lockup" href="#home" onClick={(e) => { e.preventDefault(); goTo('home') }}><img src={storeConfig.logoImage} alt={`${storeConfig.brand} ${storeConfig.city}`}/><span><b>{storeConfig.brand}</b><small>{storeConfig.city.toUpperCase()}</small></span></a><p>Your style. Your print.<br/>Your statement.</p><span className="footer-demo">CUSTOM PRINTS | HYDERABAD</span></div><div className="footer-column"><b>EXPLORE</b><button onClick={() => goTo('shop')}>Shop all</button><button onClick={() => goTo('collections')}>Collections</button><button onClick={() => goTo('custom')}>Custom prints</button><button onClick={() => goTo('about')}>Our story</button><button onClick={() => goTo('reviews')}>Reviews</button><button onClick={() => goTo('contact')}>Contact</button></div><div className="footer-column"><b>CONTACT</b><button onClick={() => whatsapp(`Hi ${storeConfig.brand}, I have a question.`)}>WhatsApp | 91218 81137</button>{storeConfig.instagramUrl ? <a href={storeConfig.instagramUrl} target="_blank" rel="noreferrer">Instagram</a> : <span>Instagram | link to be added</span>}<a href={`mailto:${storeConfig.email}`}>{storeConfig.email}</a><span>{storeConfig.address}</span></div><div className="footer-column"><b>INFO</b><a href="#policies" onClick={(e) => { e.preventDefault(); say('Shipping policy details will be supplied by the business.') }}>Shipping policy</a><a href="#policies" onClick={(e) => { e.preventDefault(); say('Returns policy details will be supplied by the business.') }}>Returns policy</a><a href="#policies" onClick={(e) => { e.preventDefault(); say('Privacy policy content will be supplied by the business.') }}>Privacy policy</a></div></div><div className="footer-bottom"><span>Copyright {new Date().getFullYear()} {storeConfig.brand} | DEMO STOREFRONT BY UPVEBX</span><button onClick={() => goTo('home')}>BACK TO TOP  </button></div></footer>

    {accountOpen && <div className="account-backdrop"><section className="account-page" role="dialog" aria-modal="true" aria-label={accountSession ? 'Customer dashboard' : 'Customer account'}><header className="account-page-head"><a className="brand-lockup" href="#home" onClick={(event) => { event.preventDefault(); setAccountOpen(false); goTo('home') }}><img src={storeConfig.logoImage} alt=""/><span><b>{storeConfig.brand}</b><small>{storeConfig.city.toUpperCase()}</small></span></a><button className="icon-btn" onClick={() => setAccountOpen(false)} aria-label="Close account"><X/></button></header>{accountSession ? (trackingOrderId && customerOrders.find((order) => order.id === trackingOrderId) ? <OrderTrackingView key={`${trackingOrderId}:${ordersRefresh}`} order={customerOrders.find((order) => order.id === trackingOrderId)!} isAdmin={isAdmin} onBack={() => { setTrackingOrderId(null); setTrackingNotice('); setTrackingError(') }} onSave={updateOrderTracking} saving={trackingSaving} notice={trackingNotice} error={trackingError}/> : <main className="customer-dashboard"><div className="dashboard-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h2>Hello{accountSession.user.user_metadata?.full_name ? `, ${accountSession.user.user_metadata.full_name.split(' ')[0]}` : ''}.</h2><p>{accountSession.user.email}</p></div><button className="button button-dark dashboard-signout" onClick={signOut}><LogOut size={15}/> Sign out</button></div>{isAdmin && <p className="admin-mode-banner">Admin view · tracking updates are available on each order.</p>}<div className="orders-heading"><div><span className="eyebrow">ORDER HISTORY</span><h3>Your orders</h3></div><PackageCheck size={23}/></div>{ordersLoading ? <p className="dashboard-message">Loading your orders…</p> : ordersError ? <p className="dashboard-error" role="alert">{ordersError}</p> : customerOrders.length === 0 ? <div className="dashboard-empty"><PackageCheck size={29}/><h3>No orders yet</h3><p>Your paid orders and delivery updates will show up here.</p><button className="button button-dark" onClick={() => { setAccountOpen(false); goTo('shop') }}>Browse the collection <ArrowRight size={15}/></button></div> : <div className="customer-orders">{customerOrders.map((order) => <article className="customer-order" key={order.id}><header><div><span className="eyebrow">ORDER {order.order_number}</span><small>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(order.created_at))}</small></div><b className={`order-status status-${order.status}`}>{order.status.replaceAll('_', ' ')}</b></header><div className="customer-order-items">{order.order_items?.map((item, index) => <div key={`${item.size}-${index}`}><span>{item.product_snapshot?.name || 'T-shirt'} · {item.product_snapshot?.colour || ''} · Size {item.size} × {item.quantity}</span><b>{formatPrice(item.unit_price_inr * item.quantity)}</b></div>)}</div><div className="customer-order-total"><span>{order.status === 'pending' ? 'Order total' : 'Total'}</span><b>{formatPrice(order.total_inr)}</b></div><div className="tracking-panel"><h4>Order tracking</h4><ol>{(order.order_status_history?.length ? order.order_status_history : [{ status: order.status, note: '', created_at: order.created_at }]).map((step, index) => <li key={`${step.status}-${step.created_at}-${index}`} className="tracking-step"><i/><span><b>{step.status.replaceAll('_', ' ')}</b>{step.note && <small>{step.note}</small>}<small>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(step.created_at))}</small></span></li>)}</ol>{order.tracking_number ? <div className="carrier-details"><span>{order.carrier_name || 'Carrier'} tracking</span><b>{order.tracking_number}</b>{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer">Track shipment <ArrowUpRight size={14}/></a>}</div> : order.status === 'shipped' || order.status === 'delivered' ? <small className="tracking-pending">Carrier tracking details will appear here when available.</small> : null}</div><button className="track-order-button" onClick={() => { setTrackingOrderId(order.id); setTrackingNotice('); setTrackingError(') }}>Track this order <ArrowRight size={15}/></button></article>)}</div>}</main>) : <main className="account-auth"><div className="auth-icon"><UserRound size={24}/></div><span className="eyebrow">H&H BRANDINGS ACCOUNT</span><h2>{authMode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2><p>Sign in to checkout and keep your orders and delivery updates together.</p><form className="auth-form" onSubmit={submitAuth}>{authMode === 'signup' && <label>Full name<input name="full_name" autoComplete="name" required maxLength={100} placeholder="Your name"/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} required placeholder="At least 8 characters"/></label><button className="button button-dark" type="submit" disabled={authSubmitting}>{authSubmitting ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></button>{authError && <p className="auth-error" role="alert">{authError}</p>}{authNotice && <p className="auth-notice" role="status">{authNotice}</p>}</form><p className="auth-switch">{authMode === 'login' ? 'New to H&H Brandings?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthNotice('') }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p><small className="auth-footnote">Your cart stays saved while you sign in.</small></main>}</section></div>}    {cartOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><aside className="cart-drawer" aria-label="Shopping bag"><div className="drawer-head"><div><span className="eyebrow">YOUR SELECTION</span><h2>Your bag <small>({cartCount})</small></h2></div><button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close bag"><X/></button></div>{cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={33}/><h3>Your bag is taking a break.</h3><p>Find a tee that feels like you.</p><button className="button button-dark" onClick={() => { setCartOpen(false); goTo('shop') }}>Explore the collection <ArrowRight size={15}/></button></div> : <><div className="cart-lines">{cart.map((line) => { const product = lineProduct(line); if (!product) return null; return <article className="cart-line" key={`${line.productId}-${line.size}-${line.colour}`}><img src={product.image} alt={product.alt}/><div className="cart-line-info"><b>{product.name}</b><span>{line.colour} | Size {line.size}</span><strong>{formatPrice(product.price)}</strong><div className="quantity-control"><button aria-label={`Decrease ${product.name} quantity`} onClick={() => changeQuantity(line, -1)}><Minus size={13}/></button><span>{line.quantity}</span><button aria-label={`Increase ${product.name} quantity`} onClick={() => changeQuantity(line, 1)}><Plus size={13}/></button></div></div><button className="remove-line" aria-label={`Remove ${product.name}`} onClick={() => changeQuantity(line, -line.quantity)}><X size={16}/></button></article> })}</div><div className="cart-summary"><div><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><small>Delivery charges, if applicable, are confirmed separately.</small><form className="checkout-form" onSubmit={checkout}>{!accountSession ? <div className="checkout-login-prompt"><h3>Sign in to checkout</h3><p>Save your bag and track your order from your customer dashboard.</p><button className="button button-green" type="button" onClick={openAccount} disabled={authLoading}>{authLoading ? 'Checking account…' : <>Sign in or create an account <ArrowRight size={16}/></>}</button></div> : <><h3>Delivery details</h3><small className="checkout-account">Signed in as {accountSession.user.email}</small><label>Full name<input name="name" autoComplete="name" required defaultValue={accountSession.user.user_metadata?.full_name || ''} placeholder="Name"/></label><div className="checkout-fields"><label>Email<input name="email" type="email" autoComplete="email" required defaultValue={accountSession.user.email} placeholder="you@example.com"/></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required placeholder="+91"/></label></div><div className="address-tools"><div ref={placeAutocompleteHostRef} className="places-autocomplete-host"/><button type="button" className="use-location-button" onClick={useCurrentLocation} disabled={locationBusy}><MapPin size={15}/>{locationBusy ? 'Finding location…' : 'Use current location'}</button>{locationStatus && <small className="location-status" role="status">{locationStatus}</small>}</div><input type="hidden" name="latitude" value={addressCoordinates?.latitude ?? ""}/><input type="hidden" name="longitude" value={addressCoordinates?.longitude ?? ""}/><label>Address<input ref={addressLineRef} name="line1" autoComplete="address-line1" required placeholder="House number and street" onChange={() => setAddressCoordinates(null)}/></label><label>Address line 2 <span>(optional)</span><input name="line2" autoComplete="address-line2" placeholder="Apartment, landmark"/></label><div className="checkout-fields"><label>City<input ref={cityRef} name="city" autoComplete="address-level2" required defaultValue="Hyderabad" onChange={() => setAddressCoordinates(null)}/></label><label>State<input ref={stateRef} name="state" autoComplete="address-level1" required defaultValue="Telangana" onChange={() => setAddressCoordinates(null)}/></label></div><div className="checkout-fields"><label>PIN code<input ref={postalCodeRef} name="postal_code" inputMode="numeric" autoComplete="postal-code" required pattern="[0-9]{6}" maxLength={6} placeholder="6-digit PIN" onChange={() => setAddressCoordinates(null)}/></label></div><button className="button button-green" type="submit" disabled={checkoutBusy || paymentNeedsReview}>{paymentNeedsReview ? 'Payment needs confirmation' : checkoutBusy ? 'Connecting to secure checkout…' : <>Pay securely · {formatPrice(subtotal)} <ArrowUpRight size={16}/></>}</button>{checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}<small>Secure payment is processed by Razorpay. Your order is confirmed after payment verification.</small></>}</form><button className="cart-whatsapp" onClick={() => whatsapp(orderText)}>Questions? Continue with WhatsApp <ArrowUpRight size={14}/></button>{preparedOrder && <div className="message-preview cart-message" role="status"><b>ORDER MESSAGE | REVIEW BEFORE SENDING</b><pre>{preparedOrder}</pre></div>}<p>Custom print enquiries still need a quote before payment.</p></div></>}</aside></div>}

    {activeProduct && selection && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProduct(null) }}><section className="product-modal" role="dialog" aria-modal="true" aria-label={`${activeProduct.name} details`}><button className="modal-close icon-btn" onClick={() => setActiveProduct(null)} aria-label="Close details"><X/></button><div className="modal-photo" style={{ backgroundImage: `url(${activeProduct.fallbackImage})` }}><img src={activeProduct.image} alt={activeProduct.alt} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = activeProduct.fallbackImage }}/>{selection.colour && <span className="garment-tint" aria-hidden="true" style={{ backgroundColor: activeProduct.colours.find((colour) => colour.name === selection.colour)?.hex }}/>}</div><div className="modal-details"><span className="eyebrow">{activeProduct.category} | H&H BRANDINGS STUDIO</span><h2>{activeProduct.name}</h2><div className="modal-price">{formatPrice(activeProduct.price)}{activeProduct.originalPrice && <s>{formatPrice(activeProduct.originalPrice)}</s>}</div><p>{activeProduct.description}</p><small className="print-detail">PRINT DETAIL <b>{activeProduct.print}</b></small><div className="variant-group"><b>COLOUR <span>{selection.colour || 'Select a colour'}</span></b><div className="colour-options">{activeProduct.colours.map((colour) => <button key={colour.name} className={selection.colour === colour.name ? 'active' : ''} onClick={() => setSelection({ ...selection, colour: colour.name })} aria-label={`Select ${colour.name}`} title={colour.name}><i style={{ background: colour.hex }}/></button>)}</div></div><div className="variant-group"><b>SIZE <span>SIZE GUIDE</span></b><div className="size-options">{activeProduct.sizes.map((size) => <button key={size} className={selection.size === size ? 'active' : ''} onClick={() => setSelection({ ...selection, size })}>{size}</button>)}</div></div><div className="modal-actions"><div className="quantity-control"><button onClick={() => setSelection({ ...selection, quantity: Math.max(1, selection.quantity - 1) })} aria-label="Decrease quantity"><Minus size={14}/></button><span>{selection.quantity}</span><button onClick={() => setSelection({ ...selection, quantity: selection.quantity + 1 })} aria-label="Increase quantity"><Plus size={14}/></button></div><button className="button button-dark" onClick={addToCart}>Add to bag | {formatPrice(activeProduct.price * selection.quantity)} <ArrowRight size={16}/></button></div><button className="modal-whatsapp" onClick={() => whatsapp(`Hi ${storeConfig.brand}, I'm interested in ${activeProduct.name}. Please help me with sizes and colours.`)}>Ask about this tee on WhatsApp <ArrowUpRight size={15}/></button></div></section></div>}
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}
  </>
}

export default App





























