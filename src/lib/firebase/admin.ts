import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let cachedApp: App | null = null
let cachedAuth: Auth | null = null
let cachedDb: Firestore | null = null

/**
 * Initialise the Firebase Admin SDK.
 *
 * Preferred: provide the three split env vars
 *   - FIREBASE_ADMIN_PROJECT_ID
 *   - FIREBASE_ADMIN_CLIENT_EMAIL
 *   - FIREBASE_ADMIN_PRIVATE_KEY   (use `\n` for line breaks inside the value)
 *
 * Fallback (still supported): the full JSON service account in
 *   - FIREBASE_SERVICE_ACCOUNT_KEY
 *
 * If none are set we fall back to Application Default Credentials, which
 * works on Google Cloud / Firebase Functions / Cloud Run.
 */
function initAdminApp(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  const splitProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const splitClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const splitPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (splitProjectId && splitClientEmail && splitPrivateKey) {
    return initializeApp({
      credential: cert({
        projectId: splitProjectId,
        clientEmail: splitClientEmail,
        // .env keeps `\n` as the literal two-character sequence; the
        // Admin SDK expects real newlines, so we replace them here.
        privateKey: splitPrivateKey.replace(/\\n/g, "\n"),
      }),
      projectId: splitProjectId,
    })
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  const fallbackProjectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID

  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson) as {
        project_id?: string
        projectId?: string
        client_email?: string
        clientEmail?: string
        private_key?: string
        privateKey?: string
      }

      const projectId =
        credentials.project_id ?? credentials.projectId ?? fallbackProjectId
      const clientEmail = credentials.client_email ?? credentials.clientEmail
      const privateKey = (
        credentials.private_key ?? credentials.privateKey ?? ""
      ).replace(/\\n/g, "\n")

      if (projectId && clientEmail && privateKey) {
        return initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        })
      }

      console.warn(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY is set but is missing one of: project_id, client_email, private_key"
      )
    } catch (error) {
      console.error(
        "[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:",
        error
      )
    }
  }

  // Last resort: ADC / default credentials. Works on Google Cloud.
  return initializeApp({ projectId: fallbackProjectId })
}

export function getAdminApp(): App {
  if (!cachedApp) {
    cachedApp = initAdminApp()
  }
  return cachedApp
}

export function getAdminAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getAdminApp())
  }
  return cachedAuth
}

export function getAdminDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getAdminApp())
  }
  return cachedDb
}