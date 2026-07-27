/**
 * One-shot brand asset export (sharp + to-ico).
 * Usage: node scripts/export-brand-assets.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brand = path.join(root, 'assets', 'brand')
const assets = path.join(root, 'assets')

async function raster(svgName, outPath, width, height) {
  const input = path.join(brand, svgName)
  await sharp(input, { density: 300 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath)
  console.log('wrote', path.relative(root, outPath))
}

async function main() {
  await raster('icon.svg', path.join(assets, 'icon.png'), 512, 512)
  await raster('tray.svg', path.join(assets, 'tray.png'), 32, 32)
  await raster('tray.svg', path.join(assets, 'tray-16.png'), 16, 16)
  await raster('banner.svg', path.join(brand, 'banner.png'), 1280, 400)
  await raster('social.svg', path.join(brand, 'social.png'), 1280, 640)
  await raster('logo.svg', path.join(brand, 'logo.png'), 512, 512)
  await raster('logo-full.svg', path.join(brand, 'logo-full.png'), 840, 256)

  const iconPng = fs.readFileSync(path.join(assets, 'icon.png'))
  const sizes = await Promise.all(
    [16, 32, 48, 64, 128, 256].map((s) =>
      sharp(iconPng).resize(s, s).png().toBuffer(),
    ),
  )
  const ico = await toIco(sizes)
  fs.writeFileSync(path.join(assets, 'icon.ico'), ico)
  console.log('wrote assets/icon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
