const fallback = {
  primary: "#86202D",
  accent: "#E9B8AD",
  background: "#F4EEE4",
};
export function validColor(value: string | undefined, defaultValue: string) {
  if (!value) return defaultValue;
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  if (/^#[\da-f]{3}$/i.test(value))
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  return defaultValue;
}
function rgb(color: string) {
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
}
export function luminance(color: string) {
  const [r, g, b] = rgb(color).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readable(color: string) {
  const white = contrast(color, "#FFFFFF");
  const dark = contrast(color, "#1C1718");
  if (Math.max(white, dark) < 4.5) return "#000000";
  return white > dark ? "#FFFFFF" : "#1C1718";
}
function mix(a: string, b: string, weight: number) {
  const x = rgb(a),
    y = rgb(b);
  return (
    "#" +
    x
      .map((v, i) =>
        Math.round(v * weight + y[i] * (1 - weight))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function createTheme(input?: {
  corPrimaria?: string;
  corDestaque?: string;
  corFundo?: string;
}) {
  const primary = validColor(input?.corPrimaria, fallback.primary);
  const accent = validColor(input?.corDestaque, fallback.accent);
  const background = validColor(input?.corFundo, fallback.background);
  const dark = luminance(background) < 0.2;
  const surface = dark
    ? mix(background, "#FFFFFF", 0.92)
    : mix(background, "#FFFFFF", 0.08);
  const text =
    contrast(surface, "#422329") >= 4.5 ? "#422329" : readable(surface);
  const pageText =
    contrast(background, "#422329") >= 4.5 ? "#422329" : readable(background);
  return {
    primary,
    accent,
    background,
    surface,
    text,
    pageText,
    muted: mix(text, surface, 0.78),
    pageMuted: mix(pageText, background, 0.78),
    border: mix(text, surface, 0.2),
    onPrimary: readable(primary),
    onAccent: readable(accent),
    primaryText: contrast(primary, surface) >= 4.5 ? primary : text,
    accentTint: mix(accent, surface, 0.2),
    success: dark ? "#91D6A2" : "#27613A",
    danger: dark ? "#FFAAA5" : "#A23C37",
    dangerBackground: dark ? "#572626" : "#FBECEB",
  };
}
export type Theme = ReturnType<typeof createTheme>;
