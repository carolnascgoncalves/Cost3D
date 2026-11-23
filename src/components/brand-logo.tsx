import {
  ActivityIndicator,
  View,
  useWindowDimensions,
  Image,
  type StyleProp,
  type ImageStyle,
} from "react-native";
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
      source={
        light ? require("../../assets/images/cost3d-logo-claro.png") : source
      }
      accessibilityLabel="Cost3D"
      resizeMode="contain"
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
    return <ActivityIndicator accessibilityLabel="Restaurando sessão" />;
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
