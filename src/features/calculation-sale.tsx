import { View } from "react-native";
import type { components } from "@/api/schema";
import { Body, Chip, Field } from "@/components/ui";
type Sale = components["schemas"]["VendaCalculoEntrada"];
type Channel = NonNullable<Sale["plataformaVenda"]>;
const channels: Record<Channel, string> = {
  NENHUMA: "Venda direta",
  SHOPEE: "Shopee",
  TIKTOK: "TikTok Shop",
  MERCADO_LIVRE: "Mercado Livre",
  AMAZON: "Amazon",
};
const weights: Record<string, string> = {
  ATE_300G: "Até 300 g",
  DE_300G_500G: "300–500 g",
  DE_500G_1KG: "500 g–1 kg",
  DE_1KG_1_5KG: "1–1,5 kg",
  DE_1_5KG_2KG: "1,5–2 kg",
  DE_2KG_3KG: "2–3 kg",
  DE_3KG_4KG: "3–4 kg",
  DE_4KG_5KG: "4–5 kg",
};
export type SaleForm = {
  channel: Channel;
  listing: string;
  person: string;
  weight: string;
  free: boolean;
  exempt: boolean;
  volume: boolean;
  commission: string;
  extra: string;
  tax: string;
  shipping: string;
  affiliate: string;
  manual: string;
};
export const initialSale: SaleForm = {
  channel: "NENHUMA",
  listing: "CLASSICO",
  person: "CPF",
  weight: "",
  free: false,
  exempt: false,
  volume: false,
  commission: "",
  extra: "",
  tax: "",
  shipping: "",
  affiliate: "",
  manual: "",
};
export function saleInput(s: SaleForm, advanced: boolean): Sale {
  function number(raw: string) {
    if (!raw.trim()) return undefined;
    if (!/^\d+([.,]\d+)?$/.test(raw.trim()))
      throw new Error("Confira os valores de venda e plataforma.");
    return Number(raw.replace(",", "."));
  }
  const sale: Sale = { plataformaVenda: s.channel };
  if (advanced) {
    sale.percentualImposto = number(s.tax);
    sale.freteVendedor = number(s.shipping);
  }
  if (s.channel === "TIKTOK") {
    sale.freteGratisTikTok = s.free;
    if (advanced) {
      sale.isencaoComissaoTikTok = s.exempt;
      sale.percentualAfiliado = number(s.affiliate);
    }
  }
  if (s.channel === "SHOPEE" && advanced) {
    sale.tipoPessoaShopee = s.person;
    sale.mais450PedidosShopee = s.person === "CPF" && s.volume;
  }
  if (s.channel === "MERCADO_LIVRE") {
    if (!advanced && !s.weight && !s.manual)
      throw new Error("Selecione o peso do pacote.");
    if (advanced) {
      const pct = number(s.commission),
        min = s.listing === "CLASSICO" ? 10 : 15;
      if (pct == null || pct < min || pct > min + 4)
        throw new Error(
          "Informe uma comissão entre " +
            min +
            "% e " +
            (min + 4) +
            "% para este anúncio.",
        );
    }
    sale.tipoAnuncio = s.listing;
    if (!advanced) {
      sale.faixaPesoPacote = s.weight || undefined;
      sale.freteMercadoLivreManual = number(s.manual);
    }
  }
  if (advanced && (s.channel === "AMAZON" || s.channel === "MERCADO_LIVRE")) {
    sale.percentualComissaoPlataforma = number(s.commission);
    sale.custoAdicionalPlataforma = number(s.extra);
  }
  return sale;
}
export function SaleOptions({
  s,
  change,
  advanced,
  manualFreight,
}: {
  s: SaleForm;
  change: (s: SaleForm) => void;
  advanced: boolean;
  manualFreight: boolean;
}) {
  function choices(
    label: string,
    values: Record<string, string>,
    value: string,
    set: (v: string) => void,
  ) {
    return (
      <View style={{ gap: 6 }}>
        <Body muted>{label}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(values).map(([v, text]) => (
            <Chip
              key={v}
              label={text}
              selected={value === v}
              onPress={() => set(v)}
            />
          ))}
        </View>
      </View>
    );
  }
  function field(
    key: "tax" | "shipping" | "manual" | "commission" | "extra" | "affiliate",
    label: string,
  ) {
    return (
      <Field
        label={label}
        value={s[key]}
        keyboardType="decimal-pad"
        onChangeText={(v) => change({ ...s, [key]: v })}
      />
    );
  }
  function toggle(key: "free" | "exempt" | "volume", label: string) {
    return choices(
      label,
      { sim: "Sim", nao: "Não" },
      s[key] ? "sim" : "nao",
      (v) => change({ ...s, [key]: v === "sim" }),
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {choices("Plataforma de venda", channels, s.channel, (v) =>
        change({
          ...initialSale,
          tax: s.tax,
          shipping: s.shipping,
          channel: v as Channel,
        }),
      )}
      {advanced && (
        <>
          {field("tax", "Imposto (%)")}
          {field("shipping", "Frete pago pelo vendedor (R$)")}
        </>
      )}
      {advanced && s.channel === "SHOPEE" && (
        <>
          {choices(
            "Tipo de cadastro",
            { CPF: "CPF", CNPJ: "CNPJ" },
            s.person,
            (v) => change({ ...s, person: v }),
          )}
          {s.person === "CPF" &&
            toggle("volume", "Mais de 450 pedidos em 90 dias?")}
        </>
      )}
      {s.channel === "TIKTOK" && (
        <>
          {toggle("free", "Programa de frete grátis")}
          {advanced && (
            <>
              {toggle("exempt", "Isenção de comissão")}
              {field("affiliate", "Comissão de afiliado (%)")}
            </>
          )}
        </>
      )}
      {s.channel === "MERCADO_LIVRE" && (
        <>
          {choices(
            "Tipo de anúncio",
            { CLASSICO: "Clássico", PREMIUM: "Premium" },
            s.listing,
            (v) => change({ ...s, listing: v, manual: "" }),
          )}
          {!advanced && (
            <>
              {choices("Peso do pacote", weights, s.weight, (v) =>
                change({ ...s, weight: v, manual: "" }),
              )}
              {manualFreight &&
                field("manual", "Custo de envio por unidade (R$)")}
            </>
          )}
        </>
      )}
      {advanced &&
        (s.channel === "AMAZON" || s.channel === "MERCADO_LIVRE") && (
          <>
            {field("commission", "Comissão do anúncio (%)")}
            {field("extra", "Custo adicional por unidade (R$)")}
          </>
        )}
    </View>
  );
}
