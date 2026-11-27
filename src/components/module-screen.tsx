import { FormScrollView } from "@/components/form-scroll";
import { useFocusEffect, router, type Href } from "expo-router";
import { useCallback, useState, type PropsWithChildren, type ReactNode } from "react";
import {
  BackHandler,
  Pressable,
  Text,
  View,
  ScrollView,
  type ScrollViewProps,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/theme/provider";
import { Button, Card, Notice } from "@/components/ui";
import { openWebsite } from "@/features/website";

export function SiteButton({ label, site }: { label: string; site: string }) {
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 6 }}>
      <Button
        label={label}
        onPress={() => {
          setError("");
          void openWebsite(site).catch(() =>
            setError("Não foi possível abrir o site."),
          );
        }}
      />
      {!!error && <Notice message={error} />}
    </View>
  );
}

export function ModuleHeader({
  section,
  title,
  titleAccessory,
  onBack,
  lightHeader,
}: {
  section: string;
  title: string;
  titleAccessory?: ReactNode;
  onBack?: () => void;
  lightHeader?: boolean;
}) {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
  return (
    <View
      style={{
        backgroundColor: t.background,
        paddingHorizontal: wide ? 48 : 20,
        paddingTop: wide ? 40 : 20,
        paddingBottom: 18,
        gap: 6,
      }}
    >
      <Text
        accessibilityRole={onBack ? "button" : undefined}
        onPress={onBack}
        style={{
          color: t.pageMuted,
          fontSize: 11,
          letterSpacing: 1.1,
        }}
      >
        {onBack ? "‹ " + section : section.toUpperCase()}
      </Text>
      <View style={titleAccessory ? { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 } : undefined}>
        <Text
          accessibilityRole="header"
          numberOfLines={titleAccessory ? 1 : undefined}
          style={{
            color: t.pageText,
            fontSize: wide ? 34 : 24,
            fontWeight: "700",
            flex: titleAccessory ? 1 : undefined,
          }}
        >
          {title}
        </Text>
        {titleAccessory}
      </View>
    </View>
  );
}

export function ModuleScreen({
  section,
  title,
  titleAccessory,
  children,
  onBack,
  lightHeader,
  fillContent = false,
  refreshControl,
  automaticallyAdjustKeyboardInsets,
}: PropsWithChildren<{
  section: string;
  title: string;
  titleAccessory?: ReactNode;
  onBack?: () => void;
  lightHeader?: boolean;
  fillContent?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
  automaticallyAdjustKeyboardInsets?: boolean;
}>) {
  const wide = useWindowDimensions().width >= 900;
  useFocusEffect(
    useCallback(() => {
      if (!onBack) return;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          onBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [onBack]),
  );
  return (
    <View style={{ flex: 1 }}>
      <ModuleHeader
        section={section}
        title={title}
        titleAccessory={titleAccessory}
        onBack={onBack}
        lightHeader={lightHeader}
      />
      <FormScrollView
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: wide ? 48 : 16,
          flexGrow: fillContent ? 1 : 0,
          paddingVertical: 16,
          gap: 12,
          width: "100%",

          alignSelf: "center",
        }}
      >
        {children}
      </FormScrollView>
    </View>
  );
}

type Entry = { label: string; route: Href } | { label: string; site: string };
export function MenuRows({ entries }: { entries: Entry[] }) {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
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
              {wide && "site" in item ? "Site  ›" : "›"}
            </Text>
          </Pressable>
        ))}
      </Card>
      {!!error && <Notice message={error} />}
    </>
  );
}
