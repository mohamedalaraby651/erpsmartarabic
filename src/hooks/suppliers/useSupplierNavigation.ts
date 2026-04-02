import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = 'supplier-nav-ids';

export function storeSupplierNavIds(ids: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch { /* quota exceeded, ignore */ }
}

export function useSupplierNavigation(currentId: string | undefined) {
  const navigate = useNavigate();

  const { prevId, nextId } = useMemo(() => {
    if (!currentId) return { prevId: null, nextId: null };
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return { prevId: null, nextId: null };
      const ids: string[] = JSON.parse(raw);
      const idx = ids.indexOf(currentId);
      if (idx === -1) return { prevId: null, nextId: null };
      return {
        prevId: idx > 0 ? ids[idx - 1] : null,
        nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
      };
    } catch {
      return { prevId: null, nextId: null };
    }
  }, [currentId]);

  const goNext = () => nextId && navigate(`/suppliers/${nextId}`);
  const goPrev = () => prevId && navigate(`/suppliers/${prevId}`);

  return { prevId, nextId, goNext, goPrev };
}
