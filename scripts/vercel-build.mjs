import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'dist')
const output = resolve(root, '.vercel/output')
const staticDir = resolve(output, 'static')
const apiOrigin =
  'https://kutsaga-app.livelybush-d14e9c76.switzerlandnorth.azurecontainerapps.io'

if (!existsSync(resolve(source, 'index.html'))) {
  throw new Error('dist/index.html was not created by Vite')
}

rmSync(output, { recursive: true, force: true })
mkdirSync(staticDir, { recursive: true })
cpSync(source, staticDir, { recursive: true, force: true })

const config = {
  version: 3,
  routes: [
    { src: '^/api/(.*)$', dest: `${apiOrigin}/api/$1` },
    { src: '^/health/(.*)$', dest: `${apiOrigin}/health/$1` },
    { src: '^/health$', dest: `${apiOrigin}/health` },
    { handle: 'filesystem' },
    { src: '^/(.*)$', dest: '/index.html' },
  ],
}

writeFileSync(resolve(output, 'config.json'), `${JSON.stringify(config, null, 2)}\n`)
console.log('Wrote .vercel/output/static and .vercel/output/config.json')
