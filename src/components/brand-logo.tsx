import { Image, type StyleProp, type ImageStyle } from "react-native";
const source = require("../../assets/images/cost3d-logo.png");
export function BrandLogo({
  width = 260,
  style,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={source}
      accessibilityLabel="Cost3D"
      resizeMode="contain"
      style={[{ width, maxWidth: "100%", height: (width * 986) / 2400 }, style]}
    />
  );
}
