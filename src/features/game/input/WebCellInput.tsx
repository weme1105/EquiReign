import { useEffect, useRef } from 'react';
import { View } from 'react-native';

const DRAG_THRESHOLD_PX = 8;

interface Props {
  readonly children: React.ReactNode;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
}

type WebViewProps = React.ComponentProps<typeof View> & {
  readonly onClick?: (event: { readonly detail?: number }) => void;
  readonly onPointerDown?: (event: { readonly clientX?: number; readonly clientY?: number }) => void;
  readonly onPointerMove?: (event: { readonly clientX?: number; readonly clientY?: number }) => void;
};

const WebView = View as unknown as React.ComponentType<WebViewProps>;

export function WebCellInput({ children, onSingleTap, onDoubleTap }: Props) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSingleTap = () => {
    if (singleTapTimer.current) {
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
    }
  };

  useEffect(() => () => clearSingleTap(), []);

  return (
    <WebView
      onPointerDown={(event) => {
        pointerStart.current = {
          x: event.clientX ?? 0,
          y: event.clientY ?? 0,
        };
        dragged.current = false;
      }}
      onPointerMove={(event) => {
        if (!pointerStart.current) return;
        const x = event.clientX ?? pointerStart.current.x;
        const y = event.clientY ?? pointerStart.current.y;
        if (Math.hypot(x - pointerStart.current.x, y - pointerStart.current.y) >= DRAG_THRESHOLD_PX) {
          dragged.current = true;
          clearSingleTap();
        }
      }}
      onClick={(event) => {
        if (dragged.current) {
          pointerStart.current = null;
          dragged.current = false;
          return;
        }

        const detail = Number(event.detail ?? 1);
        if (detail === 2) {
          clearSingleTap();
          onDoubleTap();
          pointerStart.current = null;
          return;
        }

        if (detail !== 1) return;
        clearSingleTap();
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null;
          onSingleTap();
        }, 0);
        pointerStart.current = null;
      }}
    >
      {children}
    </WebView>
  );
}
