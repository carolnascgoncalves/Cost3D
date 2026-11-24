import { router } from "expo-router";
import { Pressable, Image, Text } from "react-native";
import { useStoreIcon, useStoreName, useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import type { components } from "@/api/schema";
export function AccountBadge() {
  const t = useTheme(),
    name = useStoreName(),
    url = useStoreIcon();
  const photo = useApiQuery<components["schemas"]["FotoCatalogo"]>(
    url
      ? "/tenant/icone" + (url.includes("?") ? "?" + url.split("?")[1] : "")
      : null,
  );
  return (
    <Pressable
      accessibilityLabel="Abrir minha conta"
      accessibilityRole="button"
      onPress={() => router.push("/account")}
      style={{
        width: 44,
        height: 44,
        borderWidth: 1,
        borderColor: t.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.accentTint,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {photo.data?.base64 ? (
        <Image
          style={{ width: 44, height: 44 }}
          source={{
            uri: "data:" + photo.data.tipo + ";base64," + photo.data.base64,
          }}
        />
      ) : (
        <Text style={{ color: t.primaryText, fontSize: 18, fontWeight: "700" }}>
          {name.trim().slice(0, 1).toUpperCase()}
        </Text>
      )}
    </Pressable>
  );
}
