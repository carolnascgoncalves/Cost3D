import { FormScrollView, useRevealField } from "@/components/form-scroll";
import { Icon, type IconName } from "./icon";
import { BudgetKeyboard } from "./budget-keyboard";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
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
import { useContext, useState, useRef } from "react";
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
    <FormScrollView
      keyboardShouldPersistTaps="handled"

      contentContainerStyle={styles.scroll}
    >
      {content}
    </FormScrollView>
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
  icon,
  iconNode,
  stretch,
  compact,
  stopPropagation = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: IconName;
  iconNode?: ReactNode;
  stretch?: boolean;
  compact?: boolean;
  stopPropagation?: boolean;
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
      onPress={(event) => {
        if (stopPropagation) event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && { minHeight: 38, paddingVertical: 7, paddingHorizontal: 14 },
        stretch && { flexGrow: 1 },
        !!(icon || iconNode) && { flexDirection: "row", gap: 6, paddingHorizontal: 10 },
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
      {!busy && iconNode}
      {!busy && icon && !iconNode && <Icon name={icon} size={16} color={color} />}
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text
          style={{
            color,
            flexShrink: 1,
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
export function OptionalBadge() {
  const t = useTheme();
  return (
    <Text
      style={{
        alignSelf: "center",
        backgroundColor: t.selectionTint,
        color: t.primaryText,
        fontSize: 11,
        fontWeight: "600",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9,
        overflow: "hidden",
      }}
    >
      Opcional
    </Text>
  );
}
export function Field({
  label,
  optional,
  labelColor,
  labelAction,
  trailing,
  revealOnFocus = true,
  style,
  ...props
}: TextInputProps & {
  label: string;
  optional?: boolean;
  labelColor?: string;
  labelAction?: ReactNode;
  trailing?: ReactNode;
  revealOnFocus?: boolean;
}) {
  const t = useTheme();

  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const { active: budget, onFieldFocus } = useContext(BudgetKeyboard);
  const reveal = useRevealField();
  const isOptional = optional || /\bopcional\b/i.test(label);
  const displayLabel = label
    .replace(/\s*\(opcional\)/i, "")
    .replace(/, opcional\)/i, ")");
  const numeric = [
    "decimal-pad",
    "number-pad",
    "numeric",
    "phone-pad",
  ].includes(props.keyboardType || "");
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
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            flexShrink: 1,
          }}
        >
          <Text
            style={{
              color: labelColor ?? t.text,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {displayLabel}
          </Text>
          {isOptional && <OptionalBadge />}
        </View>
        {labelAction}
        {Platform.OS !== "web" && focused && numeric && !budget && (
          <Pressable
            accessibilityRole="button"
            onPress={Keyboard.dismiss}
            hitSlop={5}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              backgroundColor: t.selectionTint,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: t.primaryText, fontWeight: "600" }}>
              Concluir
            </Text>
          </Pressable>
        )}
      </View>
      <View>
        <TextInput
          ref={input}
          inputAccessoryViewButtonLabel={budget && numeric ? "↵" : undefined}
          returnKeyType={props.multiline && !budget ? "default" : "done"}
          submitBehavior={
            props.multiline && !budget ? "newline" : "blurAndSubmit"
          }
          {...props}
          accessibilityLabel={
            props.accessibilityLabel ||
            (isOptional ? displayLabel + ", opcional" : label)
          }
          placeholderTextColor={t.muted}
          onFocus={(e) => {
            onFieldFocus();
            setFocused(true);
            if (revealOnFocus && input.current) reveal(input.current);
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
  secondary = false,
  compact = false,
  minWidth,
  icon,
  onPress,
}: {
  label: string;
  selected: boolean;
  secondary?: boolean;
  compact?: boolean;
  minWidth?: number;
  icon?: IconName;
  onPress: () => void;
}) {
  const mobile = useWindowDimensions().width < 900;
  const t = useTheme();
  const ink = secondary
    ? t.text
    : selected
      ? mobile
        ? t.onPrimary
        : t.onAccent
      : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={secondary ? { top: 4, bottom: 4 } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: secondary ? 34 : compact ? 38 : 44,
        minWidth,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 5,
        borderRadius: secondary ? 9 : 24,
        paddingHorizontal: mobile ? 10 : 16,
        paddingVertical: secondary ? 5 : compact ? 7 : 10,
        borderWidth: 1,
        borderColor: selected
          ? secondary
            ? t.guide
            : mobile
              ? t.primary
              : t.accent
          : t.border,
        backgroundColor: selected
          ? secondary
            ? t.selectionTint
            : mobile
              ? t.primary
              : t.accent
          : t.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: ink,
          fontSize: mobile ? 12 : 13,
          fontWeight: selected ? "700" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function SearchEmpty({ message }: { message: string }) {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        gap: 8,
      }}
    >
      <Icon name="search" size={24} color={t.muted} />
      <Body muted>{message}</Body>
    </View>
  );
}
export function Empty({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 36 }}>
      <Icon name="search" size={24} color={t.muted} />
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
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      )}
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
