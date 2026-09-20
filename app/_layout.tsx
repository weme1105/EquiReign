import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ensureAnonymousIdentity } from '../src/auth/anonymous-auth.ts';

export default function RootLayout() {
  useEffect(() => {
    void ensureAnonymousIdentity().catch(() => {
      // Identity bootstrap must not block the shell. Protected API calls will surface retryable errors when needed.
    });
  }, []);
  return <GestureHandlerRootView style={{ flex: 1 }}><StatusBar style="light" /><Stack screenOptions={{ contentStyle: { backgroundColor: '#17142a' }, headerShown: false }} /></GestureHandlerRootView>;
}
