import { Icon, type IconName } from "@/components/icon";
import { phone } from "@/features/format";
import { useContext, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { request, ApiError } from "@/api/session";
import { useAuth } from "@/auth/provider";
import {
  Body,
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Notice,
  Screen,
  layout,
} from "@/components/ui";
import { ModuleScreen } from "@/components/module-screen";
import { BudgetKeyboard } from "@/components/budget-keyboard";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Customer, CustomerInput } from "@/features/contracts";
import { CustomerBudgets } from "@/features/customer-budgets";
export default function CustomerDetail() {
  const { id, orcamentos, emAndamento } = useLocalSearchParams<{ id: string; orcamentos?: string; emAndamento?: string }>();
  const mobile = useWindowDimensions().width < 900;
  const isNew = id === "new";
  const { account } = useAuth();
  const { hidesFooter } = useContext(BudgetKeyboard);
  const t = useTheme();
  const query = useApiQuery<Customer>(
    !isNew && account?.tenantId ? `/clientes/${encodeURIComponent(id)}` : null,
    true,
  );
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<CustomerInput>({
    nome: "",
    telefone: "",
    email: "",
    observacoes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [success, setSuccess] = useState("");
  function fill(customer: Customer) {
    setForm({
      nome: customer.nome || "",
      telefone: customer.telefone || "",
      email: customer.email || "",
      observacoes: customer.observacoes || "",
      versao: customer.versao,
    });
  }
  useEffect(() => {
    if (query.data) fill(query.data);
  }, [query.data]);
  useEffect(() => {
    setEditing(isNew);
    setError("");
    setConfirm(false);
    setSuccess("");
    if (isNew) setForm({ nome: "", telefone: "", email: "", observacoes: "" });
  }, [id, isNew]);
  async function save() {
    if (busy) return;
    if (form.nome.trim().length < 2) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    setBusy(true);
    setError("");
    setConflict(false);
    setSuccess("");
    const body: CustomerInput = {
      ...form,
      nome: form.nome.trim(),
      telefone: form.telefone?.trim(),
      email: form.email?.trim(),
    };
    try {
      const saved = await request<Customer>(
        isNew ? "/clientes" : `/clientes/${encodeURIComponent(id)}`,
        { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) },
      );
      if (isNew)
        router.replace({
          pathname: "/customers/[id]",
          params: { id: saved.id! },
        });
      else {
        setEditing(false);
        setSuccess("Cliente atualizado.");
        query.retry();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setConflict(e instanceof ApiError && e.status === 409);
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(`/clientes/${encodeURIComponent(id)}/arquivo`, {
        method: "PATCH",
        body: JSON.stringify({ arquivado: !query.data?.arquivado }),
      });
      setConfirm(false);
      setSuccess(
        query.data?.arquivado ? "Cliente restaurado." : "Cliente arquivado.",
      );
      query.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  async function openContact(url: string) {
    try { await Linking.openURL(url); }
    catch { setError("Não foi possível abrir este contato neste dispositivo."); }
  }
  if (!account?.tenantId)
    return (
      <Screen>
        <Empty
          title="Loja não vinculada"
          description="Esta conta não possui uma loja para cadastrar clientes."
        />
      </Screen>
    );
  const Frame = mobile ? ModuleScreen : Screen;
  const title = isNew
    ? "Novo cliente"
    : editing
      ? "Editar cliente"
      : query.data?.nome || "Cliente";
  return (
    <View style={{ flex: 1 }}>
    <Frame
      title={mobile ? "Clientes" : title}
      section={mobile ? "Clientes" : "Comercial"}
      onBack={() => router.navigate("/customers")}
    >
      {!mobile && (
        <>
          <View style={layout.row}>
            <Button
              label="‹ Clientes"
              variant="ghost"
              onPress={() => router.navigate("/customers")}
            />
          </View>
          <Heading
            title={
              isNew
                ? "Novo cliente"
                : editing
                  ? "Editar cliente"
                  : query.data?.nome || "Cliente"
            }
            subtitle={
              isNew
                ? "Comece pelo nome. Os contatos são opcionais."
                : query.data?.arquivado
                  ? "Cliente arquivado"
                  : "Contato e informações do cliente."
            }
          />
        </>
      )}
      {query.loading && query.data?.id !== id && !isNew ? (
        <ActivityIndicator color={t.primaryText} />
      ) : query.error ? (
        <Notice message={query.error} onRetry={query.retry} />
      ) : (
        <View style={{ maxWidth: 700, width: "100%", gap: 20 }}>
          {!!success && (
            <Card>
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: t.success }}
              >
                {success}
              </Text>
            </Card>
          )}
          {!!error && <Notice message={error} />}
          {mobile && editing && <View style={{ gap: 4 }}><Text style={{ color: t.text, fontSize: 22, lineHeight: 27, fontWeight: "700" }}>{title}</Text><Body muted>{isNew ? "Comece pelo nome. Os contatos são opcionais." : "Atualize os dados de contato do cliente."}</Body></View>}
          {conflict && (
            <Card>
              <Body>
                Este cliente foi alterado em outra tela. Recarregue antes de
                editar novamente; as alterações não salvas serão descartadas.
              </Body>
              <Button
                label="Recarregar dados"
                variant="secondary"
                onPress={() => {
                  setConflict(false);
                  setError("");
                  query.retry();
                }}
              />
            </Card>
          )}
          {editing ? (
            <Card>
              <Field
                label="Nome"
                value={form.nome}
                maxLength={150}
                editable={!busy && !conflict}
                onChangeText={(nome) => setForm({ ...form, nome })}
                autoCapitalize="words"
              />
              <Field
                optional
                label="Telefone"
                value={form.telefone}
                maxLength={150}
                editable={!busy && !conflict}
                keyboardType="phone-pad"
                onChangeText={(telefone) => setForm({ ...form, telefone })}
              />
              <Field
                optional
                label="E-mail"
                value={form.email}
                maxLength={150}
                editable={!busy && !conflict}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(email) => setForm({ ...form, email })}
              />
              <Field
                optional
                label="Observações"
                placeholder="Ex.: prefere contato pelo WhatsApp"
                value={form.observacoes}
                maxLength={500}
                editable={!busy && !conflict}
                multiline
                style={{ minHeight: 110, textAlignVertical: "top" }}
                onChangeText={(observacoes) =>
                  setForm({ ...form, observacoes })
                }
              />
              {!mobile && <View style={[layout.row, { flexWrap: "nowrap" }]}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancelar"
                    variant="secondary"
                    stretch
                    disabled={busy}
                    onPress={() => {
                      if (isNew) router.navigate("/customers");
                      else {
                        setEditing(false);
                        setError("");
                        setConflict(false);
                        if (query.data) fill(query.data);
                      }
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Salvar"
                    busy={busy}
                    disabled={conflict}
                    stretch
                    onPress={() => void save()}
                  />
                </View>
              </View>}
            </Card>
          ) : (
            <>
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.accentTint, alignItems: "center", justifyContent: "center" }}><Text style={{ color: t.primaryText, fontSize: 22, fontWeight: "700" }}>{query.data?.nome?.slice(0,1).toUpperCase()}</Text></View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={{ color: t.text, fontSize: 20, fontWeight: "700" }}>{query.data?.nome}</Text><Body muted>{orcamentos ? `${orcamentos} ${orcamentos === "1" ? "orçamento" : "orçamentos"} · ${emAndamento || "0"} em andamento` : query.data?.arquivado ? "Cliente arquivado" : "Contato e histórico de orçamentos"}</Body></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Ações do cliente" onPress={() => setActionsOpen(true)} hitSlop={8}><Text style={{ color: t.muted, fontSize: 21, paddingHorizontal: 4 }}>⋮</Text></Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Button stretch label="Novo orçamento" icon="file-text" onPress={() => router.push({ pathname: "/budgets", params: { id: "new" } })} /></View><Button compact variant="secondary" label="Editar" disabled={busy} onPress={() => { setEditing(true); setSuccess(""); }} /></View>
                <Card style={{ gap: 0, paddingVertical: 2, paddingHorizontal: 12 }}>
                  {!!query.data?.telefone && <Pressable accessibilityRole="button" onPress={() => void openContact("https://wa.me/" + query.data!.telefone!.replace(/\D/g, ""))} style={{ minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: t.border }}><Icon name="telephone" color={t.primaryText} size={16} /><Text style={{ flex: 1, color: t.text, fontSize: 13 }}>{phone(query.data.telefone)}</Text><Text style={{ color: t.primaryText, fontSize: 12 }}>Abrir</Text></Pressable>}
                  {!!query.data?.email && <Pressable accessibilityRole="button" onPress={() => void openContact("mailto:" + query.data!.email)} style={{ minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: t.border }}><Icon name="envelope" color={t.primaryText} size={16} /><Text style={{ flex: 1, color: t.text, fontSize: 13 }} numberOfLines={1}>{query.data.email}</Text><Text style={{ color: t.primaryText, fontSize: 12 }}>Enviar</Text></Pressable>}
                  <View style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10 }}><Icon name="file-text" color={t.muted} size={16} /><Text style={{ color: t.muted, fontSize: 13 }}>{query.data?.observacoes || "Sem observações"}</Text></View>
                </Card>
              </>
              {query.data?.id === id && <CustomerBudgets key={id} id={id} />}
            </>
          )}
        </View>
      )}
    </Frame>
    {mobile && editing && !hidesFooter && <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: t.border, backgroundColor: t.surface }}><View style={{ flex: 1 }}><Button stretch variant="secondary" label="Cancelar" disabled={busy} onPress={() => { if (isNew) router.navigate("/customers"); else { setEditing(false); setError(""); setConflict(false); if (query.data) fill(query.data); } }} /></View><View style={{ flex: 1 }}><Button stretch label="Salvar" busy={busy} disabled={conflict} onPress={() => void save()} /></View></View>}
    <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#24183580" }}>
        <Pressable onPress={() => setActionsOpen(false)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        <Card style={{ gap: 10 }}>
          <Body strong>{query.data?.nome}</Body>
          <Button stretch variant="secondary" label={query.data?.arquivado ? "Restaurar cliente" : "Arquivar cliente"} onPress={() => { setActionsOpen(false); setConfirm(true); }} />
          <Button stretch variant="ghost" label="Fechar" onPress={() => setActionsOpen(false)} />
        </Card>
      </View>
    </Modal>
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#24183580" }}>
        <Pressable onPress={() => setConfirm(false)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        <Card style={{ gap: 10 }}>
          <Body>{query.data?.arquivado ? "Restaurar este cliente para a lista de ativos?" : "Arquivar este cliente? Seus dados e orçamentos serão mantidos."}</Body>
          <Button stretch label={query.data?.arquivado ? "Restaurar" : "Sim, arquivar"} variant={query.data?.arquivado ? "primary" : "danger"} busy={busy} onPress={() => void archive()} />
          <Button stretch label="Voltar" variant="secondary" disabled={busy} onPress={() => setConfirm(false)} />
        </Card>
      </View>
    </Modal>
    </View>
  );
}
