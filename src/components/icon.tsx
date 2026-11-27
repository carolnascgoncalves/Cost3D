import { Image } from "react-native";
const icons = {
  send: require("../../assets/images/catalogo/send.png"),
  copy: require("../../assets/images/catalogo/copy.png"),
  chat: require("../../assets/images/catalogo/chat.png"),

  envelope: require("../../assets/images/catalogo/envelope.png"),
  telephone: require("../../assets/images/catalogo/telephone.png"),
  "bar-chart": require("../../assets/images/catalogo/bar-chart.png"),
  person: require("../../assets/images/catalogo/person.png"),
  "file-text": require("../../assets/images/catalogo/file-text.png"),
  "arrow-switch": require("../../assets/images/catalogo/arrow-switch.png"),
  gear: require("../../assets/images/catalogo/gear.png"),
  house: require("../../assets/images/catalogo/house.png"),
  shop: require("../../assets/images/catalogo/shop.png"),
  "three-dots": require("../../assets/images/catalogo/three-dots.png"),
  collection: require("../../assets/images/catalogo/collection.png"),
  "eye-slash": require("../../assets/images/catalogo/eye-slash.png"),
  "circle-half": require("../../assets/images/catalogo/circle-half.png"),
  "chevron-right": require("../../assets/images/catalogo/chevron-right.png"),

  "clock-history": require("../../assets/images/catalogo/clock-history.png"),
  "cash-coin": require("../../assets/images/catalogo/cash-coin.png"),
  palette2: require("../../assets/images/catalogo/palette2.png"),
  "lightning-charge": require("../../assets/images/catalogo/lightning-charge.png"),
  "thermometer-half": require("../../assets/images/catalogo/thermometer-half.png"),
  calendar3: require("../../assets/images/catalogo/calendar3.png"),
  "hourglass-split": require("../../assets/images/catalogo/hourglass-split.png"),
  calculator: require("../../assets/images/catalogo/calculator.png"),
  disc: require("../../assets/images/catalogo/disc.png"),
  "info-circle": require("../../assets/images/catalogo/info-circle.png"),
  "arrow-left": require("../../assets/images/catalogo/arrow-left.png"),
  "arrow-repeat": require("../../assets/images/catalogo/arrow-repeat.png"),
  "bag-plus": require("../../assets/images/catalogo/bag-plus.png"),
  search: require("../../assets/images/catalogo/search.png"),

  printer: require("../../assets/images/catalogo/printer.png"),
  box: require("../../assets/images/catalogo/box-seam.png"),
  palette: require("../../assets/images/catalogo/palette.png"),
  eye: require("../../assets/images/catalogo/eye.png"),
  pencil: require("../../assets/images/catalogo/pencil.png"),
  warning: require("../../assets/images/catalogo/exclamation-triangle.png"),
};
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: keyof typeof icons;
  size?: number;
  color: string;
}) {
  return (
    <Image
      accessible={false}
      fadeDuration={0}
      resizeMode="contain"
      source={icons[name]}
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
export type IconName = keyof typeof icons;
