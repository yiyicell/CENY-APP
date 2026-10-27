import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "@/constants/supabase";
import type { Session } from "@supabase/supabase-js";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setCargando(false);
      })
      .catch(() => {
        setCargando(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (cargando) return;

    SplashScreen.hideAsync().catch(() => {});

    const enGrupoTabs = segments[0] === "(tabs)";

    if (session && !enGrupoTabs) {
      router.replace("/(tabs)/home" as any);
    } else if (!session && enGrupoTabs) {
      router.replace("/");
    }
  }, [session, cargando, segments]);

  if (cargando) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
