/* global process */
import { spawn } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_ORIGIN || 'http://127.0.0.1:5001'
const configDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(configDir, '../Backend')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isLocalBackendTarget(target) {
  try {
    const url = new URL(target)
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  } catch {
    return false
  }
}

function pingBackend(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const client = url.protocol === 'https:' ? https : http
    const request = client.get(url, (response) => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 500)
    })

    request.setTimeout(timeoutMs, () => {
      request.destroy()
      resolve(false)
    })

    request.on('error', () => resolve(false))
  })
}

async function waitForBackend(url, timeoutMs = 12000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await pingBackend(url)) {
      return true
    }

    await sleep(300)
  }

  return false
}

function autoStartBackendPlugin(target) {
  let backendProcess = null
  let cleanupBound = false

  return {
    name: 'skilltojob-auto-start-backend',
    apply: 'serve',
    async configureServer(server) {
      if (!isLocalBackendTarget(target) || backendProcess) {
        return
      }

      const healthUrl = new URL('/api/user/test', target)
      const backendAlreadyRunning = await pingBackend(healthUrl)

      if (!backendAlreadyRunning) {
        backendProcess = spawn(process.execPath, ['server.js'], {
          cwd: backendDir,
          stdio: 'inherit',
          env: process.env,
        })

        const backendReady = await waitForBackend(healthUrl)
        if (!backendReady) {
          console.error('SkillToJob backend did not become ready in time.')
        }
      }

      if (!cleanupBound && server.httpServer) {
        cleanupBound = true
        server.httpServer.once('close', () => {
          if (backendProcess && !backendProcess.killed) {
            backendProcess.kill()
          }
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoStartBackendPlugin(apiProxyTarget)],
  base: './',
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
})
