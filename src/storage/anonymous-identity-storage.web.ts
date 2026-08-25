export interface AnonymousIdentity {
  readonly playerId: string;
  readonly accessToken: string;
}

const KEY = 'equireign.anonymous-identity.v1';

export async function loadAnonymousIdentity(): Promise<AnonymousIdentity | null> {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AnonymousIdentity>;
    return typeof parsed.playerId === 'string' && typeof parsed.accessToken === 'string'
      ? { playerId: parsed.playerId, accessToken: parsed.accessToken }
      : null;
  } catch { return null; }
}

export async function saveAnonymousIdentity(identity: AnonymousIdentity): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(identity));
}

export async function clearAnonymousIdentity(): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
