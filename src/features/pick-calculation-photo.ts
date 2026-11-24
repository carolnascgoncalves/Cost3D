import { requireOptionalNativeModule } from "expo";

type Gallery = {
  launchImageLibraryAsync(options: {
    mediaTypes: string[];
    quality: number;
    base64: boolean;
    allowsMultipleSelection: boolean;
  }): Promise<{
    canceled: boolean;
    assets?: { base64?: string | null }[];
  }>;
};

export async function pickCalculationPhoto() {
  const gallery =
    requireOptionalNativeModule<Gallery>("ExponentImagePicker") ??
    requireOptionalNativeModule<Gallery>("ExpoImagePicker");
  if (!gallery)
    throw new Error("A galeria não está disponível nesta instalação do app.");
  const result = await gallery.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    base64: true,
    allowsMultipleSelection: false,
  });
  if (result.canceled) return null;
  const base64 = result.assets?.[0]?.base64;
  if (!base64) throw new Error("Não foi possível ler a imagem escolhida.");
  if (base64.length > 4 * 1024 * 1024)
    throw new Error("A foto deve ter no máximo 3 MB.");
  const type = base64.startsWith("/9j/")
    ? "image/jpeg"
    : base64.startsWith("iVBORw0KGgo")
      ? "image/png"
      : base64.startsWith("UklGR")
        ? "image/webp"
        : null;
  if (!type) throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
  return { type, base64 };
}
