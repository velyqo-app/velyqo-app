import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = "https://qjkqqugkruwzbzfvhpyb.supabase.co";

const supabaseAnonKey = "sb_publishable_qXYIpX3wCBFmqAXjcEAQKQ_v3Ko1FYj";

const isWeb = Platform.OS === "web";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Native has no localStorage, so without an explicit store supabase-js
    // falls back to memory and the session is lost on every app restart.
    // Web keeps the supabase-js default (localStorage) as before.
    storage: isWeb ? undefined : AsyncStorage,

    persistSession: true,

    autoRefreshToken: true,

    // Only meaningful when an auth redirect lands in a browser URL.
    detectSessionInUrl: isWeb,
  },
});
