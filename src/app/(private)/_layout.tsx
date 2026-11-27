import { Icon, IconWarmup } from "@/components/icon";
import { BudgetKeyboard } from "@/components/budget-keyboard";
import { SessionLoading } from "@/components/brand-logo";
import { useEffect, useRef, useState } from "react";
import { Redirect, Slot, usePathname, router } from "expo-router";
import {
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/auth/provider";
import { request, type TenantTheme } from "@/api/session";
import { ThemeProvider, useTheme } from "@/theme/provider";
import { WorkspaceProvider } from "@/features/workspace";
import { luminance } from "@/theme/colors";
import { Notice } from "@/components/ui";
import { DesktopNav } from "@/components/desktop-nav";
const items = [
  { path: "/home", icon: "house", label: "Início", store: false },
  { path: "/catalog", icon: "collection", label: "Catálogo", store: true },
  { path: "/calculate", icon: "calculator", label: "Calcular", store: true },
  { path: "/sales", icon: "shop", label: "Vendas", store: true },
  { path: "/more", icon: "three-dots", label: "Mais", store: false },
] as const;
export default function PrivateLayout() {
  const { account, loading, cachedTheme, saveTheme } = useAuth();
  const path = usePathname();
  const [theme, setTheme] = useState<TenantTheme | null>(cachedTheme);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    if (account?.tenantId && !account.trocaSenhaObrigatoria) {
      const cached = cachedTheme?.id === account.tenantId ? cachedTheme : null;
      setTheme(cached);
      request<TenantTheme>("/tenant")
        .then((value) => {
          if (active) {
            setTheme(value);
            void saveTheme(value);
          }
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível carregar o tema.",
            );
        });
    } else {
      setTheme(null);
    }
    return () => {
      active = false;
    };
  }, [
    account?.id,
    account?.tenantId,
    account?.trocaSenhaObrigatoria,
    cachedTheme?.id,
    revision,
    saveTheme,
  ]);
  if (loading) return <SessionLoading />;
  if (!account) return <Redirect href="/login" />;
  if (account.tenantId && !theme && !error) return <SessionLoading />;
  if (account.trocaSenhaObrigatoria && path !== "/account")
    return <Redirect href="/account" />;
  if (
    !account.tenantId &&
    [
      "/catalog",
      "/sales",
      "/other-sales",
      "/calculate",
      "/dashboard",
      "/budgets",
      "/planning",
      "/extra-costs",
      "/settings",
    ].includes(path)
  )
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
  const budget = path === "/budgets";
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [exitError, setExitError] = useState("");
  const [typing, setTyping] = useState(Keyboard.isVisible());
  const [focusPending, setFocusPending] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const beforeKeyboard = useRef<typeof viewport | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setTyping(Keyboard.isVisible());
    const show = Keyboard.addListener("keyboardDidShow", () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
      setFocusPending(false);
      setTyping(true);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      beforeKeyboard.current = null;
      if (focusTimer.current) clearTimeout(focusTimer.current);
      setFocusPending(false);
      setTyping(false);
    });
    const willHide = Platform.OS === "ios"
      ? Keyboard.addListener("keyboardWillHide", () => {
          beforeKeyboard.current = null;
          if (focusTimer.current) clearTimeout(focusTimer.current);
          setFocusPending(false);
          setTyping(false);
        })
      : undefined;
    return () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
      show.remove();
      hide.remove();
      willHide?.remove();
    };
  }, []);
  // adjustResize can shrink the window before Android emits keyboardDidShow.
  const previous = beforeKeyboard.current;
  const hidesFooter =
    !wide && Platform.OS !== "web" &&
    (typing || focusPending || (Platform.OS === "android" &&
      (previous?.width === viewport.width &&
        previous.height > viewport.height + 100)));
  function onFieldFocus() {
    if (Platform.OS === "web" || Keyboard.isVisible()) return;
    if (Platform.OS === "android") beforeKeyboard.current = viewport;
    setFocusPending(true);
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => setFocusPending(false), 700);
  }
  const navigation = items
    .filter(
      (item) =>
        !item.store || (!!account?.tenantId && !account.trocaSenhaObrigatoria),
    )
    .map((item) => {
      const selected =
        path === item.path ||
        (item.path === "/home" && path === "/dashboard") ||
        (item.path === "/more" &&
          [
            "/customers",
            "/movements",
            "/budgets",
            "/planning",
            "/extra-costs",
            "/account",
            "/settings",
            "/other-sales",
          ].some((prefix) => path === prefix || path.startsWith(prefix + "/")));
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
              backgroundColor: selected && wide ? t.accentTint : "transparent",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          {!wide && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 2,
                borderRadius: 10,
                backgroundColor: selected ? t.accentTint : "transparent",
              }}
            >
              <Icon
                name={item.icon}
                color={selected ? t.primaryText : t.muted}
                size={21}
              />
            </View>
          )}
          <Text
            style={{
              color: selected ? t.primaryText : t.muted,
              fontWeight: selected ? "700" : "500",
              fontSize: wide ? 14 : 11,
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      );
    });
  return (
    <SafeAreaView style={[s.page, { backgroundColor: t.background }]}>
      <IconWarmup />
      <StatusBar style={luminance(t.background) < 0.2 ? "light" : "dark"} />
      <View
        style={[s.shell, wide && { flexDirection: "row" }]}
        onLayout={
          budget && Platform.OS === "android"
            ? (e) => {
                const { width, height } = e.nativeEvent.layout;
                setViewport({ width, height });
              }
            : undefined
        }
      >
        {wide && (
          <DesktopNav
            store={!!account?.tenantId && !account.trocaSenhaObrigatoria}
            onError={() => setExitError("Não foi possível abrir o site.")}
          />
        )}
        <KeyboardAvoidingView
          enabled={Platform.OS === "ios" && !budget}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
          style={s.main}
        >
          {wide && (
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
          )}
          {!!(exitError || error) && (
            <View style={{ padding: 12 }}>
              <Notice
                message={exitError || error}
                onRetry={exitError ? undefined : retry}
              />
            </View>
          )}
          <View style={s.main}>
            <BudgetKeyboard.Provider
              value={{ active: budget, hidesFooter, onFieldFocus }}
            >
              <Slot />
            </BudgetKeyboard.Provider>
          </View>
          {!wide && !hidesFooter && (
            <View
              style={[
                s.bottom,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              {navigation}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  shell: { flex: 1, minHeight: 0 },
  main: { flex: 1, minHeight: 0 },
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
  bottom: {
    flexDirection: "row",
    minHeight: 64,
    alignItems: "center",
    borderTopWidth: 1,
  },
});
