/**
 * 为 dist 内 js/css 等生成 .gz，供 nginx gzip_static 直出，降低服务器 CPU 与首包时延。
 * Usage: node ../scripts/gzip-dist.mjs dist
 */
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || 'dist')
if (!existsSync(root)) {
  console.error(`[gzip-dist] missing: ${root}`)
  process.exit(1)
}

let n = 0
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) {
      walk(p)
      continue
    }
    if (!/\.(js|css|html|svg|json|mjs)$/i.test(name) || name.endsWith('.gz')) continue
    const buf = readFileSync(p)
    if (buf.length < 1024) continue
    writeFileSync(`${p}.gz`, gzipSync(buf, { level: 9 }))
    n += 1
  }
}

walk(root)
console.log(`[gzip-dist] wrote ${n} .gz under ${root}`)
