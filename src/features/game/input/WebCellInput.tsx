import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

export function WebCellInput({
  children,
  enabled = true,
  onSingleTap,
  onDoubleTap,
  onDragBegin,
  onDragUpdate,
  onDragEnd,
}: Props) {
  const singleTap = Gesture.Tap()
    .onStart(() => onSingleTap())
    .enabled(enabled);
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => onDoubleTap())
    .enabled(enabled);
  const pan = Gesture.Pan()
    .minDistance(8)
    .enabled(enabled)
    .onBegin(() => onDragBegin())
    .onUpdate((event) => onDragUpdate(event.x, event.y))
    .onFinalize(() => onDragEnd());

  const gesture = Gesture.Race(
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  return (
    <GestureDetector gesture={gesture}>
      <View>{children}</View>
    </GestureDetector>
  );
}
