import { useRef } from 'react';
import { View } from 'react-native';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

interface Props {
  readonly children: React.ReactNode;
  readonly onSingleTap: () => void;
  readonly onDoubleTap: () => void;
}

export function MobileCellInput({ children, onSingleTap, onDoubleTap }: Props) {
  const doubleTapRef = useRef(null);

  return (
    <TapGestureHandler
      ref={doubleTapRef}
      numberOfTaps={2}
      onHandlerStateChange={({ nativeEvent }) => {
        if (nativeEvent.state === State.ACTIVE) onDoubleTap();
      }}
    >
      <View>
        <TapGestureHandler
          waitFor={doubleTapRef}
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.ACTIVE) onSingleTap();
          }}
        >
          <View>{children}</View>
        </TapGestureHandler>
      </View>
    </TapGestureHandler>
  );
}
