import { View } from 'react-native';

interface Props {
  readonly children: React.ReactNode;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
}

export function MobileCellInput({ children }: Props) {
  return <View>{children}</View>;
}
