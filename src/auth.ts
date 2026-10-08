import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { getUserAuthorization } from "@/lib/auth/user-access"

import { authConfig } from "./auth.config"

async function verifyFirebaseIdToken(idToken: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured")
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to verify Firebase ID token")
  }

  const data = (await response.json()) as {
    users?: Array<{
      localId: string
      displayName?: string
      email?: string
      photoUrl?: string
    }>
  }

  const user = data.users?.[0]
  if (!user) {
    throw new Error("No user found in Firebase token")
  }

  return {
    uid: user.localId,
    name: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email,
    picture: user.photoUrl || "",
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || typeof credentials.idToken !== "string") {
          return null
        }

        try {
          const firebaseUser = await verifyFirebaseIdToken(
            credentials.idToken
          )
          const authorization = await getUserAuthorization(
            firebaseUser.uid,
            firebaseUser.email,
            firebaseUser.name
          )

          return {
            id: firebaseUser.uid,
            name: firebaseUser.name,
            email: firebaseUser.email,
            image: firebaseUser.picture,
            roles: authorization.roles,
            isAdmin: authorization.isAdmin,
          }
        } catch (error) {
          console.error("Error authorizing with Firebase ID Token:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.roles = user.roles
        token.isAdmin = user.isAdmin
      } else if (token.uid) {
        const authorization = await getUserAuthorization(
          token.uid,
          token.email,
          token.name
        )
        token.roles = authorization.roles
        token.isAdmin = authorization.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.uid as string
        session.user.roles = token.roles ?? []
        session.user.isAdmin = token.isAdmin ?? false
      }
      return session
    },
  },
})
