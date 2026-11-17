import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useAuth } from "@/auth/provider";
export default function Index() {
  const { account, loading } = useAuth();
  return loading ? (
    <ActivityIndicator accessibilityLabel="Restaurando sessão" />
  ) : (
    <Redirect href={account ? "/home" : "/login"} />
  );
}
