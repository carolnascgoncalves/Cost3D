import { router, type Href } from "expo-router";
import { useState, type PropsWithChildren } from "react";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/theme/provider";
import { Card, Notice } from "@/components/ui";
import { openWebsite } from "@/features/website";

export function ModuleScreen({
  section,
  title,
  children,
}: PropsWithChildren<{ section: string; title: string }>) {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: wide ? t.background : t.primary,
          paddingHorizontal: wide ? 48 : 20,
          paddingTop: wide ? 40 : 20,
          paddingBottom: 18,
          gap: 6,
        }}
      >
        <Text
          style={{
            color: wide ? t.pageMuted : t.onPrimary,
            fontSize: 11,
            letterSpacing: 1.1,
          }}
        >
          {section.toUpperCase()}
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: wide ? t.pageText : t.onPrimary,
            fontSize: wide ? 34 : 24,
            fontWeight: "700",
          }}
        >
          {title}
        </Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: wide ? 48 : 16,
          paddingVertical: 16,
          gap: 12,
          width: "100%",

          alignSelf: "center",
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

type Entry = { label: string; route: Href } | { label: string; site: string };
export function MenuRows({ entries }: { entries: Entry[] }) {
  const t = useTheme();
  const [error, setError] = useState("");
  return (
    <>
      <Card style={{ padding: 14, gap: 0, borderRadius: 14 }}>
        {entries.map((item, i) => (
          <Pressable
            key={item.label}
            accessibilityRole="link"
            accessibilityHint={
              "site" in item ? "Abre no site da loja" : undefined
            }
            onPress={() => {
              setError("");
              if ("route" in item) router.navigate(item.route);
              else
                void openWebsite(item.site).catch(() =>
                  setError("Não foi possível abrir o site."),
                );
            }}
            style={({ pressed }) => ({
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              borderColor: t.border,
              borderBottomWidth: i === entries.length - 1 ? 0 : 1,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>
              {item.label}
            </Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>
              {"site" in item ? "Site  ›" : "›"}
            </Text>
          </Pressable>
        ))}
      </Card>
      {!!error && <Notice message={error} />}
    </>
  );
}
