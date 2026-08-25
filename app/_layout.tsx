import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ensureAnonymousIdentity } from '../src/auth/anonymous-auth.ts';

export default function RootLayout() {
  useEffect(() => {
    void ensureAnonymousIdentity().catch(() => {
      // Identity bootstrap must not block the shell. Protected API calls will surface retryable errors when needed.
    });
  }, []);
  return <><StatusBar style="light" /><Stack screenOptions={{ contentStyle: { backgroundColor: '#17142a' }, headerShown: false }} /></>;
}
