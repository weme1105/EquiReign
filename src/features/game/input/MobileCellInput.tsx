import { View } from 'react-native';

interface Props {
  readonly children: React.ReactNode;
  readonly enabled?: boolean;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
  readonly onDragBegin: () => void;
  readonly onDragUpdate: (x: number, y: number) => void;
  readonly onDragEnd: () => void;
}

export function MobileCellInput({ children }: Props) {
  return <View>{children}</View>;
}
