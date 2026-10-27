export type Product = {
  id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  image: string
  alt: string
  badge?: string
  colours: { name: string; hex: string }[]
  sizes: string[]
  description: string
  print: string
}

const teePhoto = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=85'
const modelPhoto = 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85'
const campaignPhoto = 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85'
const studioPhoto = 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1000&q=85'
const editorialPhoto = 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85'

export const products: Product[] = [
  { id: '01', name: 'Good Things Take Time', category: 'Graphic Tees', price: 899, originalPrice: 1199, image: teePhoto, alt: 'White cotton graphic t-shirt', badge: 'BESTSELLER', colours: [{ name: 'Chalk', hex: '#f2eee6' }, { name: 'Ink', hex: '#252525' }, { name: 'Sage', hex: '#8b9988' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A little reminder for the everyday. Printed on a soft, heavyweight tee with an easy unisex fit.', print: 'Water-based screen print' },
  { id: '02', name: 'Offline Club', category: 'Oversized Tees', price: 1099, image: modelPhoto, alt: 'Relaxed oversized streetwear t-shirt', badge: 'NEW DROP', colours: [{ name: 'Washed black', hex: '#353535' }, { name: 'Bone', hex: '#ded8cc' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'For the plans that can wait. An oversized silhouette with a relaxed shoulder and a soft, lived-in feel.', print: 'Soft-hand DTG print' },
  { id: '03', name: 'Make Your Own', category: 'Custom Prints', price: 999, image: campaignPhoto, alt: 'Blank t-shirt ready for a custom print', colours: [{ name: 'White', hex: '#f8f7f3' }, { name: 'Black', hex: '#252525' }, { name: 'Natural', hex: '#cabea8' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'Your artwork, your words, your way. Start with our premium blank and tell us what you have in mind.', print: 'Choose screen print or DTG' },
  { id: '04', name: 'Small Town Energy', category: 'Graphic Tees', price: 899, image: editorialPhoto, alt: 'Lifestyle photo for a graphic tee', colours: [{ name: 'Cream', hex: '#e9e3d7' }, { name: 'Moss', hex: '#687462' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A hometown state of mind, wherever you end up. Easy fit, soft cotton and a graphic that feels like yours.', print: 'Water-based screen print' },
  { id: '05', name: 'Good Mood Department', category: 'Best Sellers', price: 949, image: studioPhoto, alt: 'Printed t-shirt on a studio model', badge: 'FAN FAVOURITE', colours: [{ name: 'White', hex: '#f8f7f3' }, { name: 'Rose', hex: '#c98479' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'An everyday uniform for brighter days, printed in small batches on our soft cotton base.', print: 'Soft-hand DTG print' },
  { id: '06', name: 'Out of Office', category: 'Oversized Tees', price: 1099, image: teePhoto, alt: 'Oversized relaxed fit white t-shirt', colours: [{ name: 'Chalk', hex: '#f2eee6' }, { name: 'Blue', hex: '#708499' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'A relaxed weekend state of mind, in a roomy oversized tee that is ready to go anywhere.', print: 'Water-based screen print' },
  { id: '07', name: 'The Sunday Special', category: 'Graphic Tees', price: 899, image: editorialPhoto, alt: 'Graphic t-shirt styled for a casual day', colours: [{ name: 'Oat', hex: '#d6c8b1' }, { name: 'Ink', hex: '#252525' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'Made for slow mornings and one-more-coffee afternoons. Printed on a breathable cotton tee.', print: 'Water-based screen print' },
  { id: '08', name: 'Your Team, Your Tee', category: 'Custom Prints', price: 799, originalPrice: 999, image: modelPhoto, alt: 'Group-ready custom t-shirt style', badge: 'BULK READY', colours: [{ name: 'White', hex: '#f8f7f3' }, { name: 'Black', hex: '#252525' }, { name: 'More colours', hex: '#b5a993' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: 'One design, the whole crew. Tell us about your event or team and we will help bring it to life.', print: 'Bulk print options available' },
]

export const categories = ['All tees', 'Graphic Tees', 'Oversized Tees', 'Custom Prints', 'Best Sellers']
