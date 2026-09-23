import { useRef } from 'react';
import { NativeSyntheticEvent, NativePointerEvent, View } from 'react-native';

interface Props {
  readonly children: React.ReactNode;
  readonly enabled?: boolean;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
  readonly onDragBegin: () => void;
  readonly onDragUpdate: (pageX: number, pageY: number) => void;
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

  const finishPointer = () => {
    if (dragging.current) onDragEnd();
    pointerStart.current = null;
    dragging.current = false;
    suppressClick.current = false;
  };

  const handleWindowPointerMove = (event: PointerEvent) => {
    const start = pointerStart.current;
    if (!enabled || !start) return;
    const dx = event.pageX - start.x;
    const dy = event.pageY - start.y;
    if (!dragging.current && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      clearSingleTapTimer();
      dragging.current = true;
      suppressClick.current = true;
      onDragBegin();
    }
    if (dragging.current) onDragUpdate(event.pageX, event.pageY);
  };

  const handleWindowPointerUp = () => {
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);
    finishPointer();
  };

  const handlePointerDown = (event: WebPointerEvent) => {
    if (!enabled) return;
    pointerStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    dragging.current = false;
    suppressClick.current = false;
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  const handlePointerUp = () => {
    if (!enabled) return;
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);
    if (dragging.current) {
      finishPointer();
      return;
    }
    if (!suppressClick.current) {
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
    finishPointer();
  };

  return (
    <View onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      {children}
    </View>
  );
}
