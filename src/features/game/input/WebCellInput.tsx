import { useEffect, useRef } from 'react';
import { View } from 'react-native';

const WEB_DOUBLE_CLICK_WINDOW_MS = 280;

interface Props {
  readonly children: React.ReactNode;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
}

type WebViewProps = React.ComponentProps<typeof View> & {
  readonly onClick?: (event: { readonly detail?: number }) => void;
  readonly onDoubleClick?: () => void;
};

const WebView = View as unknown as React.ComponentType<WebViewProps>;

export function WebCellInput({ children, onSingleTap, onDoubleTap }: Props) {
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
  }, []);

  return (
    <WebView
      onClick={(event) => {
        if (Number(event.detail ?? 1) !== 1) return;
        if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null;
          onSingleTap();
        }, WEB_DOUBLE_CLICK_WINDOW_MS);
      }}
      onDoubleClick={() => {
        if (singleTapTimer.current) {
          clearTimeout(singleTapTimer.current);
          singleTapTimer.current = null;
        }
        onDoubleTap();
      }}
    >
      {children}
    </WebView>
  );
}
