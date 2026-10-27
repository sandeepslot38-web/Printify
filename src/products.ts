export type Product = {
  id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  image: string
  fallbackImage: string
  alt: string
  badge?: string
  colours: { name: string; hex: string }[]
  sizes: string[]
  description: string
  print: string
}

const image = (file: string) => `/images/client/${file}`
const blackFrontBack = image('rebel-star-front-back.jpeg')
const creamFrontBack = image('cream-oversized-front-back.jpeg')
const womensRebel = image('rebel-star-womens-tee.jpeg')
const footPrint = image('black-shirt-foot-print.jpeg')
const facePocket = image('black-shirt-face-pocket.jpeg')
const sadarPoster1 = image('sadar-dtf-poster-1.jpeg')
const sadarPoster2 = image('sadar-dtf-poster-2.jpeg')
const spiritShirt = image('spirit-shirt-back.jpeg')

const product = (details: Omit<Product, 'fallbackImage'>): Product => ({ ...details, fallbackImage: details.image })

export const products: Product[] = [
  product({ id: '01', name: 'Rebel Star Graphic Tee', category: 'Graphic Tees', price: 899, originalPrice: 1199, image: blackFrontBack, alt: 'Black Rebel Star graphic tee shown front and back', badge: 'BESTSELLER', colours: [{ name: 'Ink', hex: '#252525' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A bold, movie-inspired graphic on a relaxed black tee. Front and back artwork shown.', print: 'Printed graphic' }),
  product({ id: '02', name: 'Cream Oversized Graphic Tee', category: 'Oversized Tees', price: 1099, image: creamFrontBack, alt: 'Cream oversized graphic tee modeled front and back', badge: 'NEW DROP', colours: [{ name: 'Cream', hex: '#e9e3d7' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A relaxed cream tee with bold red and black artwork, shown from both sides.', print: 'Printed graphic' }),
  product({ id: '03', name: 'Sadar Theme DTF Shirt', category: 'Custom Prints', price: 999, image: sadarPoster1, alt: 'Sadar theme DTF printed shirt promotional artwork', colours: [{ name: 'White', hex: '#f8f7f3' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A festive Sadar theme shirt design. Contact the studio to confirm sizes and current pricing.', print: 'DTF print' }),
  product({ id: '04', name: 'Spirit Graphic Tee', category: 'Graphic Tees', price: 899, image: spiritShirt, alt: 'Back of a white shirt with a Spirit themed graphic', colours: [{ name: 'White', hex: '#f8f7f3' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A statement back print on a white tee, with Telugu text and warm metallic artwork.', print: 'Printed graphic' }),
  product({ id: '05', name: 'Rebel Star Women’s Tee', category: 'Best Sellers', price: 949, image: womensRebel, alt: 'Model wearing a black Rebel Star graphic tee', badge: 'FAN FAVOURITE', colours: [{ name: 'Ink', hex: '#252525' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A black graphic tee styled for an easy everyday fit.', print: 'Printed graphic' }),
  product({ id: '06', name: 'Decorative Foot Print Shirt', category: 'Oversized Tees', price: 1099, image: footPrint, alt: 'Back of a black shirt with a decorative foot illustration', colours: [{ name: 'Ink', hex: '#252525' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A black shirt featuring a detailed traditional inspired back illustration.', print: 'Printed graphic' }),
  product({ id: '07', name: 'Face Print Pocket Shirt', category: 'Graphic Tees', price: 899, image: facePocket, alt: 'Black button shirt with a colorful face design on its chest pocket', colours: [{ name: 'Ink', hex: '#252525' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A black button shirt featuring a colorful illustrated chest pocket.', print: 'Printed pocket graphic' }),
  product({ id: '08', name: 'Sadar Festival Shirt', category: 'Custom Prints', price: 999, image: sadarPoster2, alt: 'Sadar theme printed shirt shown in festival promotional artwork', badge: 'FESTIVE PICK', colours: [{ name: 'White', hex: '#f8f7f3' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A festive printed shirt design. Contact the studio to confirm sizes and current pricing.', print: 'DTF print' }),
]

export const categories = ['All tees', 'Graphic Tees', 'Oversized Tees', 'Custom Prints', 'Best Sellers']
