// MFA recovery & backup codes
// Actions:
//   - generate: create 10 fresh backup codes (replaces existing). Requires authenticated user.
//   - redeem:   consume a backup code and remove the TOTP factor for recovery. Requires authenticated user.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// SHA-256 hex
async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 8-char alphanumeric (no ambiguous chars), formatted XXXX-XXXX
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    // Validate JWT and get user via anon client with user token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Invalid session' }, 401);

    const user = userData.user;
    const userAgent = req.headers.get('user-agent') || null;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const admin = createClient(supabaseUrl, serviceKey);

    if (action === 'generate') {
      // Replace any existing codes with 10 fresh ones
      await admin.from('mfa_backup_codes').delete().eq('user_id', user.id);
      const plaintext: string[] = [];
      const rows: { user_id: string; code_hash: string }[] = [];
      for (let i = 0; i < 10; i++) {
        const code = generateCode();
        plaintext.push(code);
        rows.push({ user_id: user.id, code_hash: await sha256(code) });
      }
      const { error: insErr } = await admin.from('mfa_backup_codes').insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);

      await admin.from('mfa_audit_log').insert({
        user_id: user.id,
        event_type: 'backup_codes_generated',
        user_agent: userAgent,
      });

      return json({ codes: plaintext });
    }

    if (action === 'redeem') {
      const raw = (body.code as string || '').trim().toUpperCase().replace(/\s/g, '');
      const normalized = raw.includes('-') ? raw : raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
      if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalized)) {
        return json({ error: 'invalid_format' }, 400);
      }
      const hash = await sha256(normalized);
      const { data: match } = await admin
        .from('mfa_backup_codes')
        .select('id, used_at')
        .eq('user_id', user.id)
        .eq('code_hash', hash)
        .maybeSingle();

      if (!match) {
        await admin.from('mfa_audit_log').insert({
          user_id: user.id,
          event_type: 'challenge_failed',
          user_agent: userAgent,
        });
        return json({ error: 'invalid_code' }, 400);
      }
      if (match.used_at) {
        return json({ error: 'already_used' }, 400);
      }

      // Mark code as used
      await admin
        .from('mfa_backup_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', match.id);

      // Remove all TOTP factors via SECURITY DEFINER RPC
      await admin.rpc('admin_remove_mfa_factors', { _user_id: user.id });

      await admin.from('mfa_audit_log').insert([
        { user_id: user.id, event_type: 'backup_code_used', user_agent: userAgent },
        { user_id: user.id, event_type: 'recovery_factor_removed', user_agent: userAgent },
      ]);

      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('mfa-recovery error:', e);
    return json({ error: 'internal_error' }, 500);
  }
});
