import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { Body, Button, Card, ValueRow } from "@/components/ui";
import type { components } from "@/api/schema";
import { useTheme } from "@/theme/provider";
import { decimal } from "./format";
export type PieceFile = components["schemas"]["PecaModeloImportacaoRequest"];
export function importedFields(file: PieceFile) {
  const d = file.dados;
  const values: Record<string, string> = {};
  if (d?.nome) values.nome = d.nome;
  if (d?.estatisticasCompletas) {
    if (d.pesoTotalGramas != null)
      values.quantidadeFilamentoGramas = String(d.pesoTotalGramas).replace(
        ".",
        ",",
      );
    if (d.tempoTotalSegundos != null)
      values.tempoImpressaoMinutos = String(
        Math.ceil(d.tempoTotalSegundos / 60),
      );
  }
  return values;
}
export function PieceImport({
  file,
  choose,
  busy,
  reapply,
}: {
  file?: PieceFile;
  choose: () => void;
  busy: boolean;
  reapply: () => void;
}) {
  const [details, setDetails] = useState(false),
    [index, setIndex] = useState(0);
  const t = useTheme(),
    d = file?.dados,
    plates = d?.placas ?? [],
    plate = plates[index];
  const materials = d?.filamentosUsados ?? [];
  const profile = (v?: string) =>
    v
      ?.split(",")
      .map((x) => x.trim())
      .filter(Boolean) ?? [];
  const types = profile(d?.material),
    palette = profile(d?.corMaterial);
  const names = materials.length
    ? materials.map(
        (m) => m.material || types[(m.id ?? 1) - 1] || "Desconhecido",
      )
    : types;
  const counts = new Map<string, number>();
  for (const name of names) {
    const key = name.trim().toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const colors = [
    ...new Set(
      (materials.length
        ? materials.map((m) => m.cor || palette[(m.id ?? 1) - 1] || "")
        : palette
      )
        .map((c) => c.trim().replace(/^#?/, "#").toUpperCase())
        .filter((c) => /^#[0-9A-F]{6}([0-9A-F]{2})?$/.test(c)),
    ),
  ];
  const pieces =
    plates.length &&
    plates.length === d?.numeroPlacas &&
    plates.every((p) => p.quantidadePecas != null)
      ? plates.reduce((n, p) => n + p.quantidadePecas!, 0)
      : null;
  if (!file)
    return (
      <Card>
        <Body strong>Importar do arquivo 3D</Body>
        <Body muted>Opcional. Revise os valores preenchidos pelo arquivo.</Body>
        <Button
          label="Escolher arquivo .3mf"
          variant="secondary"
          disabled={busy}
          onPress={choose}
        />
        <Body muted>
          Até 50 MB. Aceita projeto .3mf ou arquivo fatiado .gcode.3mf.
        </Body>
      </Card>
    );
  return (
    <>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Body strong>✓ Arquivo lido</Body>
            <Body muted>{file.nomeArquivo}</Body>
          </View>
          <Button
            label="Trocar"
            variant="secondary"
            disabled={busy}
            onPress={choose}
          />
        </View>
      </Card>
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver dados do arquivo"
          onPress={() => setDetails(true)}
          style={{ alignItems: "center", gap: 5 }}
        >
          {plate?.imagemPreviewDataUri && (
            <Image
              source={{ uri: plate.imagemPreviewDataUri }}
              style={{ width: "100%", height: 100 }}
              resizeMode="contain"
            />
          )}
          {plate && (
            <Body strong>
              Placa {plate.numero} de {d?.numeroPlacas}
            </Body>
          )}
          {plate && (
            <Body muted>
              {[
                plate.tempoSegundos != null
                  ? Math.ceil(plate.tempoSegundos / 60) + " min"
                  : null,
                plate.pesoGramas != null
                  ? decimal(String(plate.pesoGramas), 2) + " g"
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Body>
          )}
          <Body>Dados do arquivo ›</Body>
        </Pressable>
        {plates.length > 1 && (
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Button
              label="Anterior"
              variant="ghost"
              disabled={!index}
              onPress={() => setIndex(index - 1)}
            />
            <Button
              label="Próxima"
              variant="ghost"
              disabled={index >= plates.length - 1}
              onPress={() => setIndex(index + 1)}
            />
          </View>
        )}
      </Card>
      <Modal
        visible={details}
        transparent
        animationType="slide"
        onRequestClose={() => setDetails(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#24183580",
          }}
        >
          <Pressable
            accessibilityLabel="Fechar"
            onPress={() => setDetails(false)}
            style={{ flex: 1 }}
          />
          <ScrollView
            style={{
              flexGrow: 0,
              maxHeight: "80%",
              backgroundColor: t.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
            contentContainerStyle={{ padding: 20, gap: 12 }}
          >
            <Body strong>Dados do arquivo</Body>
            {Object.entries({
              "Impressora do perfil": d?.modeloImpressora,
              Material: [...counts]
                .map(
                  ([name, count]) =>
                    name +
                    " (" +
                    count +
                    (count === 1 ? " material)" : " materiais)"),
                )
                .join(", "),
              "Altura da camada": d?.alturaCamada,
              "Diâmetro do bico": d?.diametroBico,
              Placas: String(d?.numeroPlacas ?? plates.length),
              "Quantidade de peças":
                pieces == null ? "Não informada" : String(pieces),
            }).map(([label, v]) =>
              v ? <ValueRow key={label} label={label} value={v} /> : null,
            )}
            {!!colors.length && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Body muted>Cores de filamento</Body>
                <View
                  style={{
                    flexShrink: 1,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {colors.map((c) => (
                    <View
                      accessible
                      accessibilityLabel={c}
                      key={c}
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 11,
                        borderColor: t.border,
                        borderWidth: 1,
                        backgroundColor: c,
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
            <Body muted>
              {d?.estatisticasCompletas
                ? "Tempo e consumo somam todas as placas. Ajuste se o arquivo representar mais de uma unidade."
                : "O arquivo não contém estatísticas completas. Informe o tempo e o consumo nos campos da peça."}
            </Body>
            {d?.estatisticasCompletas && (
              <Button
                label="Aplicar tempo e filamento novamente"
                variant="secondary"
                onPress={() => {
                  reapply();
                  setDetails(false);
                }}
              />
            )}
            <Button
              label="Fechar"
              variant="ghost"
              onPress={() => setDetails(false)}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
