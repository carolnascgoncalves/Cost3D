import { Icon } from "@/components/icon";
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
      <View style={[s.loading, { backgroundColor: t.background }]}>
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
    <SafeAreaView style={[s.loading, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.container, !wide && { padding: 16 }]}
        >
          <View style={[s.layout, wide ? s.desktop : s.mobile]}>
            <View style={wide ? s.brandDesktop : s.brandMobile}>
              <BrandLogo width={wide ? 360 : 184} />
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
                {
                  padding: wide ? 36 : 22,
                  backgroundColor: "#fff",
                  borderColor: t.border,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={{ gap: 7 }}>
                <Text
                  style={{
                    color: t.muted,
                    fontWeight: "700",
                    fontSize: 11,
                    letterSpacing: 1.4,
                  }}
                >
                  BOAS-VINDAS À COST3D
                </Text>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: t.text,
                    fontSize: wide ? 28 : 25,
                    fontWeight: "700",
                    letterSpacing: -0.6,
                  }}
                >
                  Bom ter você por aqui.
                </Text>
                <Text style={{ color: t.muted, fontSize: 15 }}>
                  Entre na sua conta para continuar.
                </Text>
              </View>
              <View style={{ gap: 20, marginTop: 10 }}>
                <Field
                  label="E-mail"
                  placeholder="voce@exemplo.com"
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
                  placeholder="Digite sua senha"
                  labelAction={
                    <Text
                      accessibilityRole="link"
                      style={{
                        color: t.primaryText,
                        textDecorationLine: "underline",
                      }}
                      onPress={() =>
                        void openWebsite("/recuperar-senha").catch(() =>
                          setError(
                            "Não foi possível abrir a recuperação de senha.",
                          ),
                        )
                      }
                    >
                      Esqueci minha senha
                    </Text>
                  }
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        visible ? "Ocultar senha" : "Mostrar senha"
                      }
                      onPress={() => setVisible(!visible)}
                      style={s.eye}
                    >
                      <Icon
                        name={visible ? "eye-slash" : "eye"}
                        size={17}
                        color={t.primaryText}
                      />
                    </Pressable>
                  }
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  value={senha}
                  onChangeText={setSenha}
                  editable={!busy}
                  onSubmitEditing={() => void submit()}
                />
              </View>
              {!!(error || auth.error) && (
                <Notice
                  message={error || auth.error}
                  onRetry={auth.error ? () => void auth.restore() : undefined}
                />
              )}
              <Button
                label="Entrar"
                busy={busy}
                onPress={() => void submit()}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: help }}
                onPress={() => setHelp(!help)}
                style={s.mobileLink}
              >
                <Text style={{ color: t.muted, textAlign: "center" }}>
                  Ainda não tem conta?{" "}
                  <Text
                    style={{
                      color: t.primaryText,
                      fontWeight: "700",
                      textDecorationLine: "underline",
                    }}
                  >
                    Criar conta
                  </Text>
                </Text>
              </Pressable>
              {help && (
                <Body muted>
                  O cadastro é feito pela administração da sua loja. Peça à
                  pessoa responsável para criar seu acesso com seu e-mail.
                </Body>
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
  eye: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  brandMobile: { alignItems: "center" },
  form: { width: "100%", maxWidth: 420, gap: 14, borderRadius: 16 },
});
