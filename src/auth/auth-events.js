export const AUTH_UPDATED_EVENT = "freshveg:auth-updated";
export const SESSION_EXPIRED_EVENT = "freshveg:session-expired";

export function dispatchAuthEvent(name) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}
