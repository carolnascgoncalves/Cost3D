import { useState } from "react";
import { Image, View, type GestureResponderEvent } from "react-native";
import { Body, Field } from "./ui";
import { useTheme } from "@/theme/provider";

function fromHex(hex: string) {
  const [r, g, b] = (/^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "000000")
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255);
  const v = Math.max(r, g, b),
    delta = v - Math.min(r, g, b);
  const h =
    delta === 0
      ? 0
      : v === r
        ? (g - b) / delta
        : v === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  return { h: (h + 6) % 6, s: v ? delta / v : 0, v };
}
function toHex(h: number, s: number, v: number) {
  const channel = (n: number) => {
    const k = (n + h) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return ("#" + channel(5) + channel(3) + channel(1)).toUpperCase();
}
export function ColorWheel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme(),
    [hsv, setHsv] = useState(() => fromHex(value));
  const [side, setSide] = useState(180);
  const { h, s, v } = hsv;
  function change(h: number, s: number, v: number) {
    setHsv({ h, s, v });
    onChange(toHex(h, s, v));
  }
  function touch(e: GestureResponderEvent, brightness: boolean) {
    const x = e.nativeEvent.locationX,
      y = e.nativeEvent.locationY;
    if (brightness) {
      change(h, s, Math.max(0, Math.min(1, x / side)));
      return;
    }
    const dx = x - side / 2,
      dy = y - side / 2;
    change(
      ((Math.atan2(dy, dx) * 3) / Math.PI + 6) % 6,
      Math.min(1, Math.hypot(dx, dy) / (side / 2)),
      v || 1,
    );
  }
  const dot = {
    position: "absolute" as const,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: toHex(h, s, v),
    boxShadow: "0 0 2px #222",
  };
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{ alignSelf: "center", width: "100%", maxWidth: 200, gap: 8 }}
      >
        <View
          accessible
          accessibilityLabel="Círculo de cor: tom e saturação"
          onLayout={(e) => setSide(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => touch(e, false)}
          onResponderMove={(e) => touch(e, false)}
          style={{ aspectRatio: 1, width: "100%", touchAction: "none" }}
        >
          <View pointerEvents="none" style={{ flex: 1 }}>
            <Image
              source={require("../../assets/images/color-wheel.png")}
              style={{ width: "100%", height: "100%" }}
            />
            <View
              style={{
                ...dot,
                left: (side / 2) * (1 + s * Math.cos((h * Math.PI) / 3)) - 7,
                top: (side / 2) * (1 + s * Math.sin((h * Math.PI) / 3)) - 7,
              }}
            />
          </View>
        </View>
        <Body muted>Brilho</Body>
        <View
          accessibilityLabel="Ajustar brilho"
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => touch(e, true)}
          onResponderMove={(e) => touch(e, true)}
          style={{ height: 34, justifyContent: "center", touchAction: "none" }}
        >
          <View
            pointerEvents="none"
            style={{
              height: 18,
              backgroundColor: toHex(h, s, 1),
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../../assets/images/brightness.png")}
              resizeMode="stretch"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <View
            pointerEvents="none"
            style={{
              ...dot,
              left: Math.max(0, Math.min(side - 14, side * v - 7)),
              top: 10,
            }}
          />
        </View>
      </View>
      <Field
        label="Cor hexadecimal"
        value={value}
        autoCapitalize="characters"
        maxLength={7}
        onChangeText={(text) => {
          onChange(text);
          if (/^#[0-9a-f]{6}$/i.test(text)) setHsv(fromHex(text));
        }}
      />
    </View>
  );
}
