export const photoTypes = ["image/jpeg", "image/png", "image/webp"];
export function checkPhoto(file: { size: number; type: string; name: string }) {
  if (file.size > 3 * 1024 * 1024)
    throw new Error("A foto deve ter no máximo 3 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const type = photoTypes.includes(file.type)
    ? file.type
    : extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : "image/" + extension;
  if (!photoTypes.includes(type))
    throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
  return type;
}
