export const storeConfig = {
  brand: 'THREADLAB',
  announcement: 'YOUR IDEA. OUR INK. MADE TO BE WORN.',
  currency: 'INR',
  locale: 'en-IN',
  whatsappNumber: '', // Add the business number in international format, digits only.
  instagramUrl: '#', // Replace with the client's Instagram URL.
  upiQrImage: '', // Optional: path or URL to the supplied UPI QR image.
  email: 'hello@yourbrand.example',
  city: 'Made in India',
}

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat(storeConfig.locale, {
    style: 'currency',
    currency: storeConfig.currency,
    maximumFractionDigits: 0,
  }).format(amount)

export const whatsappUrl = (message: string) =>
  storeConfig.whatsappNumber
    ? `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(message)}`
    : ''
