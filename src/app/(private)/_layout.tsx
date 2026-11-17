import { useEffect, useState } from "react";
import { Redirect, Slot, usePathname, router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/auth/provider";
import { request, type TenantTheme } from "@/api/session";
import { ThemeProvider, useTheme } from "@/theme/provider";
import { WorkspaceProvider } from "@/features/workspace";
import { luminance } from "@/theme/colors";
import { Notice } from "@/components/ui";
const items = [
  { path: "/home", label: "Início", icon: "⌂", store: false },
  { path: "/customers", label: "Clientes", icon: "♧", store: true },
  { path: "/movements", label: "Extrato", icon: "⇄", store: true },
  { path: "/account", label: "Conta", icon: "◎", store: false },
] as const;
export default function PrivateLayout() {
  const { account, loading } = useAuth();
  const path = usePathname();
  const [theme, setTheme] = useState<TenantTheme | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setTheme(null);
    setError("");
    if (account?.tenantId && !account.trocaSenhaObrigatoria) {
      request<TenantTheme>("/tenant")
        .then((value) => {
          if (active) setTheme(value);
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível carregar o tema.",
            );
        });
    }
    return () => {
      active = false;
    };
  }, [
    account?.id,
    account?.tenantId,
    account?.trocaSenhaObrigatoria,
    revision,
  ]);
  if (loading)
    return <ActivityIndicator accessibilityLabel="Restaurando sessão" />;
  if (!account) return <Redirect href="/login" />;
  if (account.trocaSenhaObrigatoria && path !== "/account")
    return <Redirect href="/account" />;
  return (
    <ThemeProvider value={theme}>
      <WorkspaceProvider key={account.id}>
        <Shell
          name={theme?.nome}
          error={error}
          retry={() => setRevision((v) => v + 1)}
        />
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
function Shell({
  name,
  error,
  retry,
}: {
  name?: string;
  error: string;
  retry: () => void;
}) {
  const t = useTheme();
  const { account, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const path = usePathname();
  const wide = width >= 900;
  const [busy, setBusy] = useState(false);
  const [exitError, setExitError] = useState("");
  const navigation = items
    .filter(
      (item) =>
        !item.store || (!!account?.tenantId && !account.trocaSenhaObrigatoria),
    )
    .map((item) => {
      const selected = path === item.path || path.startsWith(item.path + "/");
      return (
        <Pressable
          key={item.path}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected }}
          onPress={() => router.navigate(item.path)}
          style={({ pressed }) => [
            s.navItem,
            !wide && s.mobileItem,
            {
              backgroundColor: selected ? t.accent : "transparent",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{ color: selected ? t.onAccent : t.muted, fontSize: 21 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {item.icon}
          </Text>
          <Text
            style={{
              color: selected ? t.onAccent : t.text,
              fontWeight: selected ? "700" : "500",
              fontSize: wide ? 14 : 12,
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      );
    });
  return (
    <SafeAreaView style={[s.page, { backgroundColor: t.background }]}>
      <StatusBar style={luminance(t.background) < 0.2 ? "light" : "dark"} />
      <View style={[s.shell, wide && { flexDirection: "row" }]}>
        {wide && (
          <View
            style={[
              s.sidebar,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}
          >
            <View style={s.brandRow}>
              <Image
                source={require("../../../assets/images/cost3d-robot.png")}
                style={{ width: 40, height: 41 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  color: t.primaryText,
                  fontWeight: "700",
                  fontSize: 23,
                  letterSpacing: 2,
                }}
              >
                cost3d
              </Text>
            </View>
            <Text
              style={{
                color: t.muted,
                fontSize: 11,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              MINHA LOJA
            </Text>
            {navigation}
          </View>
        )}
        <View style={s.main}>
          <View
            style={[
              s.header,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{ color: t.muted, fontSize: 11, letterSpacing: 1.4 }}
              >
                CADA CAMADA CONTA
              </Text>
              <Text
                style={{ color: t.text, fontSize: 18, fontWeight: "700" }}
                numberOfLines={1}
              >
                {name || "Cost3D"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={s.exit}
              onPress={async () => {
                setBusy(true);
                setExitError("");
                try {
                  await signOut();
                } catch {
                  setExitError(
                    "Não foi possível encerrar a sessão. Tente sair novamente.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Text style={{ color: t.primaryText, fontWeight: "600" }}>
                {busy ? "Saindo…" : "Sair"}
              </Text>
            </Pressable>
          </View>
          {!!(exitError || error) && (
            <View style={{ padding: 12 }}>
              <Notice
                message={exitError || error}
                onRetry={exitError ? undefined : retry}
              />
            </View>
          )}
          <View style={s.main}>
            <Slot />
          </View>
          {!wide && (
            <View
              style={[
                s.bottom,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              {navigation}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  shell: { flex: 1, minHeight: 0 },
  main: { flex: 1, minHeight: 0 },
  sidebar: { width: 236, padding: 20, gap: 10, borderRightWidth: 1 },
  brandRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 36,
    marginTop: 12,
  },
  navItem: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mobileItem: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
    paddingHorizontal: 4,
  },
  header: {
    minHeight: 78,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    gap: 12,
  },
  exit: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { flexDirection: "row", padding: 6, gap: 4, borderTopWidth: 1 },
});
