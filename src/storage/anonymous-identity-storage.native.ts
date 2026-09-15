import * as SecureStore from 'expo-secure-store';

export interface AnonymousIdentity {
  readonly playerId: string;
  readonly accessToken: string;
}

const KEY = 'equireign.anonymous-identity.v1';

export async function loadAnonymousIdentity(): Promise<AnonymousIdentity | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AnonymousIdentity>;
    return typeof parsed.playerId === 'string' && typeof parsed.accessToken === 'string'
      ? { playerId: parsed.playerId, accessToken: parsed.accessToken }
      : null;
  } catch { return null; }
}

export async function saveAnonymousIdentity(identity: AnonymousIdentity): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(identity));
}

export async function clearAnonymousIdentity(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
