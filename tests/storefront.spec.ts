import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title === 'H&H logo intro completes after 2 seconds') return
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' })
})

test('H&H logo intro completes after 2 seconds', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('https://images.unsplash.com/**', (route) => route.abort())
  const started = Date.now()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.brand-intro')).toBeVisible()
  await expect(page.locator('.brand-intro img')).toHaveAttribute('src', '/images/hh-branding-logo.jpg')
  await expect.poll(() => page.locator('.brand-intro').evaluate((element) => getComputedStyle(element).animationDuration)).toBe('2s')
  await expect(page.locator('.brand-intro')).toHaveCount(0, { timeout: 3000 })
  expect(Date.now() - started).toBeGreaterThanOrEqual(1700)
  expect(Date.now() - started).toBeLessThan(3000)
})

test('reduced-motion preference skips the logo intro', async ({ page }) => {
  await expect(page.locator('.brand-intro')).toHaveCount(0)
})

test('catalogue filters, searches and sorts the demo tees', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Your idea. In rotation.' })).toBeVisible()
  await page.locator('.category-tabs').getByRole('button', { name: 'Custom Prints', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(2)
  await page.getByRole('textbox', { name: 'Search tees' }).fill('crew')
  await expect(page.locator('.product-card')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Your Team, Your Tee', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search tees' }).fill('no matching tee')
  await expect(page.getByRole('heading', { name: 'No tees found' })).toBeVisible()
})

test('product variant selection, cart updates and persistence work', async ({ page }) => {
  await page.getByRole('button', { name: 'View Good Things Take Time' }).click()
  await page.getByRole('button', { name: 'Select Chalk' }).click()
  await page.getByRole('button', { name: 'M', exact: true }).click()
  await page.getByRole('button', { name: /Add to bag/ }).click()
  await page.getByRole('button', { name: /Shopping bag, 1 items/ }).click()
  await expect(page.getByText('Chalk | Size M')).toBeVisible()
  await page.getByRole('button', { name: 'Increase Good Things Take Time quantity' }).click()
  await expect(page.getByRole('heading', { name: /Your bag \(2\)/ })).toBeVisible()
  await page.getByRole('button', { name: 'Order via WhatsApp' }).click()
  await expect(page.locator('.cart-message')).toContainText('Good Things Take Time')
  await expect(page.locator('.cart-message')).toContainText('Size M, Chalk - Qty 2')
  await expect(page.locator('.cart-message')).toContainText('Subtotal:')
  await expect(page.locator('.cart-message')).toContainText('1,798')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Shopping bag, 2 items/ }).click()
  await expect(page.getByText('Chalk | Size M')).toBeVisible()
  await expect(page.getByText('1,798').last()).toBeVisible()
})

test('different product colour variants stay separate while duplicate variants merge', async ({ page }) => {
  const addVariant = async (colour: string) => {
    await page.getByRole('button', { name: 'View Good Things Take Time' }).click()
    await page.getByRole('button', { name: `Select ${colour}` }).click()
    await page.getByRole('button', { name: 'M', exact: true }).click()
    await page.getByRole('button', { name: /Add to bag/ }).click()
  }
  await addVariant('Chalk')
  await addVariant('Ink')
  await addVariant('Chalk')
  await page.getByRole('button', { name: /Shopping bag, 3 items/ }).click()
  await expect(page.locator('.cart-line')).toHaveCount(2)
  await expect(page.locator('.cart-line').filter({ hasText: 'Chalk | Size M' })).toContainText('2')
  await expect(page.locator('.cart-line').filter({ hasText: 'Ink | Size M' })).toContainText('1')
})

test('custom enquiry validates required fields and prepares a reviewable WhatsApp message', async ({ page }) => {
  await page.getByRole('button', { name: "Tell us what you're thinking" }).click()
  await page.getByRole('button', { name: 'Prepare WhatsApp enquiry' }).click()
  await expect(page.locator('input[name="name"]')).toHaveAttribute('required', '')
  await page.locator('input[name="name"]').fill('Demo Customer')
  await page.locator('input[name="phone"]').fill('+91 9000000000')
  await page.locator('select[name="type"]').selectOption('Oversized fit')
  await page.locator('input[name="quantity"]').fill('12')
  await page.locator('input[name="sizes"]').fill('4 M, 4 L, 4 XL')
  await page.locator('input[name="colour"]').fill('Black')
  await page.locator('textarea[name="design"]').fill('Club event print, left chest')
  await page.getByRole('button', { name: 'Prepare WhatsApp enquiry' }).click()
  await expect(page.getByText('YOUR MESSAGE IS READY TO REVIEW')).toBeVisible()
  await expect(page.locator('.message-preview')).toContainText('Quantity: 12')
  await expect(page.locator('.message-preview')).toContainText('Club event print, left chest')
})

test('mobile navigation works and the layout fits requested viewport widths', async ({ page }) => {
  for (const width of [375, 430, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    if (width === 375) {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.locator('.mobile-menu-panel').getByRole('button', { name: 'Shop' }).click()
      await expect(page.locator('#shop')).toBeInViewport()
    }
    const pageWidth = await page.locator('body').evaluate((el) => el.scrollWidth)
    expect(pageWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width)
  }
})

test('empty bag state and demo WhatsApp configuration are clear', async ({ page }) => {
  await page.getByRole('button', { name: /Shopping bag/ }).click()
  await expect(page.getByRole('heading', { name: 'Your bag is taking a break.' })).toBeVisible()
  await page.getByRole('button', { name: 'Explore the collection' }).click()
  await page.getByRole('button', { name: 'View Good Things Take Time' }).click()
  await page.getByRole('button', { name: 'Ask about this tee on WhatsApp' }).click()
  await expect(page.getByRole('status')).toContainText('Review the prepared message')
})

test('storefront image assets load locally without remote image requests', async ({ page }) => {
  await page.route('https://images.unsplash.com/**', (route) => route.abort())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0))
  const sources = await page.locator('img').evaluateAll((images) => images.map((image) => (image as HTMLImageElement).getAttribute('src')))
  expect(sources.length).toBeGreaterThanOrEqual(14)
  expect(sources.every((source) => source?.startsWith('/images/'))).toBe(true)
})



