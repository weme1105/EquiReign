import { loadAnonymousIdentity, saveAnonymousIdentity, type AnonymousIdentity } from '../storage/anonymous-identity-storage';

interface AnonymousAuthResponse {
  readonly playerId: string;
  readonly accessToken: string;
}

export function apiBaseUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  return value ? value.replace(/\/$/, '') : null;
}

export async function ensureAnonymousIdentity(): Promise<AnonymousIdentity | null> {
  const existing = await loadAnonymousIdentity();
  if (existing) return existing;
  const baseUrl = apiBaseUrl();
  if (!baseUrl) return null;
  const response = await fetch(`${baseUrl}/api/auth/anonymous`, { method: 'POST', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Anonymous bootstrap failed: ${response.status}`);
  const created = await response.json() as AnonymousAuthResponse;
  if (!created.playerId || !created.accessToken) throw new Error('Anonymous bootstrap returned an invalid identity.');
  const identity: AnonymousIdentity = { playerId: created.playerId, accessToken: created.accessToken };
  await saveAnonymousIdentity(identity);
  return identity;
}
