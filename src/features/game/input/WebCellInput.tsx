import { useRef } from 'react';
import { NativeSyntheticEvent, NativePointerEvent, View } from 'react-native';

interface Props {
  readonly children: React.ReactNode;
  readonly enabled?: boolean;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
  readonly onDragBegin: () => void;
  readonly onDragUpdate: (dx: number, dy: number) => void;
  readonly onDragEnd: () => void;
}

const DRAG_THRESHOLD_PX = 8;
const SINGLE_TAP_DELAY_MS = 250;

type WebPointerEvent = NativeSyntheticEvent<NativePointerEvent>;

export function WebCellInput({
  children,
  enabled = true,
  onSingleTap,
  onDoubleTap,
  onDragBegin,
  onDragUpdate,
  onDragEnd,
}: Props) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const lastTapAt = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSingleTapTimer = () => {
    if (singleTapTimer.current !== null) {
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
    }
  };

  const handlePointerDown = (event: WebPointerEvent) => {
    if (!enabled) return;
    pointerStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    dragging.current = false;
    suppressClick.current = false;
  };

  const handlePointerMove = (event: WebPointerEvent) => {
    if (!enabled || !pointerStart.current) return;
    const dx = event.nativeEvent.pageX - pointerStart.current.x;
    const dy = event.nativeEvent.pageY - pointerStart.current.y;
    if (!dragging.current && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      clearSingleTapTimer();
      dragging.current = true;
      suppressClick.current = true;
      onDragBegin();
    }
    if (dragging.current) onDragUpdate(dx, dy);
  };

  const handlePointerUp = () => {
    if (!enabled) return;
    if (dragging.current) {
      onDragEnd();
    } else if (!suppressClick.current) {
      const now = Date.now();
      const isDoubleTap = now - lastTapAt.current <= SINGLE_TAP_DELAY_MS;
      lastTapAt.current = now;
      clearSingleTapTimer();
      if (isDoubleTap) {
        lastTapAt.current = 0;
        onDoubleTap();
      } else {
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null;
          lastTapAt.current = 0;
          onSingleTap();
        }, SINGLE_TAP_DELAY_MS);
      }
    }
    pointerStart.current = null;
    dragging.current = false;
    suppressClick.current = false;
  };

  return (
    <View
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </View>
  );
}
