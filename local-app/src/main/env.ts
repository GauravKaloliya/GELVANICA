import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { validateEnv } from './env-schema'

const root = path.join(__dirname, '../..')
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
const envFiles = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]

for (const file of envFiles) {
  const filePath = path.join(root, file)
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath })
  }
}

const rawEnv = {
  FLASK_HOST: process.env.VITE_FLASK_HOST || '127.0.0.1',
  FLASK_PORT: process.env.VITE_FLASK_PORT || '5001',
  DEV_PORT: process.env.VITE_DEV_PORT || '5173',
  CLOUD_WEB_PORT: process.env.VITE_CLOUD_WEB_PORT || '3000',
  SERVER_URL: process.env.VITE_GNOVIUM_SERVER_URL || 'https://app.gnovium.com',
  API_URL: process.env.VITE_GNOVIUM_API_URL || 'https://api.gnovium.com/v1',
  AUTH_URL: process.env.VITE_GNOVIUM_AUTH_URL || 'https://app.gnovium.com/auth',
  LANDING_URL: process.env.VITE_GNOVIUM_LANDING_URL || 'https://gnovium.com',
  ISSUES_URL: process.env.VITE_GNOVIUM_ISSUES_URL || 'https://github.com/GauravKaloliya/GNOVIUM/issues',
}

const validated = validateEnv(rawEnv)

export const env = {
  FLASK_HOST: validated.FLASK_HOST,
  FLASK_PORT: validated.FLASK_PORT,
  DEV_PORT: validated.DEV_PORT,
  CLOUD_WEB_PORT: validated.CLOUD_WEB_PORT,
  SERVER_URL: validated.SERVER_URL,
  API_URL: validated.API_URL,
  AUTH_URL: validated.AUTH_URL,
  LANDING_URL: validated.LANDING_URL,
  ISSUES_URL: validated.ISSUES_URL,
  get FLASK_BASE_URL() { return `http://${this.FLASK_HOST}:${this.FLASK_PORT}` },
  get FLASK_HEALTH_URL() { return `http://${this.FLASK_HOST}:${this.FLASK_PORT}/health` },
  IS_DEV: process.env.NODE_ENV === 'development',
} as const
