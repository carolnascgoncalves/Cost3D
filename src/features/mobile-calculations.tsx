import { FormScrollView } from "@/components/form-scroll";
import { pickCalculationPhoto } from "./pick-calculation-photo";
import {
  calculationFilaments,
  referencedMaterials,
} from "./calculation-materials";
import { pick3mf } from "./pick-3mf";
import { initialSale, saleInput, SaleOptions } from "./calculation-sale";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { components } from "@/api/schema";
import { ApiError, request } from "@/api/session";
import {
  PiecePhoto,
  type CatalogRow,
  type CatalogCategory,
} from "@/components/catalog-card";
import { ModuleScreen } from "@/components/module-screen";
import {
  Badge,
  Chip,
  Body,
  OptionalBadge,
  Button,
  Card,
  Field,
  Notice,
  Pagination,
  ValueRow,
} from "@/components/ui";
import { useApiQuery } from "@/hooks/use-api-query";
import { Icon, type IconName } from "@/components/icon";
import { useTheme } from "@/theme/provider";
import { decimal, reais } from "./format";

type Schema = components["schemas"];
type Result = Schema["ValorCalculo"];
type Selection = CatalogRow & { id: string };
const menu = () => router.setParams({ modo: "menu", peca: "" });
const money = (n?: number) => reais(n == null ? undefined : String(n));

const catalogIcon: Record<CatalogCategory, IconName> = {
  pecas: "box",
  filamentos: "palette",
  impressoras: "printer",
  embalagens: "box",
};
function Choice({
  category,
  item,
  placeholder,
  inSheet = false,
}: {
  category: CatalogCategory;
  item?: CatalogRow;
  placeholder?: string;
  inSheet?: boolean;
}) {
  const t = useTheme();
  const detail =
    item &&
    (category === "pecas"
      ? [
          item.gramas && decimal(item.gramas) + " g",
          item.minutos && item.minutos + " min",
        ]
          .filter(Boolean)
          .join(" · ")
      : category === "filamentos"
        ? [item.cor, item.estoque && decimal(item.estoque) + " g restantes"]
            .filter(Boolean)
            .join(" · ")
        : category === "impressoras"
          ? item.modelo
          : reais(item.custo));
  return (
    <>
      {inSheet &&
      category !== "filamentos" &&
      category !== "pecas" ? null : category === "pecas" &&
        item?.placaMiniatura ? (
        <PiecePhoto key={item.id} row={item} compact />
      ) : (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.accentTint,
          }}
        >
          {category === "filamentos" && item?.codigoCor ? (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: item.codigoCor,
                borderWidth: 1,
                borderColor: t.border,
              }}
            />
          ) : (
            <Icon
              name={catalogIcon[category]}
              color={t.primaryText}
              size={18}
            />
          )}
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: t.text, fontWeight: "600" }}>
          {item?.nome || placeholder}
        </Text>
        {!!detail && (
          <Text style={{ color: t.muted, fontSize: 12 }}>{detail}</Text>
        )}
      </View>
    </>
  );
}
function SectionTitle({ number, title }: { number: string; title: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
      <View
        style={{ padding: 8, borderRadius: 8, backgroundColor: t.accentTint }}
      >
        <Text style={{ color: t.primaryText, fontWeight: "700", fontSize: 12 }}>
          {number}
        </Text>
      </View>
      <Body strong>{title}</Body>
    </View>
  );
}
function Prices({ cost, price }: { cost?: number; price?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {[
        ["Custo por unidade", money(cost)],
        ["Preço sugerido / un.", money(price)],
      ].map(([label, v], i) => (
        <View
          key={label}
          style={{
            flexGrow: 1,
            minWidth: "44%",
            borderRadius: 10,
            padding: 12,
            gap: 5,
            backgroundColor: i ? t.accentTint : t.surface,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text style={{ color: t.muted, fontSize: 12 }}>{label}</Text>
          <Text style={{ color: t.text, fontWeight: "700", fontSize: 18 }}>
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}
export function CalculationIdentity({
  id,
  name,
  large = false,
}: {
  id?: string;
  name?: string;
  large?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <CalculationPhoto id={id} name={name} size={large ? 88 : 66} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Body strong>{name || "Peça"}</Body>
      </View>
    </View>
  );
}
export function CalculationPhoto({
  id,
  name,
  size = 44,
}: {
  id?: string;
  name?: string;
  size?: number;
}) {
  const t = useTheme(),
    photo = useApiQuery<Schema["FotoCatalogo"]>(
      id ? "/calculos/" + encodeURIComponent(id) + "/foto" : null,
    );
  const [failedUri, setFailedUri] = useState("");
  const uri = photo.data?.base64
    ? "data:" + photo.data.tipo + ";base64," + photo.data.base64
    : "";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.accentTint,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {photo.loading ? (
        <ActivityIndicator color={t.primaryText} />
      ) : photo.error || (uri && failedUri === uri) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Tentar carregar novamente a foto de " + name}
          onPress={() => {
            setFailedUri("");
            photo.retry();
          }}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="arrow-repeat" color={t.primaryText} />
        </Pressable>
      ) : uri ? (
        <Image
          accessibilityLabel={"Foto de " + name}
          resizeMode="contain"
          style={{ width: size, height: size }}
          source={{ uri }}
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <Icon name="box" color={t.primaryText} />
      )}
    </View>
  );
}
function Breakdown({ result }: { result: Result }) {
  const t = useTheme();
  const costs = result.custos;
  if (!costs) return null;
  const items: [keyof NonNullable<Result["custos"]>, string, IconName][] = [
    ["custoFilamento", "Filamentos", "palette"],
    ["custoEnergia", "Energia", "lightning-charge"],
    ["custoDepreciacao", "Depreciação", "printer"],
    ["custoManutencao", "Manutenção", "printer"],
    ["custoEmbalagem", "Embalagem", "box"],
    ["custoMaoObra", "Mão de obra", "clock-history"],
    ["custoFalha", "Reserva para falhas", "warning"],
    ["custoPurga", "Purga", "disc"],
    ["custoLoja", "Custos da loja", "shop"],
  ];
  return (
    <View style={{ gap: 10 }}>
      <Body strong>Custos por unidade</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items
          .filter(
            ([key]) =>
              costs[key] != null &&
              (costs[key] !== 0 ||
                key === "custoFilamento" ||
                key === "custoEnergia"),
          )
          .map(([key, label, icon]) => (
            <View
              key={key}
              style={{
                flexBasis: "47%",
                flexGrow: 1,
                minWidth: 112,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 10,
                padding: 11,
                gap: 7,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Icon name={icon} size={16} color={t.primaryText} />
                <Text style={{ color: t.muted, fontSize: 13, flexShrink: 1 }}>
                  {label}
                </Text>
              </View>
              <Text style={{ color: t.text, fontWeight: "700", fontSize: 17 }}>
                {money(costs[key])}
              </Text>
            </View>
          ))}
      </View>
      <ValueRow
        label="Custo total de produção por unidade"
        value={money(result.custoUnitario)}
      />
      <View
        style={{
          padding: 16,
          gap: 6,
          borderRadius: 10,
          backgroundColor: t.accentTint,
        }}
      >
        <Body muted>Preço sugerido antes das taxas · por unidade</Body>
        <Text style={{ fontSize: 24, fontWeight: "700", color: t.text }}>
          {money(result.precoUnitario)}
        </Text>
        {result.markup != null && (
          <Body muted>Markup: {decimal(String(result.markup))}%</Body>
        )}
        {result.precoUnitario != null && result.custoUnitario != null && (
          <>
            <Body muted>
              Lucro antes das taxas:{" "}
              {money(result.precoUnitario - result.custoUnitario)}
            </Body>
            {result.precoUnitario > 0 && (
              <Body muted>
                Margem antes das taxas:{" "}
                {decimal(
                  String(
                    (100 * (result.precoUnitario - result.custoUnitario)) /
                      result.precoUnitario,
                  ),
                  1,
                )}
                %
              </Body>
            )}
          </>
        )}
      </View>
      {result.plataforma && result.plataforma !== "NENHUMA" && (
        <Card>
          <Body strong>Preço de venda na plataforma</Body>
          <ValueRow
            label="Plataforma"
            value={
              (
                {
                  MERCADO_LIVRE: "Mercado Livre",
                  SHOPEE: "Shopee",
                  AMAZON: "Amazon",
                  TIKTOK: "TikTok Shop",
                  TIKTOK_SHOP: "TikTok Shop",
                } as Record<string, string>
              )[result.plataforma] ?? result.plataforma
            }
          />
          <ValueRow
            label="Comissão da plataforma"
            value={
              result.comissao == null
                ? "Não informada"
                : decimal(String(result.comissao)) + "%"
            }
          />
          <ValueRow
            label="Total de taxas e custos da venda"
            value={money(costs.taxasPlataforma)}
          />
          <View
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: t.accentTint,
              gap: 5,
            }}
          >
            <Body muted>Preço de venda recomendado</Body>
            <Text style={{ color: t.text, fontWeight: "700", fontSize: 24 }}>
              {money(costs.precoVendaPlataforma)}
            </Text>
          </View>
        </Card>
      )}
      {costs.lucroLiquido != null && (
        <View
          style={{
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: costs.lucroLiquido < 0 ? t.danger : t.success,
            backgroundColor:
              costs.lucroLiquido < 0 ? t.dangerBackground : t.success + "14",
            gap: 5,
          }}
        >
          <Body muted>Lucro líquido estimado</Body>
          <Text
            style={{
              fontWeight: "700",
              fontSize: 19,
              color: costs.lucroLiquido < 0 ? t.danger : t.success,
            }}
          >
            {money(costs.lucroLiquido)}
          </Text>
        </View>
      )}
      {!!result.filamentos?.length && (
        <>
          <Body strong>Filamentos utilizados</Body>
          {result.filamentos.map((m, i) => (
            <Card key={i}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: t.border,
                    backgroundColor: m.codigoCor || t.accentTint,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Body strong>{m.nome}</Body>
                  {!!m.cor && <Body muted>{m.cor}</Body>}
                </View>
              </View>
              <ValueRow
                label="Quantidade utilizada"
                value={decimal(String(m.gramas ?? 0)) + " g"}
              />
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: t.border,
                  paddingTop: 8,
                }}
              >
                <ValueRow
                  label="Custo deste filamento"
                  value={money(m.custo)}
                />
              </View>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}
export function Picker({
  category,
  label,
  value,
  onChange,
}: {
  category: CatalogCategory;
  label: string;
  value?: Selection;
  onChange: (item?: Selection) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const title = {
    pecas: "Escolha uma peça",
    filamentos: "Escolha um filamento",
    impressoras: "Escolha uma impressora",
    embalagens: "Escolha uma embalagem",
  }[category];
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const q = useApiQuery<{ itens: CatalogRow[]; total: number }>(
    open
      ? "/catalogo/" +
          category +
          "?pagina=" +
          page +
          "&busca=" +
          encodeURIComponent(search)
      : null,
  );
  function choose(item?: Selection) {
    onChange(item);
    setOpen(false);
  }
  return (
    <View style={{ gap: 6 }}>
      <Body muted>{label}</Body>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setSearch("");
          setPage(0);
          setOpen(true);
        }}
        style={{
          minHeight: 52,
          padding: 9,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderRadius: 9,
          borderColor: open ? t.primary : t.border,
          backgroundColor: t.surface,
        }}
      >
        <Choice
          category={category}
          item={value}
          placeholder={"Selecionar " + label.toLowerCase()}
        />
        <View style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>
          <Icon name="chevron-right" size={14} color={t.muted} />
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(32,22,52,0.46)",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar seleção"
            onPress={() => setOpen(false)}
            style={{ flex: 1 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 640,
              alignSelf: "center",
              maxHeight: "82%",
              backgroundColor: t.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: 16,
              paddingBottom: Math.max(16, insets.bottom),
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Body strong>{title}</Body>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar seleção"
                hitSlop={8}
                onPress={() => setOpen(false)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 24, color: t.muted }}>×</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Buscar pelo nome"
              placeholder="Buscar pelo nome"
              placeholderTextColor={t.muted}
              style={{
                borderColor: t.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                minHeight: 44,
                color: t.text,
              }}
              value={search}
              onChangeText={(v) => {
                setSearch(v);
                setPage(0);
              }}
            />
            <FormScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 4 }}
            >
              {q.loading ? (
                <ActivityIndicator />
              ) : q.error ? (
                <Notice message={q.error} onRetry={q.retry} />
              ) : (
                <>
                  {q.data?.itens.map(
                    (item) =>
                      item.id && (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: item.id === value?.id,
                          }}
                          onPress={() => choose({ ...item, id: item.id! })}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 9,
                            minHeight: 48,
                            padding: 6,
                            borderRadius: 9,
                            borderColor: t.border,
                            backgroundColor:
                              item.id === value?.id ? t.accentTint : t.surface,
                          }}
                        >
                          <Choice category={category} item={item} inSheet />
                          {item.id === value?.id && (
                            <Text
                              style={{ color: t.primaryText, fontSize: 19 }}
                            >
                              ✓
                            </Text>
                          )}
                        </Pressable>
                      ),
                  )}
                  {!q.data?.itens.length && (
                    <Body muted>Nenhum item encontrado.</Body>
                  )}
                  {(q.data?.total ?? 0) > 12 && (
                    <Pagination
                      page={page}
                      size={12}
                      total={q.data!.total}
                      onPage={setPage}
                    />
                  )}
                </>
              )}
              {category === "embalagens" && (
                <Button
                  variant="ghost"
                  label="Limpar seleção"
                  onPress={() => choose()}
                />
              )}
            </FormScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export function SavedCalculation({ id }: { id: string }) {
  const q = useApiQuery<Schema["CalculoSalvo"]>(
    "/calculos/" + encodeURIComponent(id),
  );
  const h = q.data;
  return (
    <ModuleScreen
      lightHeader
      title="Detalhes do cálculo"
      section="Meus cálculos"
      onBack={() => router.setParams({ modo: "historico" })}
    >
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        h && (
          <>
            <Card>
              <CalculationIdentity id={id} name={h.valores?.nome} large />
              <Body muted>
                {h.data?.split("-").reverse().join("/")} · {h.situacao}
              </Body>
            </Card>
            <Card>
              {h.valores && <Breakdown result={h.valores} />}
              <Body strong>Dados da impressão</Body>
              <ValueRow label="Impressora" value={h.impressora ?? "—"} />
              <ValueRow label="Filamento" value={h.filamento ?? "—"} />
              <ValueRow label="Embalagem" value={h.embalagem ?? "—"} />
              <ValueRow
                label="Unidades"
                value={String(h.valores?.unidades ?? 1)}
              />
              <ValueRow
                label="Tempo por unidade"
                value={(h.minutos ?? 0) + " min"}
              />
            </Card>
          </>
        )
      )}
    </ModuleScreen>
  );
}
export function CalculationHistory() {
  const t = useTheme();
  const [page, setPage] = useState(0),
    [search, setSearch] = useState("");
  const q = useApiQuery<Schema["PaginaResponseHistoricoListaResponse"]>(
    "/calculos?pagina=" + page + "&busca=" + encodeURIComponent(search),
  );
  return (
    <ModuleScreen
      lightHeader
      title="Meus cálculos"
      section="Calcular"
      onBack={menu}
    >
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Body strong>Cálculos realizados</Body>
          {q.data && <Badge>{q.data.total} registros</Badge>}
        </View>
        <Field
          label="Buscar peça"
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(0);
          }}
        />
      </Card>
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          {q.data?.itens?.map((item) => (
            <Card key={item.id}>
              <CalculationIdentity id={item.id} name={item.nomePeca} />
              <Body muted>
                {item.dataCalculo?.slice(0, 10).split("-").reverse().join("/")}{" "}
                · {item.unidades ?? 1} un.
              </Body>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <Body strong>
                  {money(item.precoVendaPlataforma ?? item.precoSugerido)} / un.
                </Body>
                <Badge>
                  {item.vendido
                    ? "Vendido"
                    : item.produzido
                      ? "Em estoque"
                      : "Só cálculo"}
                </Badge>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Ver detalhes de " + item.nomePeca}
                onPress={() =>
                  router.setParams({ modo: "detalhe", id: item.id })
                }
                style={{
                  alignSelf: "flex-start",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              >
                <Icon name="eye" color={t.primaryText} />
              </Pressable>
            </Card>
          ))}
          {!q.data?.itens?.length && (
            <Body muted>
              {search
                ? "Nenhum cálculo encontrado."
                : "Você ainda não tem cálculos salvos."}
            </Body>
          )}
          {(q.data?.total ?? 0) > 12 && (
            <Pagination
              page={page}
              total={q.data!.total!}
              size={12}
              onPage={setPage}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}

type Material = {
  key: number;
  item?: Selection;
  grams: string;
  color?: string;
  name?: string;
};
export function CalculationForm({
  quick,
  initial,
}: {
  quick: boolean;
  initial?: Selection;
}) {
  const insets = useSafeAreaInsets();
  const t = useTheme(),
    [step, setStep] = useState(0);
  const stages = ["Materiais", "Impressão", "Embalagem", "Venda e markup"];
  const [piece, setPiece] = useState(initial),
    [printer, setPrinter] = useState<Selection>(),
    [pack, setPack] = useState<Selection>();
  const defaults = useApiQuery<Schema["PadroesCalculo"]>("/calculos/padroes");
  const [materials, setMaterials] = useState<Material[]>(() =>
    referencedMaterials(initial?.materiais, initial?.gramas ?? ""),
  );
  const nextKey = useRef(materials.length),
    lock = useRef(false);
  const [sale, setSale] = useState(initialSale),
    [file, setFile] = useState<Schema["ArquivoConsulta"]>();
  const [review, setReview] = useState<{
    key: string;
    value?: Result;
    manualFreight?: boolean;
    error?: string;
  }>();
  const [quickKey, setQuickKey] = useState("");
  function loadMaterials(refs: CatalogRow["materiais"], fallback: string) {
    const rows = referencedMaterials(refs, fallback);
    nextKey.current = rows.length;
    setMaterials(rows);
  }
  const [photo, setPhoto] = useState<{ type: string; base64: string } | null>(
    null,
  );
  async function choosePhoto() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const picked = await pickCalculationPhoto();
      if (picked) setPhoto(picked);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir a foto.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function importFile() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const body = await pick3mf();
      if (!body) return;
      const imported = await request<Schema["ArquivoConsulta"]>(
        "/calculos/arquivo",
        { method: "POST", body },
      );
      setFile(imported);
      setUnits("1");
      setMinutes(
        imported.completo && imported.segundos
          ? String(Math.max(1, Math.ceil(imported.segundos / 60)))
          : "",
      );
      loadMaterials(
        imported.materiais?.map((m) => ({
          material: m.material,
          corHex: m.cor,
          pesoGramas: m.pesoGramas,
        })),
        String(imported.gramas ?? ""),
      );
      setResult(undefined);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível importar o arquivo.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const [minutes, setMinutes] = useState(String(initial?.minutos ?? "")),
    [units, setUnits] = useState("1"),
    [labor, setLabor] = useState("0"),
    [markup, setMarkup] = useState("");
  const numeric = (s: string) =>
    /^\d+([,.]\d+)?$/.test(s.trim()) ? Number(s.trim().replace(",", ".")) : NaN;
  const workMinutes = defaults.data?.maoObraAtivada
    ? defaults.data.maoObraTempoFixo
      ? (defaults.data.tempoMaoObraFixoMinutos ?? 0)
      : numeric(labor || "0")
    : 0;
  const [result, setResult] = useState<Result>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{ message: string } | null>(null);
  function setError(message: string) {
    setNotice(message ? { message } : null);
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  function update(key: number, patch: Partial<Material>) {
    setMaterials((prev) =>
      prev.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    );
  }
  function makeInput() {
    if (markup && !Number.isFinite(numeric(markup)))
      throw new Error("Informe um markup válido.");
    const copies = quick && file ? numeric(units) : 1;
    return {
      pecaId: quick ? undefined : piece?.id,
      impressoraId: printer?.id,
      filamentos: calculationFilaments(
        materials.map((m) => ({ id: m.item?.id, grams: numeric(m.grams) })),
        copies,
      ),
      embalagemId: pack?.id,
      unidades: numeric(units),
      minutos: numeric(minutes) * copies,
      placas: file?.placas,
      nomeConsulta: file?.nome,
      venda: quick ? undefined : saleInput(sale, !!defaults.data?.avancado),
      trabalho: workMinutes,
      markup: markup ? numeric(markup) : undefined,
    };
  }
  let payload = "",
    inputError = "";
  try {
    payload = JSON.stringify(makeInput());
  } catch (e) {
    inputError = e instanceof Error ? e.message : "Confira a plataforma.";
  }
  const reviewing =
    !quick && step === 3 && !result && !!defaults.data && !!payload;
  useEffect(() => {
    if (!reviewing) return;
    let active = true;
    const timer = setTimeout(() => {
      request<Result>("/calculos/previa", { method: "POST", body: payload })
        .then((value) => {
          if (active) setReview({ key: payload, value });
        })
        .catch((e) => {
          if (active)
            setReview({
              key: payload,
              manualFreight: e instanceof ApiError && e.code === "frete_manual",
              error:
                e instanceof Error
                  ? e.message
                  : "Não foi possível calcular a prévia.",
            });
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [payload, reviewing]);
  const summary = review?.key === payload ? review : undefined;
  function materialProblem() {
    const index = materials.findIndex(
      (m) => !m.item || !(numeric(m.grams) > 0),
    );
    if (index < 0) return "";
    return !materials[index].item
      ? `Selecione o rolo do Filamento ${index + 1}.`
      : `Informe o consumo em gramas do Filamento ${index + 1}.`;
  }
  function next() {
    let problem = "";
    if (
      step === 0 &&
      (!piece ||
        !!materialProblem() ||
        !Number.isInteger(numeric(units)) ||
        numeric(units) < 1 ||
        numeric(units) > 10000)
    )
      problem = !piece
        ? "Selecione a peça."
        : materialProblem() || "Informe entre 1 e 10.000 unidades.";
    if (
      step === 1 &&
      (!printer ||
        !Number.isInteger(numeric(minutes)) ||
        numeric(minutes) < 1 ||
        !Number.isInteger(workMinutes))
    )
      problem = "Escolha a impressora e confira os tempos em minutos.";
    if (step === 2 && !defaults.data?.embalagemFixa && !pack)
      problem = "Selecione a embalagem.";
    setError(problem);
    if (!problem) setStep(step + 1);
  }
  async function submit(save: boolean) {
    if (lock.current) return;
    setError("");
    const missingMaterial = materialProblem();
    if (missingMaterial) {
      setError(missingMaterial);
      return;
    }
    if (
      (!quick && !piece?.id) ||
      !printer ||
      !(numeric(minutes) > 0 && Number.isInteger(numeric(minutes))) ||
      !(
        Number.isInteger(numeric(units)) &&
        numeric(units) >= 1 &&
        numeric(units) <= 10000
      ) ||
      !Number.isInteger(workMinutes) ||
      (markup && !Number.isFinite(numeric(markup)))
    ) {
      setError(
        "Confira os itens selecionados, os gramas e os tempos. Informe entre 1 e 10.000 unidades.",
      );
      return;
    }
    if (!defaults.data?.embalagemFixa && !pack) {
      setError("Selecione uma embalagem.");
      return;
    }
    if (inputError) {
      setError(inputError);
      return;
    }
    const input = JSON.parse(payload);
    lock.current = true;
    setBusy(true);
    try {
      if (!quick && !save && summary?.value) {
        setResult(summary.value);
        return;
      }
      if (quick) {
        setResult(undefined);
        setQuickKey(payload);
      }
      setResult(
        await request<Result>(save ? "/calculos" : "/calculos/previa", {
          method: "POST",
          body: JSON.stringify(
            save
              ? {
                  entrada: input,
                  foto: photo?.base64,
                  custoEsperado: result?.custoUnitario,
                  precoEsperado: result?.precoUnitario,
                  precoPlataformaEsperado: result?.custos?.precoVendaPlataforma,
                }
              : input,
          ),
        }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setReview(undefined);
        setResult(undefined);
      }
      setError(e instanceof Error ? e.message : "Não foi possível calcular.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const back = () => {
    if (busy) return;
    if (!quick && result && !result.id) {
      setResult(undefined);
      setError("");
    } else if (!result && !quick && step > 0) {
      setStep(step - 1);
      setError("");
    } else menu();
  };
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        lightHeader
        section={!quick && step > 0 && !result ? stages[step - 1] : "Calcular"}
        title={
          result && !quick
            ? result.id
              ? "Cálculo salvo"
              : "Resultado da impressão"
            : quick
              ? "Consultar sem salvar"
              : "Calcular e salvar"
        }
        onBack={back}
      >
        {defaults.loading ? (
          <ActivityIndicator />
        ) : defaults.error ? (
          <Notice message={defaults.error} onRetry={defaults.retry} />
        ) : result && !quick ? (
          <Card>
            <Body strong>
              {result.id ? "Cálculo salvo" : "Resultado da consulta"}
            </Body>
            {result.id ? (
              <CalculationIdentity id={result.id} name={result.nome} large />
            ) : (
              <>
                {photo && (
                  <Image
                    accessibilityLabel="Foto escolhida para este cálculo"
                    source={{
                      uri: "data:" + photo.type + ";base64," + photo.base64,
                    }}
                    resizeMode="contain"
                    style={{ width: "100%", height: 112 }}
                  />
                )}
                <Body>{result.nome}</Body>
              </>
            )}
            <Body muted>{result.unidades} un.</Body>
            <Breakdown result={result} />
            {result.id ? (
              <Button
                label="Ver meus cálculos"
                onPress={() => router.setParams({ modo: "historico" })}
              />
            ) : (
              <>
                {!quick && (
                  <Button
                    label="Confirmar e salvar"
                    busy={busy}
                    disabled={busy}
                    onPress={() => void submit(true)}
                  />
                )}
                <Button
                  label="Ajustar cálculo"
                  variant="secondary"
                  disabled={busy}
                  onPress={back}
                />
              </>
            )}
          </Card>
        ) : (
          <View pointerEvents={busy ? "none" : "auto"} style={{ gap: 12 }}>
            {!quick && (
              <View style={{ gap: 7 }}>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {stages.map((name, i) => (
                    <View
                      key={name}
                      style={{
                        flex: 1,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: i <= step ? t.primary : t.border,
                      }}
                    />
                  ))}
                </View>
                <Body muted>
                  Etapa {step + 1} de 4 · {stages[step]}
                </Body>
              </View>
            )}
            {(quick || step === 0) && (
              <Card>
                <SectionTitle number="01" title="Materiais" />
                {quick && (
                  <>
                    <Button
                      variant="secondary"
                      label={
                        file ? "Trocar arquivo 3MF" : "Importar arquivo 3MF"
                      }
                      onPress={() => void importFile()}
                    />
                    {file && (
                      <>
                        {file.imagemPreviewDataUri && (
                          <Image
                            accessibilityLabel="Prévia da peça importada"
                            source={{ uri: file.imagemPreviewDataUri }}
                            resizeMode="contain"
                            style={{
                              width: "100%",
                              height: 110,
                              borderRadius: 8,
                            }}
                          />
                        )}
                        <Body strong>{file.nome}</Body>
                        <Body muted>
                          {file.placas} placa(s)
                          {file.completo
                            ? ""
                            : " · Confira o tempo e o consumo do fatiamento."}
                        </Body>
                      </>
                    )}
                  </>
                )}
                {!quick && (
                  <Picker
                    label="Peça"
                    category="pecas"
                    value={piece}
                    onChange={(p) => {
                      setPiece(p);
                      setMinutes(String(p?.minutos ?? ""));
                      loadMaterials(p?.materiais, p?.gramas ?? "");
                    }}
                  />
                )}
                {!quick && (
                  <View style={{ gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <Body muted>Foto do cálculo</Body>
                      <OptionalBadge />
                    </View>
                    {photo && (
                      <Image
                        accessibilityLabel="Foto escolhida para este cálculo"
                        source={{
                          uri: "data:" + photo.type + ";base64," + photo.base64,
                        }}
                        resizeMode="contain"
                        style={{
                          width: "100%",
                          height: 132,
                          borderRadius: 10,
                          backgroundColor: t.accentTint,
                        }}
                      />
                    )}
                    <Button
                      variant="secondary"
                      label={photo ? "Trocar foto" : "Adicionar foto"}
                      onPress={() => void choosePhoto()}
                    />
                    {photo ? (
                      <Button
                        variant="ghost"
                        label="Remover foto"
                        onPress={() => setPhoto(null)}
                      />
                    ) : (
                      <Body muted>JPG, PNG ou WEBP · até 3 MB</Body>
                    )}
                  </View>
                )}
                <Field
                  label="Quantidade de unidades"
                  keyboardType="number-pad"
                  value={units}
                  onChangeText={setUnits}
                />
                {materials.map((m, index) => (
                  <View
                    key={m.key}
                    style={{
                      gap: 8,
                      borderWidth: 1,
                      borderColor: t.border,
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 7,
                      }}
                    >
                      <Body strong>Filamento {index + 1}</Body>
                      {m.color && (
                        <View
                          style={{
                            height: 16,
                            width: 16,
                            borderRadius: 8,
                            borderColor: t.border,
                            borderWidth: 1,
                            backgroundColor: m.color,
                          }}
                        />
                      )}
                      <Body muted>
                        {[m.name, m.color?.toUpperCase()]
                          .filter(Boolean)
                          .join(" · ")}
                      </Body>
                    </View>
                    <Picker
                      label="Filamento"
                      category="filamentos"
                      value={m.item}
                      onChange={(item) => update(m.key, { item })}
                    />
                    <Field
                      label={
                        quick
                          ? file
                            ? "Consumo por arquivo (g)"
                            : "Consumo total do lote (g)"
                          : "Consumo por unidade (g)"
                      }
                      keyboardType="decimal-pad"
                      value={m.grams}
                      onChangeText={(grams) => update(m.key, { grams })}
                    />
                    {materials.length > 1 && (
                      <Button
                        variant="ghost"
                        label="Remover filamento"
                        onPress={() =>
                          setMaterials(materials.filter((x) => x.key !== m.key))
                        }
                      />
                    )}
                  </View>
                ))}
                {materials.length < 100 && (
                  <Button
                    variant="ghost"
                    label="Adicionar filamento"
                    onPress={() =>
                      setMaterials([
                        ...materials,
                        { key: nextKey.current++, grams: "" },
                      ])
                    }
                  />
                )}
              </Card>
            )}
            {(quick || step === 1) && (
              <Card>
                <SectionTitle number="02" title="Impressão" />
                <Picker
                  label="Impressora"
                  category="impressoras"
                  value={printer}
                  onChange={setPrinter}
                />
                <Field
                  label={
                    quick
                      ? file
                        ? "Tempo por arquivo (min)"
                        : "Tempo total do lote (min)"
                      : "Tempo por unidade (min)"
                  }
                  keyboardType="number-pad"
                  value={minutes}
                  onChangeText={setMinutes}
                />
                {!quick && <Body muted>Uma unidade por impressão.</Body>}
                {defaults.data?.maoObraAtivada &&
                  (defaults.data.maoObraTempoFixo ? (
                    <ValueRow
                      label="Trabalho manual fixo por unidade"
                      value={workMinutes + " min"}
                    />
                  ) : (
                    <Field
                      label="Trabalho manual por unidade (min)"
                      value={labor}
                      keyboardType="number-pad"
                      onChangeText={setLabor}
                    />
                  ))}
              </Card>
            )}
            {(quick || step === 2) && (
              <Card>
                {quick && <SectionTitle number="03" title="Embalagem" />}
                {defaults.data?.embalagemFixa ? (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      <Body strong>Embalagem fixa da loja</Body>
                      <Badge>Já no cálculo</Badge>
                    </View>
                    <ValueRow
                      label="Custo por unidade"
                      value={money(defaults.data.custoEmbalagemFixa)}
                    />
                  </>
                ) : (
                  <Picker
                    label="Embalagem"
                    category="embalagens"
                    value={pack}
                    onChange={setPack}
                  />
                )}
              </Card>
            )}
            {(quick || step === 3) && (
              <Card>
                <SectionTitle number="04" title="Venda e markup" />
                {defaults.data?.markupFixo ? (
                  <Body muted>
                    Markup fixo da loja · {defaults.data.markup}%
                  </Body>
                ) : (
                  <>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
                      {defaults.data?.atalhosMarkup?.map((v, i) => (
                        <Chip
                          key={i}
                          label={String(v).replace(".", ",") + "%"}
                          selected={markup !== "" && numeric(markup) === v}
                          onPress={() => setMarkup(String(v))}
                        />
                      ))}
                    </View>
                    <Field
                      label="Markup (%)"
                      placeholder={String(defaults.data?.markup ?? 0)}
                      value={markup}
                      keyboardType="decimal-pad"
                      onChangeText={setMarkup}
                    />
                  </>
                )}
                {!quick && (
                  <>
                    <SaleOptions
                      manualFreight={!!summary?.manualFreight || !!sale.manual}
                      s={sale}
                      change={setSale}
                      advanced={!!defaults.data?.avancado}
                    />
                    <Body strong>Resumo por unidade</Body>
                    {inputError || summary?.error ? (
                      <Body muted>{inputError || summary?.error}</Body>
                    ) : summary?.value ? (
                      <>
                        <Prices
                          cost={summary.value.custoUnitario}
                          price={
                            summary.value.custos?.precoVendaPlataforma ??
                            summary.value.precoUnitario
                          }
                        />
                        <ValueRow
                          label="Taxas da plataforma"
                          value={money(summary.value.custos?.taxasPlataforma)}
                        />
                      </>
                    ) : (
                      <ActivityIndicator />
                    )}
                  </>
                )}
              </Card>
            )}
            {quick && (
              <Button
                label="Consultar preço"
                busy={busy}
                disabled={busy}
                onPress={() => void submit(false)}
              />
            )}
            {quick && quickKey === payload && result && (
              <Modal
                transparent
                animationType="slide"
                visible
                onRequestClose={() => setResult(undefined)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(32,22,52,0.46)",
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar consulta"
                    style={{ flex: 1 }}
                    onPress={() => setResult(undefined)}
                  />
                  <View
                    accessibilityViewIsModal
                    style={{
                      width: "100%",
                      maxWidth: 640,
                      alignSelf: "center",
                      maxHeight: "82%",
                      backgroundColor: t.surface,
                      borderTopLeftRadius: 22,
                      borderTopRightRadius: 22,
                      padding: 16,
                      paddingBottom: Math.max(16, insets.bottom),
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Body strong>Resultado da consulta</Body>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Fechar resultado"
                        onPress={() => setResult(undefined)}
                        style={{ padding: 10 }}
                      >
                        <Text style={{ fontSize: 24, color: t.muted }}>×</Text>
                      </Pressable>
                    </View>
                    <FormScrollView
                      contentContainerStyle={{ paddingVertical: 10 }}
                    >
                      <Breakdown result={result} />
                    </FormScrollView>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}
      </ModuleScreen>
      {!quick &&
        !result &&
        defaults.data &&
        !defaults.loading &&
        !defaults.error && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderColor: t.border,
              backgroundColor: t.surface,
              flexDirection: "row",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                label="Voltar"
                disabled={busy}
                onPress={back}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={step < 3 ? "Continuar" : "Ver resultado"}
                busy={busy}
                disabled={busy}
                onPress={step < 3 ? next : () => void submit(false)}
              />
            </View>
          </View>
        )}
      {notice && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 8,
            left: 12,
            right: 12,
            maxWidth: 530,
            alignSelf: "center",
            marginHorizontal: "auto",
            zIndex: 10,
            borderWidth: 1,
            borderColor: t.danger,
            borderRadius: 11,
            backgroundColor: t.dangerBackground,
          }}
        >
          <Notice message={notice.message} />
        </View>
      )}
    </View>
  );
}
