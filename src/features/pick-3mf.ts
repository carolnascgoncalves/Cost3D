import { File } from "expo-file-system";
export async function pick3mf(): Promise<FormData | null> {
  const picked = await File.pickFileAsync({});
  if (picked.canceled) return null;
  const file = picked.result;
  if (!/\.3mf$/i.test(file.name)) throw new Error("Selecione um arquivo .3mf.");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("O arquivo deve ter até 50 MB.");
  const body = new FormData();
  body.append("arquivo3mf", file, file.name);
  return body;
}
