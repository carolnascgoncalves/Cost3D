import { File } from "expo-file-system";
import { checkPhoto, photoTypes } from "./calculation-photo";
export async function pickCalculationPhoto() {
  const selection = await File.pickFileAsync({ mimeTypes: photoTypes });
  if (selection.canceled) return null;
  const file = selection.result,
    type = checkPhoto(file);
  return { type, base64: await file.base64() };
}
