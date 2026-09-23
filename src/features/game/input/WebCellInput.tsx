import { useRef } from 'react';
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

interface WebPointerEvent {
  readonly nativeEvent: {
    readonly pageX: number;
    readonly pageY: number;
    readonly locationX: number;
    readonly locationY: number;
  };
}

const DRAG_THRESHOLD_PX = 8;
const SINGLE_TAP_DELAY_MS = 250;

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
    if (dragging.current) {
      onDragUpdate(event.nativeEvent.locationX, event.nativeEvent.locationY);
    }
  };

  const handlePointerUp = () => {
    if (!enabled) return;
    if (dragging.current) onDragEnd();
    pointerStart.current = null;
    dragging.current = false;
  };

  const handleClick = () => {
    if (!enabled || suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    clearSingleTapTimer();
    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
      onSingleTap();
    }, SINGLE_TAP_DELAY_MS);
  };

  const handleDoubleClick = () => {
    if (!enabled || suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    clearSingleTapTimer();
    onDoubleTap();
  };

  return (
    <View
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </View>
  );
}
