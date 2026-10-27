import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://jatxsuzsirmmalrndhvf.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdHhzdXpzaXJtbWFscm5kaHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4Nzk4NzYsImV4cCI6MjEwNDQ1NTg3Nn0.wrV_77d7QTLnbeP2CKizV14lFZZaIo-TLRU5de8cQAg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
