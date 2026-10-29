import { useEffect, useState } from "react";
import {
  casePreferencesKey,
  initialCasePreferences,
  loadCasePreferences,
  saveCasePreferences,
  type CasePreferences,
} from "../models/casePreferences";
import { withStorageLock } from "../models/storageLock";

export function useCasePreferences(userId: string) {
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(() => {
    try {
      return loadCasePreferences(userId);
    } catch {
      return initialCasePreferences();
    }
  });
  useEffect(() => {
    const reload = () => {
      try {
        setPreferences(loadCasePreferences(userId));
        setError("");
      } catch {
        setError(
          "No se pudieron leer las preferencias. No se sobrescribieron los datos del navegador.",
        );
      }
    };
    reload();
    const changed = (event: StorageEvent) => {
      if (event.key === casePreferencesKey(userId))
        setError(
          "Las preferencias cambiaron en otra pestaña. Recarga la aplicación antes de guardar.",
        );
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [userId]);
  async function save(next: CasePreferences) {
    const saved = await withStorageLock(casePreferencesKey(userId), () =>
      saveCasePreferences(userId, next),
    );
    setPreferences(saved);
    setError("");
  }
  return { preferences, save, error };
}
