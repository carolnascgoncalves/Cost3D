import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentRef,
} from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type ScrollViewProps,
} from "react-native";

const RevealField = createContext<
  (field: ComponentRef<typeof TextInput>) => void
>(() => {});
export const useRevealField = () => useContext(RevealField);

export function FormScrollView({
  children,
  onScroll,
  onLayout,
  automaticallyAdjustKeyboardInsets = true,
  ...props
}: ScrollViewProps) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null),
    active = useRef<ComponentRef<typeof TextInput> | null>(null),
    offset = useRef(0);
  function reveal() {
    const input = active.current;
    if (Platform.OS === "web" || !input?.isFocused() || !scroll.current) return;
    scroll.current.measureInWindow((_x, top, _w, height) => {
      if (!height || !input.isFocused()) return;
      input.measureInWindow((_ix, y, _iw, h) => {
        if (!h || !input.isFocused()) return;
        const keyboardTop = Keyboard.metrics()?.screenY ?? Infinity;
        const delta = y + h + 16 - Math.min(top + height, keyboardTop);
        if (delta > 0)
          scroll.current?.scrollTo({
            y: offset.current + delta,
            animated: automaticallyAdjustKeyboardInsets,
          });
      });
    });
  }
  useEffect(() => {
    if (Platform.OS === "web") return;
    const listener = Keyboard.addListener("keyboardDidShow", reveal);
    return () => listener.remove();
  }, []);
  return (
    <RevealField.Provider
      value={(input) => {
        active.current = input;
        requestAnimationFrame(reveal);
      }}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        scrollEventThrottle={16}
        {...props}
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        onLayout={(e) => {
          onLayout?.(e);
          requestAnimationFrame(reveal);
        }}
      >
        {children}
      </ScrollView>
    </RevealField.Provider>
  );
}
