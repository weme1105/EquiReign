import { View } from 'react-native';

interface Props {
  readonly children: React.ReactNode;
}

export function GestureRoot({ children }: Props) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
