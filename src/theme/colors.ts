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
  const ink = mix(primary, dark ? "#ffffff" : "#17151a", dark ? 0.25 : 0.52);
  const text = contrast(surface, ink) >= 4.5 ? ink : readable(surface);
  const pageText =
    contrast(background, ink) >= 4.5 ? ink : readable(background);
  return {
    header: primary,
    navInactive: mix(text, surface, 0.2),
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
    selectionTint: mix(primary, surface, 0.18),
    guide: mix(primary, surface, 0.32),
    chartColor:
      contrast(primary, surface) >= 3 ? primary : mix(text, surface, 0.76),
    success: dark ? "#91D6A2" : "#27613A",
    danger: dark ? "#FFAAA5" : "#A23C37",
    dangerBackground: dark ? "#572626" : "#FBECEB",
  };
}
export function createMobileTheme(input?: Parameters<typeof createTheme>[0]) {
  const palette = {
    primary: "#6b58b0",
    accent: "#ede7fb",
    background: "#faf5ff",
  };
  const standardStore =
    input?.corPrimaria?.toLowerCase() === "#492e1e" &&
    input?.corDestaque?.toLowerCase() === "#e9a695" &&
    input?.corFundo?.toLowerCase() === "#f5e7da";
  const overrides = standardStore ? undefined : input;
  const theme = createTheme({
    corPrimaria: validColor(overrides?.corPrimaria, palette.primary),
    corDestaque: validColor(overrides?.corDestaque, palette.accent),
    corFundo: validColor(overrides?.corFundo, palette.background),
  });
  const referenceSurface =
    theme.background.toLowerCase() === palette.background;
  return {
    ...theme,
    ...(referenceSurface && {
      surface: "#ffffff",
      text: "#3b2a5c",
      pageText: "#3b2a5c",
      muted: "#6b5a8e",
      pageMuted: "#6b5a8e",
      border: "#e4dbf5",
    }),
    accentTint:
      theme.accent.toLowerCase() === palette.accent
        ? palette.accent
        : theme.accentTint,
    header:
      theme.primary.toLowerCase() === palette.primary
        ? "#45346a"
        : theme.primary,
    navInactive: referenceSurface ? "#cbbfe8" : theme.border,
  };
}
export type Theme = ReturnType<typeof createTheme>;
