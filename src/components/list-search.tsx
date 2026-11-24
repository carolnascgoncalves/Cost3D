import { TextInput, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/provider";

export function ListSearch(props: TextInputProps) {
  const t = useTheme();
  return (
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
        paddingHorizontal: 12,
        minHeight: 44,
      }}
      {...props}
    />
  );
}
