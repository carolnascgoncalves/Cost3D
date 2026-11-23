import { checkPhoto, photoTypes } from "./calculation-photo";
export function pickCalculationPhoto(): Promise<{
  type: string;
  base64: string;
} | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = photoTypes.join(",");
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const type = checkPhoto(file);
        const reader = new FileReader();
        reader.onerror = () =>
          reject(new Error("Não foi possível ler a foto."));
        reader.onload = () =>
          resolve({ type, base64: String(reader.result).split(",")[1] });
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
