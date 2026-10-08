import { onAuthStateChanged, type User } from "firebase/auth"
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase/client"
import { customerMockData } from "./customer-mock-data"
import type { Customer } from "./types/customer-types"

const CUSTOMERS_COLLECTION = "customers"

// Cache for the auth-ready promise so we only subscribe once.
let authReadyPromise: Promise<User | null> | null = null

/**
 * Resolves once Firebase Auth has finished initialising (on page reload
 * the restored session is async).  Returns the current user or null.
 */
function waitForAuth(): Promise<User | null> {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        // onAuthStateChanged fires once immediately with the current state.
        // Unsubscribe right away – we only need the initial value.
        unsubscribe()
        resolve(user)
      })
    })
  }
  return authReadyPromise
}

/**
 * RLS (Row-Level Security): Returns the current authenticated user's UID.
 * Waits for Firebase Auth to finish restoring the session, then returns
 * the UID.  Throws if no user is signed in.
 */
async function getCurrentUserId(): Promise<string> {
  const user = await waitForAuth()
  if (!user) {
    throw new Error(
      "Authentication required. Please sign in to manage customers."
    )
  }
  return user.uid
}

/**
 * Get all customers owned by the current authenticated user (RLS).
 * Queries Firestore with a userId filter to enforce row-level security.
 */
export async function getCustomers(): Promise<Customer[]> {
  const userId = await getCurrentUserId()
  const q = query(
    collection(db, CUSTOMERS_COLLECTION),
    where("userId", "==", userId)
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return []
  }

  const result = snapshot.docs.map((document) => {
    const data = document.data() as Customer

    return {
      ...data,
      id: data.id ?? document.id,
    }
  })

  return JSON.parse(JSON.stringify(result))
}

/**
 * Seed mock customer data for the current user (RLS).
 * Each mock customer is tagged with the current user's UID.
 */
export async function seedCustomersWithClient(): Promise<Customer[]> {
  const userId = await getCurrentUserId()
  const batch = writeBatch(db)

  customerMockData.forEach((customer) => {
    const seededCustomer = { ...customer, userId }
    batch.set(doc(db, CUSTOMERS_COLLECTION, customer.id), seededCustomer, {
      merge: true,
    })
  })

  await batch.commit()
  return getCustomers()
}

/**
 * Create a new customer record owned by the current user (RLS).
 * The userId field is set automatically from the authenticated session.
 */
export async function createCustomer(customer: Customer): Promise<Customer> {
  const userId = await getCurrentUserId()
  const customerWithOwner = { ...customer, userId }

  await setDoc(doc(db, CUSTOMERS_COLLECTION, customer.id), customerWithOwner)

  return customerWithOwner
}

/**
 * Update a customer record (RLS).
 * The userId is preserved from the existing record to maintain ownership.
 */
export async function updateCustomer(customer: Customer): Promise<Customer> {
  const userId = await getCurrentUserId()
  const customerWithOwner = { ...customer, userId }

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, customer.id), customerWithOwner)

  return customerWithOwner
}

/**
 * Delete a customer record owned by the current user (RLS).
 * Firestore security rules should also verify ownership server-side.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await getCurrentUserId()
  await deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId))
}

/**
 * Compute statistics from a list of customers.
 */
export function getCustomerStats(customers: Customer[]) {
  const total = customers.length

  return {
    total,
    new: customers.filter((c) => c.status === "new").length,
    inProgress: customers.filter((c) => c.status === "in progress").length,
    converted: customers.filter((c) => c.status === "converted").length,
  }
}
