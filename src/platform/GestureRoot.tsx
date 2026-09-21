import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface Props {
  readonly children: React.ReactNode;
}

export function GestureRoot({ children }: Props) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}
