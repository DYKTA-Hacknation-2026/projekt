import { chromium } from "@playwright/test"

const url = "http://127.0.0.1:3100/"
const out = "C:/Users/Mateusz/AppData/Local/Temp/opencode/shots"

const browser = await chromium.launch()

async function openPage(viewport, options = {}) {
  const page = await browser.newPage({
    viewport,
    colorScheme: options.dark ? "dark" : "light",
    deviceScaleFactor: options.scale ?? 1,
    isMobile: options.mobile ?? false,
    hasTouch: options.mobile ?? false,
  })
  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForTimeout(800)
  return page
}

async function loadLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.8)
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
  })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto"
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  })
  await page.waitForTimeout(500)
  const scrollY = await page.evaluate(() => window.scrollY)
  if (scrollY !== 0) {
    console.warn("scroll reset failed:", scrollY)
  }
}

async function capture(name, viewport, options = {}) {
  const page = await openPage(viewport, options)
  await page.screenshot({ path: `${out}/final-${name}-hero.png` })
  if (options.full) {
    await loadLazyContent(page)
    await page.addStyleTag({
      content:
        "header { position: static !important; } html { scroll-padding-top: 0 !important; }",
    })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await page.screenshot({
      path: `${out}/final-${name}-full.png`,
      fullPage: true,
    })
  }
  await page.close()
}

await capture("desktop", { width: 1440, height: 1000 }, { full: true })
await capture("tablet", { width: 1024, height: 900 }, { full: true })
await capture("tablet-portrait", { width: 768, height: 1000 }, { full: true })
await capture(
  "mobile",
  { width: 390, height: 844 },
  { full: true, mobile: true, scale: 2 }
)
await capture("dark", { width: 1440, height: 1000 }, { dark: true })

await browser.close()
console.log("final screenshots done")
