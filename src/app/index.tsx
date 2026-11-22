import { SessionLoading } from "@/components/brand-logo";
import { Redirect } from "expo-router";
import { useAuth } from "@/auth/provider";
export default function Index() {
  const { account, loading } = useAuth();
  return loading ? (
    <SessionLoading />
  ) : (
    <Redirect href={account ? "/home" : "/login"} />
  );
}
