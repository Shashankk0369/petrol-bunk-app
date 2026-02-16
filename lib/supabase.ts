import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://msbfetepelgnewlwppjf.supabase.co";
const supabaseAnonKey = "sb_publishable_GpAl_5LO-8OVwgOTQAg-bA_n3Yhx6W_";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);