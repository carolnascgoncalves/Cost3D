import { useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { Body, Button, Chip, Notice } from "@/components/ui";
import type { components } from "@/api/schema";

type Coordinates = { latitude: number; longitude: number };
async function coordinates(): Promise<Coordinates> {
  if (Platform.OS === "web") {
    if (!navigator.geolocation)
      throw new Error("A localização está indisponível neste navegador.");
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        () =>
          reject(
            new Error(
              "Permita a localização no navegador ou escolha a distribuidora da sua conta.",
            ),
          ),
        { timeout: 15000, maximumAge: 300000 },
      ),
    );
  }
  const location = requireOptionalNativeModule<{
    requestForegroundPermissionsAsync(): Promise<{ status: string }>;
    getCurrentPositionAsync(options: {
      accuracy: number;
    }): Promise<{ coords: Coordinates }>;
  }>("ExpoLocation");
  if (!location)
    throw new Error(
      "A localização está indisponível nesta instalação. Você pode escolher a distribuidora da sua conta.",
    );
  if ((await location.requestForegroundPermissionsAsync()).status !== "granted")
    throw new Error(
      "Permita a localização ou escolha a distribuidora da sua conta.",
    );
  return (await location.getCurrentPositionAsync({ accuracy: 3 })).coords;
}
export function EnergyReference({ apply }: { apply: (value: string) => void }) {
  const [open, setOpen] = useState(false),
    [selected, select] = useState(""),
    [city, setCity] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = useApiQuery<
    components["schemas"]["TarifaEnergiaReferenciaResponse"][]
  >(open ? "/configuracao/tarifas" : null);
  const tariff = q.data?.find((t) => t.distribuidora === selected);
  const date = (d?: string) => d?.split("-").reverse().join("/");
  async function locate() {
    setBusy(true);
    setError("");
    try {
      const { latitude, longitude } = await coordinates();
      const result = await request<{ cidade: string; uf: string }>(
        "/configuracao/cidade",
        { method: "POST", body: JSON.stringify({ latitude, longitude }) },
      );
      setCity([result.cidade, result.uf].filter(Boolean).join(" / "));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível sugerir a cidade.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Button
        variant="secondary"
        label={
          open ? "Recolher referência da ANEEL" : "Buscar referência da ANEEL"
        }
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Body muted>
            Para distribuidoras de São Paulo. Confira o nome na conta de luz. A
            referência pode excluir impostos e bandeiras.
          </Body>
          <Button
            variant="ghost"
            busy={busy}
            disabled={busy}
            label="Sugerir minha cidade"
            onPress={() => void locate()}
          />
          <Body muted>
            {city ||
              "A localização só é consultada com sua permissão e não é salva."}
          </Body>
          {!!error && <Notice message={error} />}
          {q.loading ? (
            <ActivityIndicator />
          ) : q.error ? (
            <Notice message={q.error} onRetry={q.retry} />
          ) : (
            <>
              <Body strong>Distribuidora</Body>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {q.data?.map(
                  (t) =>
                    t.distribuidora && (
                      <Chip
                        key={t.distribuidora}
                        label={t.distribuidora}
                        selected={selected === t.distribuidora}
                        onPress={() => select(t.distribuidora!)}
                      />
                    ),
                )}
              </View>
              {!q.data?.length && (
                <Body muted>Nenhuma referência disponível.</Body>
              )}
              {tariff?.valorKwh != null && (
                <>
                  <Body>
                    R$ {tariff.valorKwh.toFixed(4).replace(".", ",")}/kWh
                  </Body>
                  {tariff.inicioVigencia && (
                    <Body muted>
                      Desde {date(tariff.inicioVigencia)}
                      {tariff.fimVigencia
                        ? " até " + date(tariff.fimVigencia)
                        : ""}
                    </Body>
                  )}
                  <Button
                    variant="secondary"
                    label="Usar esta tarifa"
                    onPress={() => {
                      apply(tariff.valorKwh!.toFixed(2).replace(".", ","));
                      setOpen(false);
                    }}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
