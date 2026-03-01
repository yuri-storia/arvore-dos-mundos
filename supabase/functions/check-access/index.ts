import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ allowed: false, error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (error || !user?.email) {
      return new Response(JSON.stringify({ allowed: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email is in allowed list using service role (bypasses RLS)
    const { data } = await supabase
      .from("allowed_emails")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle();

    const allowed = !!data;

    // If not allowed, suspend the user instead of deleting (preserves data)
    if (!allowed) {
      await supabase.auth.admin.updateUserById(user.id, {
        ban_duration: "876000h", // ~100 years, effectively permanent but reversible
      });
    }

    return new Response(JSON.stringify({ allowed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ allowed: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
