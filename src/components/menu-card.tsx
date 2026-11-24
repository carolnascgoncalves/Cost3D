import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./icon";
import { useTheme } from "@/theme/provider";
export function MenuCard({
  label,
  description,
  icon,
  primary = false,
  grouped = false,
  onPress,
}: {
  label: string;
  description?: string;
  icon: IconName;
  primary?: boolean;
  grouped?: boolean;
  onPress: () => void;
}) {
  const t = useTheme(),
    ink = primary ? t.onPrimary : t.primaryText;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        borderWidth: grouped ? 0 : 1,
        borderColor: primary ? t.primary : t.border,
        backgroundColor: primary ? t.primary : t.surface,
        borderRadius: grouped ? 0 : 14,
        padding: grouped ? 10 : 16,
        minHeight: description ? 84 : 62,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: primary ? t.surface : t.accentTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={24} color={t.primaryText} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: ink }}>
          {label}
        </Text>
        {description && (
          <Text style={{ fontSize: 13, color: primary ? ink : t.muted }}>
            {description}
          </Text>
        )}
      </View>
      <Icon name="chevron-right" color={ink} size={16} />
    </Pressable>
  );
}
