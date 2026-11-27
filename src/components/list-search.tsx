import { TextInput, View, type TextInputProps } from "react-native";
import { useContext } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { Icon } from "./icon";
import { BudgetKeyboard } from "./budget-keyboard";
import { useTheme } from "@/theme/provider";

export function ListSearch({ style, onFocus, ...props }: TextInputProps) {
  const t = useTheme();
  const { onFieldFocus } = useContext(BudgetKeyboard);
  return (
    <View style={{ justifyContent: "center" }}>
    <TextInput
      returnKeyType="search"
      maxLength={150}
      placeholderTextColor={t.muted}
      onFocus={(event) => { onFieldFocus(); onFocus?.(event); }}
      style={[{
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        color: t.text,
        borderRadius: 12,
        paddingLeft: 40,
        paddingRight: 12,
        minHeight: 44,
      }, style as StyleProp<TextStyle>]}
      {...props}
    />
    <View pointerEvents="none" style={{ position: "absolute", left: 13 }}>
      <Icon name="search" size={17} color={t.muted} />
    </View>
    </View>
  );
}
