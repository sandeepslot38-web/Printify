export const storeConfig = {
  brand: 'H&H BRANDINGS',
  logoImage: '/images/hh-branding-logo.jpg',
  announcement: 'YOUR IDEA. OUR INK. MADE TO BE WORN.',
  currency: 'INR',
  locale: 'en-IN',
  whatsappNumber: '919121881137',
  instagramUrl: 'https://www.instagram.com/printify_hh?obrf=NHBsNTN6c3R1dGw4',
  email: 'hello@yourbrand.example',
  city: 'Hyderabad',
  address: 'Tirumala Nagar, Moula Ali, Hyderabad, Secunderabad, Telangana 500040, India',
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


