import {
  ActivityIndicator,
  View,
  useWindowDimensions,
  type StyleProp,
  type ImageStyle,
} from "react-native";
import { Image } from "expo-image";
const source = require("../../assets/images/cost3d-logo.png");
export function BrandLogo({
  width = 260,
  light = false,
  style,
}: {
  width?: number;
  light?: boolean;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      cachePolicy="memory-disk"
      contentFit="contain"
      transition={0}
      source={
        light ? require("../../assets/images/cost3d-logo-claro.png") : source
      }
      accessibilityLabel="Cost3D"
      style={[
        {
          width,
          maxWidth: "100%",
          height: width * (light ? 278 / 640 : 986 / 2400),
        },
        style,
      ]}
    />
  );
}

export function SessionLoading() {
  const mobile = useWindowDimensions().width < 900;
  if (!mobile)
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando o Cost3D"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4eee4",
        }}
      >
        <ActivityIndicator
          accessibilityLabel="Carregando o Cost3D"
          color="#86202d"
        />
      </View>
    );
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Restaurando sessão"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#f4eee4",
      }}
    >
      <BrandLogo width={260} />
      <View
        style={{
          width: 140,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#ead8d4",
          overflow: "hidden",
        }}
      >
        <View style={{ width: "60%", height: 6, backgroundColor: "#86202d" }} />
      </View>
    </View>
  );
}
