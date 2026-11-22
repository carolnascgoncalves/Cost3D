import { useState } from "react";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/provider";
import { useTheme } from "@/theme/provider";
import { Body, Button, Field, Notice } from "@/components/ui";
import { BrandLogo, SessionLoading } from "@/components/brand-logo";
import { openWebsite } from "@/features/website";
export default function Login() {
  const auth = useAuth();
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  if (auth.loading && !wide) return <SessionLoading />;
  if (auth.loading)
    return (
      <View
        style={[
          s.loading,
          { backgroundColor: wide ? t.background : t.primary },
        ]}
      >
        <ActivityIndicator
          color={t.primaryText}
          accessibilityLabel="Restaurando sessão"
        />
      </View>
    );
  if (!wide && auth.offline)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
            padding: 28,
          }}
        >
          <Image
            source={require("../../assets/images/cost3d-mascote.png")}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
          <Text
            accessibilityRole="header"
            style={{ fontSize: 24, fontWeight: "700", color: t.primary }}
          >
            Sem conexão
          </Text>
          <Text style={{ fontSize: 15, textAlign: "center", color: t.text }}>
            Não conseguimos falar com o servidor. Confira sua internet e tente
            de novo.
          </Text>
          <View style={{ width: "100%", maxWidth: 360 }}>
            <Button
              label="Tentar de novo"
              onPress={() => void auth.restore()}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  if (auth.account) return <Redirect href="/home" />;
  async function submit() {
    if (busy) return;
    if (!email.trim() || !senha) {
      setError("Preencha o e-mail e a senha.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.signIn(email, senha);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView
      style={[s.loading, { backgroundColor: wide ? t.background : t.primary }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.container, !wide && { padding: 28 }]}
        >
          <View style={[s.layout, wide ? s.desktop : s.mobile]}>
            <View style={wide ? s.brandDesktop : s.brandMobile}>
              <BrandLogo width={wide ? 360 : 230} light={!wide} />
              {wide && (
                <>
                  <Text
                    style={{
                      color: t.pageText,
                      fontSize: 40,
                      lineHeight: 47,
                      fontWeight: "600",
                      letterSpacing: -1,
                    }}
                  >
                    Da primeira camada{"\n"}ao próximo pedido.
                  </Text>
                  <Text
                    style={{
                      color: t.pageMuted,
                      fontSize: 17,
                      lineHeight: 29,
                      maxWidth: 380,
                    }}
                  >
                    Calcule seus preços, organize a produção e acompanhe suas
                    vendas em um só lugar.
                  </Text>
                  <Text
                    style={{ color: t.primaryText, marginTop: 8, fontSize: 14 }}
                  >
                    Cada camada conta.
                  </Text>
                </>
              )}
            </View>
            <View
              style={[
                s.form,
                wide && {
                  padding: 36,
                  backgroundColor: t.surface,
                  borderColor: t.border,
                  borderWidth: 1,
                },
              ]}
            >
              {wide ? (
                <>
                  <Text
                    style={{
                      color: t.muted,
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1.5,
                    }}
                  >
                    BOAS-VINDAS À COST3D
                  </Text>
                  <Text
                    accessibilityRole="header"
                    style={{
                      color: t.text,
                      fontSize: 28,
                      fontWeight: "700",
                      letterSpacing: -0.6,
                    }}
                  >
                    Bom ter você por aqui.
                  </Text>
                  <Body muted>Entre na sua conta para continuar.</Body>
                </>
              ) : (
                <Text
                  accessibilityRole={error ? "alert" : undefined}
                  style={{
                    fontWeight: error ? "700" : "400",
                    color: "#F4EEE4",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  {error || "Gestão e cálculo de custos de impressão 3D"}
                </Text>
              )}
              <View style={{ gap: 20, marginTop: 10 }}>
                <Field
                  label="E-mail"
                  labelColor={wide ? undefined : "#F4EEE4"}
                  placeholder={wide ? "voce@exemplo.com" : undefined}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                />
                <Field
                  label="Senha"
                  labelColor={wide ? undefined : "#F4EEE4"}
                  placeholder={wide ? "Digite sua senha" : undefined}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  value={senha}
                  onChangeText={setSenha}
                  editable={!busy}
                  onSubmitEditing={() => void submit()}
                />
              </View>
              {wide && (
                <Button
                  label={visible ? "Ocultar senha" : "Mostrar senha"}
                  variant="ghost"
                  onPress={() => setVisible(!visible)}
                />
              )}
              {!!((wide && error) || auth.error) && (
                <Notice
                  message={error || auth.error}
                  onRetry={auth.error ? () => void auth.restore() : undefined}
                />
              )}
              {wide ? (
                <>
                  <Button
                    label="Entrar"
                    busy={busy}
                    onPress={() => void submit()}
                  />
                  <Button
                    label="Ainda não tem conta?"
                    variant="ghost"
                    onPress={() => setHelp(!help)}
                  />
                  {help && (
                    <Body muted>
                      Peça à pessoa responsável pela loja para criar seu acesso
                      com seu e-mail.
                    </Body>
                  )}
                </>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void submit()}
                    style={s.mobileSubmit}
                  >
                    <Text style={{ color: t.primary, fontWeight: "700" }}>
                      {busy ? "Entrando…" : "Entrar"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() =>
                      void openWebsite("/recuperar-senha").catch(() =>
                        setError(
                          "Não foi possível abrir a recuperação de senha.",
                        ),
                      )
                    }
                    style={s.mobileLink}
                  >
                    <Text style={{ color: "#F4EEE4", fontWeight: "600" }}>
                      Esqueci minha senha
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  loading: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  layout: { width: "100%", maxWidth: 1040, alignItems: "center", gap: 28 },
  desktop: { flexDirection: "row", gap: 72 },
  brandDesktop: { flex: 1, gap: 24 },
  mobile: { maxWidth: 420, gap: 14 },
  mobileSubmit: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F4EEE4",
  },
  mobileLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  brandMobile: { alignItems: "center" },
  form: { width: "100%", maxWidth: 420, gap: 14, borderRadius: 16 },
});
