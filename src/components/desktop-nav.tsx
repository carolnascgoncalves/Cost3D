import {
  router,
  type Href,
  usePathname,
  useGlobalSearchParams,
} from "expo-router";
import { AccountBadge } from "./account-badge";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BrandLogo } from "@/components/brand-logo";
import { openWebsite } from "@/features/website";
import { useTheme } from "@/theme/provider";

import { groups, type Link } from "@/features/menu-groups";
export function DesktopNav({
  store,
  onError,
}: {
  store: boolean;
  onError: () => void;
}) {
  const t = useTheme(),
    path = usePathname();
  const { categoria } = useGlobalSearchParams();
  const sections: [string, Link[]][] = store
    ? groups
    : [
        [
          "Conta",
          [
            { label: "Início", route: "/home" },
            { label: "Minha conta", route: "/account" },
          ],
        ],
      ];
  return (
    <ScrollView
      style={{ width: 240, flexGrow: 0, backgroundColor: t.primary }}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingVertical: 20,
        gap: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <AccountBadge />
        <BrandLogo
          width={140}
          style={{ tintColor: t.onPrimary, marginLeft: 12, marginBottom: 10 }}
        />
      </View>
      {sections.map(([group, links]) => (
        <NavSection key={group} title={group}>
          {links.map((link) => {
            const selected =
              "route" in link &&
              (path === link.route ||
                (link.route === "/customers" &&
                  path.startsWith("/customers/"))) &&
              (!link.category || link.category === (categoria ?? "pecas"));
            return (
              <Pressable
                key={link.label}
                accessibilityRole="link"
                accessibilityState={{ selected }}
                accessibilityHint={"site" in link ? "Abre no site" : undefined}
                onPress={() => {
                  if ("site" in link)
                    void openWebsite(link.site).catch(onError);
                  else if (link.category)
                    router.navigate({
                      pathname: "/catalog",
                      params: { categoria: link.category },
                    });
                  else router.navigate(link.route);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: selected ? t.accent : "transparent",
                }}
              >
                <Text
                  style={{
                    color: selected ? t.onAccent : t.onPrimary,
                    fontWeight: selected ? "700" : "400",
                    fontSize: 14,
                  }}
                >
                  {link.label}
                </Text>
              </Pressable>
            );
          })}
        </NavSection>
      ))}
    </ScrollView>
  );
}
function NavSection({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  const t = useTheme();
  return (
    <>
      <Text
        style={{
          color: t.onPrimary,
          fontSize: 11,
          fontWeight: "600",
          paddingTop: 14,
          paddingLeft: 12,
          paddingBottom: 4,
        }}
      >
        {title}
      </Text>
      {children}
    </>
  );
}
