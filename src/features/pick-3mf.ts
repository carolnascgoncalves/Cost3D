import { File } from "expo-file-system";
export async function pick3mf(): Promise<FormData | null> {
  const picked = await File.pickFileAsync({});
  if (picked.canceled) return null;
  const file = picked.result;
  if (!/\.3mf$/i.test(file.name)) throw new Error("Selecione um arquivo .3mf.");
  const body = new FormData();
  body.append("arquivo3mf", {
    uri: file.uri,
    name: file.name,
    type: "application/octet-stream",
  } as unknown as Blob);
  return body;
}
