import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { request, ApiError } from "@/api/session";
import { useAuth } from "@/auth/provider";
import {
  Body,
  Chip,
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
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Customer, CustomerInput } from "@/features/contracts";
import { CustomerBudgets } from "@/features/customer-budgets";
export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mobile = useWindowDimensions().width < 900;
  const [showContact, setShowContact] = useState(false);
  const isNew = id === "new";
  const { account } = useAuth();
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
    <Frame
      title={title}
      section="Clientes"
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
                label="Nome *"
                value={form.nome}
                maxLength={150}
                editable={!busy && !conflict}
                onChangeText={(nome) => setForm({ ...form, nome })}
                autoCapitalize="words"
              />
              <Field
                label="Telefone"
                value={form.telefone}
                maxLength={150}
                editable={!busy && !conflict}
                keyboardType="phone-pad"
                onChangeText={(telefone) => setForm({ ...form, telefone })}
              />
              <Field
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
                label="Observações"
                value={form.observacoes}
                maxLength={500}
                editable={!busy && !conflict}
                multiline
                style={{ minHeight: 110, textAlignVertical: "top" }}
                onChangeText={(observacoes) =>
                  setForm({ ...form, observacoes })
                }
              />
              <View style={layout.row}>
                <Button
                  label={isNew ? "Cadastrar cliente" : "Salvar alterações"}
                  busy={busy}
                  disabled={conflict}
                  onPress={() => void save()}
                />
                <Button
                  label="Cancelar"
                  variant="ghost"
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
            </Card>
          ) : (
            <>
              {mobile && (
                <View style={layout.row}>
                  <Chip
                    label="Orçamentos"
                    selected={!showContact}
                    onPress={() => setShowContact(false)}
                  />
                  <Chip
                    label="Dados do cliente"
                    selected={showContact}
                    onPress={() => setShowContact(true)}
                  />
                </View>
              )}
              {(!mobile || showContact) && (
                <Card>
                  <Body>Telefone</Body>
                  <Body muted>{query.data?.telefone || "Não informado"}</Body>
                  <Body>E-mail</Body>
                  <Body muted>{query.data?.email || "Não informado"}</Body>
                  <Body>Observações</Body>
                  <Body muted>
                    {query.data?.observacoes || "Nenhuma observação"}
                  </Body>
                  <View style={layout.row}>
                    <Button
                      label="Editar cliente"
                      disabled={busy}
                      onPress={() => {
                        setEditing(true);
                        setSuccess("");
                      }}
                    />
                    <Button
                      label={query.data?.arquivado ? "Restaurar" : "Arquivar"}
                      variant="secondary"
                      disabled={busy}
                      onPress={() => setConfirm(true)}
                    />
                  </View>
                </Card>
              )}
              {(!mobile || showContact) && confirm && (
                <Card>
                  <Body>
                    {query.data?.arquivado
                      ? "Restaurar este cliente para a lista de ativos?"
                      : "Arquivar este cliente? Seus dados e orçamentos serão mantidos."}
                  </Body>
                  <View style={layout.row}>
                    <Button
                      label={
                        query.data?.arquivado
                          ? "Confirmar restauração"
                          : "Confirmar arquivamento"
                      }
                      variant={query.data?.arquivado ? "primary" : "danger"}
                      busy={busy}
                      onPress={() => void archive()}
                    />
                    <Button
                      label="Cancelar"
                      variant="ghost"
                      disabled={busy}
                      onPress={() => setConfirm(false)}
                    />
                  </View>
                </Card>
              )}
              {(!mobile || !showContact) && query.data?.id === id && (
                <CustomerBudgets key={id} id={id} />
              )}
            </>
          )}
        </View>
      )}
    </Frame>
  );
}
