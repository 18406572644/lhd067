import type { UserMaterial, UserMaterialStoreStats, UserMaterialCategory } from '~/types'

const DB_NAME = 'PlantHerbariumUserDB'
const DB_VERSION = 1
const STORE_NAME = 'userMaterials'
const MAX_STORAGE_SIZE = 20 * 1024 * 1024

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('category', 'category', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
  })

  return dbPromise
}

function withTx<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)

    try {
      const result = callback(store)
      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result as T)
        result.onerror = () => reject(result.error)
      } else {
        result.then(resolve).catch(reject)
      }
      tx.onabort = () => reject(tx.error)
    } catch (e) {
      reject(e)
    }
  }))
}

export async function addUserMaterial(
  material: Omit<UserMaterial, 'id' | 'createdAt' | 'updatedAt' | 'type'>
): Promise<UserMaterial> {
  const stats = await getStats()
  if (stats.totalSize + material.size > MAX_STORAGE_SIZE) {
    throw new Error(`存储空间不足，已使用 ${formatSize(stats.totalSize)}/${formatSize(MAX_STORAGE_SIZE)}`)
  }

  const now = Date.now()
  const full: UserMaterial = {
    ...material,
    id: `usr_${now}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    updatedAt: now,
    type: 'user'
  }

  await withTx('readwrite', store => store.add(full))
  return full
}

export async function updateUserMaterial(
  id: string,
  patch: Partial<Omit<UserMaterial, 'id' | 'createdAt' | 'type'>>
): Promise<UserMaterial> {
  const existing = await getUserMaterial(id)
  if (!existing) throw new Error('素材不存在')

  const updated: UserMaterial = {
    ...existing,
    ...patch,
    id: existing.id,
    type: 'user',
    createdAt: existing.createdAt,
    updatedAt: Date.now()
  }

  const newSize = updated.size
  const oldSize = existing.size
  const stats = await getStats()

  if (newSize > oldSize && stats.totalSize - oldSize + newSize > MAX_STORAGE_SIZE) {
    throw new Error('存储空间不足，更新会超出容量上限')
  }

  await withTx('readwrite', store => store.put(updated))
  return updated
}

export async function deleteUserMaterial(id: string): Promise<void> {
  await withTx('readwrite', store => store.delete(id))
}

export async function getUserMaterial(id: string): Promise<UserMaterial | undefined> {
  return withTx('readonly', store => store.get(id))
}

export async function getAllUserMaterials(): Promise<UserMaterial[]> {
  return withTx('readonly', store => store.getAll())
}

export async function getUserMaterialsByCategory(category: UserMaterialCategory | null): Promise<UserMaterial[]> {
  const all = await getAllUserMaterials()
  if (!category) return all
  return all.filter(m => m.category === category)
}

export async function getStats(): Promise<UserMaterialStoreStats> {
  const all = await getAllUserMaterials()
  const totalSize = all.reduce((sum, m) => sum + m.size, 0)
  return {
    totalSize,
    count: all.length,
    maxSize: MAX_STORAGE_SIZE
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export { MAX_STORAGE_SIZE }
