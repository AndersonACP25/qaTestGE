export async function withStorageLock<T>(name: string, work: () => T): Promise<T> {
  if (!navigator.locks)
    throw new Error(
      "Este navegador no permite guardar de forma segura entre pestañas. Usa un navegador compatible con Web Locks.",
    );
  return navigator.locks.request(name, work);
}
