import { TextInput, View, type TextInputProps } from "react-native";
import { Icon } from "./icon";
import { useTheme } from "@/theme/provider";

export function ListSearch(props: TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ justifyContent: "center" }}>
    <TextInput
      returnKeyType="search"
      maxLength={150}
      placeholderTextColor={t.muted}
      style={{
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        color: t.text,
        borderRadius: 12,
        paddingLeft: 40,
        paddingRight: 12,
        minHeight: 44,
      }}
      {...props}
    />
    <View pointerEvents="none" style={{ position: "absolute", left: 13 }}>
      <Icon name="search" size={17} color={t.muted} />
    </View>
    </View>
  );
}
