import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Image } from "expo-image";
import { useStoreIcon, useStoreName, useTheme } from "@/theme/provider";
import { useApiImage } from "@/hooks/use-api-image";
export function AccountBadge() {
  const t = useTheme(),
    name = useStoreName(),
    url = useStoreIcon();
  const imagePath = url ? url.replace(/^\/api\/v1/, "") : null;
  const photo = useApiImage(imagePath);
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
      {photo.source && !photo.failed ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={0}
          style={{ width: 44, height: 44 }}
          source={photo.source}
          onError={photo.onError}
        />
      ) : (
        <Text style={{ color: t.primaryText, fontSize: 18, fontWeight: "700" }}>
          {name.trim().slice(0, 1).toUpperCase()}
        </Text>
      )}
    </Pressable>
  );
}
