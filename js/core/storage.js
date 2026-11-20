/* =========================================================
   localStorage / sessionStorage with JSON and without crashing
   when the browser blocks storage (private mode, iframes…).
   ========================================================= */
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};
export const session = {
  get(k, d = null) { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
  remove(k) { try { sessionStorage.removeItem(k); } catch { /* storage blocked */ } },
};
