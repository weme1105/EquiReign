export interface AnonymousIdentity {
  readonly playerId: string;
  readonly accessToken: string;
}

export declare function loadAnonymousIdentity(): Promise<AnonymousIdentity | null>;
export declare function saveAnonymousIdentity(identity: AnonymousIdentity): Promise<void>;
export declare function clearAnonymousIdentity(): Promise<void>;
