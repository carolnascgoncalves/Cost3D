import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useState } from "react";
import { useTheme } from "@/theme/provider";
export function Screen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  const wide = useWindowDimensions().width >= 900;
  const content = (
    <View
      style={[
        styles.content,
        { padding: wide ? 32 : 16, gap: wide ? 20 : 12 },
        scroll ? { flexGrow: 1 } : { flex: 1, minHeight: 0 },
      ]}
    >
      {children}
    </View>
  );
  return scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.scroll}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={styles.frame}>{content}</View>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: t.pageText,
          letterSpacing: -0.7,
        }}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text style={{ color: t.pageMuted, fontSize: 15, lineHeight: 23 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const wide = useWindowDimensions().width >= 900;
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        wide && { padding: 20, borderRadius: 16, gap: 10 },
        { backgroundColor: t.surface, borderColor: t.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Body({
  children,
  muted = false,
  strong = false,
}: PropsWithChildren<{ muted?: boolean; strong?: boolean }>) {
  const mobile = useWindowDimensions().width < 900;
  const t = useTheme();
  return (
    <Text
      style={{
        color: muted ? t.muted : t.text,
        fontSize: mobile && muted ? 12 : 15,
        lineHeight: mobile ? (muted ? 17 : 21) : 23,
        fontWeight: strong ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  disabled,
  busy,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const t = useTheme();
  const color =
    variant === "primary"
      ? t.onPrimary
      : variant === "danger"
        ? t.danger
        : t.primaryText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            variant === "primary"
              ? t.primary
              : variant === "danger"
                ? t.dangerBackground
                : variant === "secondary"
                  ? t.surface
                  : "transparent",
          borderColor:
            variant === "primary"
              ? t.primary
              : variant === "ghost"
                ? "transparent"
                : t.border,
          opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text
          style={{
            color,
            fontWeight: "600",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  labelColor,
  labelAction,
  trailing,
  style,
  ...props
}: TextInputProps & {
  label: string;
  labelColor?: string;
  labelAction?: ReactNode;
  trailing?: ReactNode;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          style={{
            color: labelColor ?? t.text,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        {labelAction}
      </View>
      <View>
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          placeholderTextColor={t.muted}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: t.text,
              borderColor: focused ? t.primary : t.border,
              backgroundColor: t.surface,
            },
            trailing ? { paddingRight: 48 } : undefined,
            style,
          ]}
        />
        {trailing && (
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: "center",
            }}
          >
            {trailing}
          </View>
        )}
      </View>
    </View>
  );
}
export function Notice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: 16,
        gap: 12,
        backgroundColor: t.dangerBackground,
        borderRadius: 10,
      }}
    >
      <Text
        accessibilityRole="alert"
        style={{ color: t.danger, lineHeight: 22 }}
      >
        {message}
      </Text>
      {onRetry && (
        <Button
          variant="secondary"
          label="Tentar novamente"
          onPress={onRetry}
        />
      )}
    </View>
  );
}
export function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <Body muted>{label}</Body>
      </View>
      <Body strong>{value}</Body>
    </View>
  );
}
export function Badge({
  children,
  danger = false,
}: PropsWithChildren<{ danger?: boolean }>) {
  const t = useTheme();
  return (
    <View
      style={{
        alignSelf: "center",
        maxWidth: "52%",
        borderRadius: 99,
        backgroundColor: danger ? t.dangerBackground : t.accentTint,
        paddingHorizontal: 10,
        minHeight: 28,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 11, color: danger ? t.danger : t.text }}>
        {children}
      </Text>
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const mobile = useWindowDimensions().width < 900;
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        borderRadius: 24,
        paddingHorizontal: mobile ? 10 : 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: selected ? (mobile ? t.primary : t.accent) : t.border,
        backgroundColor: selected ? (mobile ? t.primary : t.accent) : t.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? (mobile ? t.onPrimary : t.onAccent) : t.text,
          fontSize: mobile ? 12 : 13,
          fontWeight: selected ? "700" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 36 }}>
      <Text
        style={{
          color: t.text,
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text style={{ color: t.muted, textAlign: "center", lineHeight: 22 }}>
        {description}
      </Text>
    </Card>
  );
}
export function Pagination({
  page,
  total,
  size = 20,
  onPage,
  disabled,
}: {
  page: number;
  total: number;
  size?: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
      }}
    >
      <Button
        variant="secondary"
        label="Anterior"
        disabled={disabled || page === 0}
        onPress={() => onPage(page - 1)}
      />
      <Text style={{ color: t.pageText }}>
        {page + 1} / {pages}
      </Text>
      <Button
        variant="secondary"
        label="Próxima"
        disabled={disabled || page + 1 >= pages}
        onPress={() => onPage(page + 1)}
      />
    </View>
  );
}
export const layout = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  gap: { gap: 16 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16, gap: 12 },
});
const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 0 },
  scroll: { flexGrow: 1 },
  content: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    padding: 20,
    gap: 24,
  },
  card: { padding: 14, borderWidth: 1, borderRadius: 14, gap: 8 },
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
  },
});
