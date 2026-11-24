import { pieceCalculation } from "@/features/calculation-route";
import { router } from "expo-router";
import { Icon } from "./icon";
import { useCallback, useState, type ComponentProps } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { components } from "@/api/schema";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";
import { decimal, reais } from "@/features/format";
import { openWebsite } from "@/features/website";
import { Badge, Body, Card, Heading, Notice, Screen } from "./ui";
import {
  catalogPaths,
  PiecePhoto,
  MaterialChips,
  type CatalogCategory,
  type CatalogRow,
} from "./catalog-card";

type Glyph = ComponentProps<typeof Icon>["name"];
type Schemas = components["schemas"];
const titles = {
  pecas: [
    "Detalhes da peça",
    "Confira as informações cadastradas para esta peça.",
    "Parâmetros de impressão",
    "peça",
    "peças",
  ],
  impressoras: [
    "Detalhes da impressora",
    "Confira as informações cadastradas para este equipamento.",
    "Equipamento",
    "impressora",
    "impressoras",
  ],
  embalagens: [
    "Detalhes da embalagem",
    "Confira os dados do material de embalagem.",
    "Material de embalagem",
    "embalagem",
    "embalagens",
  ],
  filamentos: [
    "Detalhes do filamento",
    "Confira os dados do material, do rolo e do estoque disponível.",
    "Material de impressão",
    "filamento",
    "filamentos",
  ],
};
function formatMeasure(
  value: string | undefined,
  unit: string,
  places = 2,
  fallback = "Não informado",
) {
  return value == null ? fallback : decimal(value, places) + " " + unit;
}
function Label({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text
      style={{
        color: t.muted,
        fontSize: 12,
        letterSpacing: 1.3,
        fontWeight: "700",
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: Glyph;
  label: string;
  value: string;
}) {
  const t = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <View style={s.line}>
        <View style={[s.small, { backgroundColor: t.accentTint }]}>
          <Icon name={icon} size={18} color={t.primaryText} />
        </View>
        <View style={{ flex: 1 }}>
          <Body muted>{label}</Body>
        </View>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: t.text }}>
        {value}
      </Text>
    </Card>
  );
}
function Info({ children }: { children: string }) {
  const t = useTheme();
  return (
    <View style={[s.line, { alignItems: "flex-start" }]}>
      <Icon name="info-circle" size={16} color={t.primaryText} />
      <View style={{ flex: 1 }}>
        <Body muted>{children}</Body>
      </View>
    </View>
  );
}
function Action({
  label,
  icon,
  onPress,
  primary = false,
}: {
  label: string;
  icon: Glyph;
  onPress: () => void;
  primary?: boolean;
}) {
  const t = useTheme(),
    color = primary ? t.onPrimary : t.primaryText;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        {
          backgroundColor: primary ? t.primary : t.accentTint,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name={icon} size={16} color={color} />
      <Text style={{ color, fontWeight: "600", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}
function PieceFile({ row, onEdit }: { row: CatalogRow; onEdit: () => void }) {
  const q = useApiQuery<Schemas["ArquivoCatalogo"]>(
    row.id
      ? "/catalogo/pecas/" + encodeURIComponent(row.id) + "/arquivo"
      : null,
  );
  if (q.loading)
    return (
      <ActivityIndicator accessibilityLabel="Carregando arquivo da peça" />
    );
  if (q.error) return <Notice message={q.error} onRetry={q.retry} />;
  const file = q.data;
  if (!file) return null;
  return (
    <>
      <Card>
        <Label>Arquivo 3D importado</Label>
        <Body strong>{file.nomeArquivo}</Body>
        <Body muted>
          {[
            file.modeloImpressora,
            file.fatiador,
            file.numeroPlacas != null
              ? file.numeroPlacas +
                (file.numeroPlacas === 1 ? " placa" : " placas")
              : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Body>
        <Action icon="arrow-repeat" label="Trocar arquivo" onPress={onEdit} />
      </Card>
      {!!row.materiais?.length && (
        <>
          <Body strong>Materiais e cores</Body>
          <MaterialChips materiais={row.materiais} />
        </>
      )}
      {file.placas?.map((p) => (
        <Card key={p.numero}>
          {p.temImagem ? (
            <PiecePhoto
              large
              row={{
                id: row.id,
                nome: row.nome + " · placa " + p.numero,
                placaMiniatura: p.numero,
              }}
            />
          ) : (
            <Body muted>Prévia indisponível</Body>
          )}
          <Body strong>Placa {p.numero}</Body>
          {(p.tempoSegundos != null || p.pesoGramas != null) && (
            <Body muted>
              {[
                p.tempoSegundos != null
                  ? Math.round(p.tempoSegundos / 60) + " min"
                  : null,
                p.pesoGramas != null
                  ? decimal(String(p.pesoGramas), 1) + " g"
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Body>
          )}
          <MaterialChips materiais={p.materiais} />
        </Card>
      ))}
    </>
  );
}
export function CatalogDetail({
  onEdit,
  category,
  row,
  onBack,
}: {
  onEdit: (purchase?: boolean) => void;
  category: CatalogCategory;
  row: CatalogRow;
  onBack: () => void;
}) {
  const t = useTheme();
  const [error, setError] = useState("");
  const id = encodeURIComponent(row.id ?? ""),
    path = "/" + catalogPaths[category];
  const printer = category === "impressoras",
    filament = category === "filamentos",
    piece = category === "pecas";
  const costs = useApiQuery<Schemas["CustosImpressora"]>(
    printer && id ? "/catalogo/impressoras/" + id + "/custos" : null,
  );
  const c = costs.data;
  const [title, description, section, singular, plural] = titles[category];
  const subtitle = piece
    ? "Valores usados como referência ao calcular esta peça."
    : printer
      ? row.modelo
      : filament
        ? [row.marca, row.cor].filter(Boolean).join(" · ")
        : "Valor usado como referência nos cálculos de custo.";
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [onBack]),
  );
  function open(dest: string) {
    setError("");
    void openWebsite(dest).catch(() =>
      setError("Não foi possível abrir o site."),
    );
  }
  const symbol = (
    <View
      style={[
        s.symbol,
        {
          backgroundColor:
            filament && row.codigoCor ? row.codigoCor : t.accentTint,
        },
      ]}
    >
      {(!filament || !row.codigoCor) && (
        <Icon
          name={printer ? "printer" : filament ? "palette" : "box"}
          size={27}
          color={t.primaryText}
        />
      )}
    </View>
  );
  const identity = (
    <View style={{ gap: 6, flexShrink: 1 }}>
      <Label>{section}</Label>
      <Text style={{ color: t.text, fontSize: 23, fontWeight: "500" }}>
        {row.nome}
      </Text>
      {!!subtitle && <Body muted>{subtitle}</Body>}
      {piece && !!row.categoria && (
        <View style={{ alignItems: "flex-start" }}>
          <Badge>{row.categoria}</Badge>
        </View>
      )}
    </View>
  );
  return (
    <Screen>
      <Label>Seu catálogo</Label>
      <Heading title={title} subtitle={description} />
      <View style={{ alignSelf: "flex-start" }}>
        <Action icon="arrow-left" label="Voltar" onPress={onBack} />
      </View>
      <Card style={{ padding: 0, gap: 0 }}>
        <View style={s.section}>
          <View style={printer ? s.line : s.stack}>
            {symbol}
            {identity}
          </View>
          <Action
            primary
            icon="pencil"
            label={"Editar " + singular}
            onPress={() => onEdit()}
          />
        </View>
        <View style={[s.section, { borderTopWidth: 1, borderColor: t.border }]}>
          {piece ? (
            <>
              <Metric
                icon="palette2"
                label="Filamento por unidade"
                value={formatMeasure(row.gramas, "g")}
              />
              <Metric
                icon="clock-history"
                label="Tempo por unidade"
                value={
                  row.minutos == null ? "Não informado" : row.minutos + " min"
                }
              />
              <PieceFile row={row} onEdit={() => onEdit()} />
              <Info>
                O tempo e o consumo podem ser ajustados durante o cálculo.
              </Info>
              {row.preco != null && (
                <Metric
                  icon="cash-coin"
                  label="Último preço sugerido"
                  value={reais(row.preco)}
                />
              )}
              <Action
                icon="calculator"
                label="Calcular"
                onPress={() => router.push(pieceCalculation(row))}
              />
            </>
          ) : filament ? (
            <>
              <Metric
                icon="box"
                label="Estoque disponível"
                value={formatMeasure(row.estoque, "g")}
              />
              <Metric
                icon="disc"
                label="Peso do rolo"
                value={formatMeasure(row.pesoRolo, "g")}
              />
              <Metric
                icon="cash-coin"
                label="Custo médio do rolo"
                value={reais(row.precoRolo)}
              />
              <Metric
                icon="palette2"
                label="Cor cadastrada"
                value={row.cor || "Não informada"}
              />
              <Info>
                O estoque é atualizado quando você registra uma compra ou marca
                um cálculo como produzido.
              </Info>
              <Action
                icon="search"
                label="Ver uso no histórico"
                onPress={() => open(path + "/" + id + "/historico")}
              />
              <Action
                icon="bag-plus"
                label="Registrar compra"
                onPress={() => onEdit(true)}
              />
            </>
          ) : printer ? (
            <>
              <Metric
                icon="lightning-charge"
                label="Potência média informada"
                value={formatMeasure(row.watts, "W")}
              />
              <Metric
                icon="thermometer-half"
                label="Aquecimento por impressão"
                value={(row.aquecimento ?? 0) + " min"}
              />
              {costs.loading ? (
                <ActivityIndicator />
              ) : costs.error ? (
                <Notice message={costs.error} onRetry={costs.retry} />
              ) : (
                c && (
                  <>
                    <Metric
                      icon="cash-coin"
                      label="Depreciação estimada por hora"
                      value={
                        c.depreciacaoHora != null
                          ? "R$ " + decimal(c.depreciacaoHora, 4) + "/h"
                          : "Não informada"
                      }
                    />
                    <Metric
                      icon="hourglass-split"
                      label="Horas previstas até troca ou revenda"
                      value={formatMeasure(
                        c.vidaUtilHoras,
                        "h",
                        0,
                        "Não informadas",
                      )}
                    />
                    <Metric
                      icon="calendar3"
                      label="Uso mensal estimado"
                      value={formatMeasure(
                        c.horasMensais,
                        "h/mês",
                        1,
                        "Ainda não estimado",
                      )}
                    />
                  </>
                )
              )}
              <Info>
                A potência e os tempos cadastrados alimentam as estimativas de
                custo.
              </Info>
            </>
          ) : (
            <>
              <Metric
                icon="cash-coin"
                label="Custo por unidade"
                value={reais(row.custo)}
              />
              <Metric
                icon="calculator"
                label="Aplicação"
                value="Por peça calculada"
              />
              <Info>
                O custo pode ser alterado a qualquer momento. Cálculos já salvos
                preservam os valores registrados.
              </Info>
            </>
          )}
          <Action
            icon="arrow-left"
            label={"Voltar para " + plural}
            onPress={onBack}
          />
        </View>
      </Card>
      {printer && c && (
        <Card style={s.section}>
          <Body strong>Manutenção da impressora</Body>
          <Body muted>
            Registre gastos com reparos e peças para estimar a manutenção por
            hora de uso.
          </Body>
          <Metric
            icon="clock-history"
            label="Horas de impressão registradas"
            value={formatMeasure(
              ((c.minutosImpressos ?? 0) / 60).toFixed(2),
              "h",
            )}
          />
          <Metric
            icon="cash-coin"
            label="Total de manutenção registrado"
            value={reais(c.gastoTotal)}
          />
          <Metric
            icon="cash-coin"
            label="Estimativa de manutenção por hora"
            value={reais(c.manutencaoHora) + "/h"}
          />
          {c.registros?.map((g) => (
            <Card key={g.id}>
              <Body strong>{g.descricao}</Body>
              <Body muted>
                {g.data?.split("-").reverse().join("/")} · {reais(g.valor)}
              </Body>
            </Card>
          ))}
          <Action
            icon="bag-plus"
            label="Registrar manutenção"
            onPress={() => open(path + "/detalhes/" + id)}
          />
        </Card>
      )}
      {!!error && <Notice message={error} />}
    </Screen>
  );
}
const s = StyleSheet.create({
  section: { padding: 16, gap: 16 },
  stack: { gap: 16 },
  line: { flexDirection: "row", gap: 10, alignItems: "center" },
  small: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  symbol: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
