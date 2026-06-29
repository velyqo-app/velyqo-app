import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qjkqqugkruwzbzfvhpyb.supabase.co";

const supabaseAnonKey = "sb_publishable_qXYIpX3wCBFmqAXjcEAQKQ_v3Ko1FYj";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
