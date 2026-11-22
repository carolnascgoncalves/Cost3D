import { Linking } from "react-native";
import { apiUrl } from "@/api/session";
export function websiteUrl(path: string) {
  const base = process.env.EXPO_PUBLIC_SITE_URL || apiUrl;
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Configure um endereço HTTP ou HTTPS válido para o site.");
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Caminho de página inválido.");
  return new URL(path, url.origin).toString();
}
export async function openWebsite(path: string) {
  await Linking.openURL(websiteUrl(path));
}
