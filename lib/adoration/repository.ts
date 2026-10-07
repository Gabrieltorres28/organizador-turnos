import type { AppData } from "@/lib/adoration/types"

const DATABASE_NAME = "agenda-de-adoracion"
const DATABASE_VERSION = 1
const STORE_NAME = "snapshots"
const SNAPSHOT_KEY = "primary"

type StoredSnapshot = {
  key: string
  data: AppData
}

export interface AppRepository {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
}

class IndexedDbRepository implements AppRepository {
  private databasePromise: Promise<IDBDatabase> | null = null

  async load(): Promise<AppData | null> {
    const database = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly")
      const request = transaction
        .objectStore(STORE_NAME)
        .get(SNAPSHOT_KEY) as IDBRequest<StoredSnapshot | undefined>

      request.onsuccess = () => resolve(request.result?.data ?? null)
      request.onerror = () =>
        reject(request.error ?? new Error("No se pudieron leer los datos."))
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("No se pudieron leer los datos."))
    })
  }

  async save(data: AppData): Promise<void> {
    const database = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite")
      transaction.objectStore(STORE_NAME).put({
        key: SNAPSHOT_KEY,
        data,
      } satisfies StoredSnapshot)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("No se pudieron guardar los datos."))
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("No se pudieron guardar los datos."))
    })
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(
        new Error("Este navegador no permite guardar datos en el dispositivo."),
      )
    }

    if (this.databasePromise) return this.databasePromise

    const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "key" })
        }
      }

      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => {
          database.close()
          this.databasePromise = null
        }
        resolve(database)
      }

      request.onerror = () =>
        reject(request.error ?? new Error("No se pudo abrir el almacenamiento."))
      request.onblocked = () =>
        reject(new Error("Cierra otras pestañas de la aplicación y vuelve a intentar."))
    }).catch((error: unknown) => {
      this.databasePromise = null
      throw error
    })
    this.databasePromise = databasePromise

    return databasePromise
  }
}

export const adorationRepository: AppRepository = new IndexedDbRepository()
