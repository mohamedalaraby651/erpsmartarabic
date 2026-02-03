import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base32 alphabet for TOTP
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Decode Base32 to bytes
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: number[] = [];
  
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits.push(...[...Array(5)].map((_, i) => (val >> (4 - i)) & 1));
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = bits.slice(i * 8, (i + 1) * 8).reduce((acc, bit, idx) => acc | (bit << (7 - idx)), 0);
  }
  
  return bytes;
}

// Generate random Base32 secret
function generateSecret(length = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  let result = '';
  for (let i = 0; i < bytes.length; i += 5) {
    const chunk = bytes.slice(i, i + 5);
    const bits = Array.from(chunk).reduce((acc, byte, idx) => acc + byte.toString(2).padStart(8, '0'), '');
    for (let j = 0; j < Math.floor(bits.length / 5); j++) {
      const charBits = bits.slice(j * 5, (j + 1) * 5);
      result += BASE32_ALPHABET[parseInt(charBits, 2)];
    }
  }
  
  return result.slice(0, 32);
}

// HMAC-SHA1 implementation using Web Crypto API
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

// Generate TOTP code
async function generateTOTP(secret: string, counter: number): Promise<string> {
  const secretBytes = base32Decode(secret);
  
  // Convert counter to 8-byte big-endian
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  
  const hmac = await hmacSha1(secretBytes, counterBytes);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Verify TOTP with time window tolerance
async function verifyTOTP(secret: string, token: string, windowSize = 1): Promise<boolean> {
  const counter = Math.floor(Date.now() / 30000);
  
  for (let i = -windowSize; i <= windowSize; i++) {
    const expected = await generateTOTP(secret, counter + i);
    if (expected === token) {
      return true;
    }
  }
  
  return false;
}

// Generate backup codes
function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    codes.push(code.slice(0, 8));
  }
  return codes;
}

interface VerifyRequest {
  action: 'setup' | 'verify' | 'enable' | 'disable';
  totp_code?: string;
  backup_code?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Parse request body
    const body: VerifyRequest = await req.json();
    const { action, totp_code, backup_code } = body;

    console.log(`[verify-totp] User ${userId} action: ${action}`);

    if (action === 'setup') {
      // Generate new secret and backup codes
      const secret = generateSecret();
      const backupCodes = generateBackupCodes();

      // Store pending setup (not enabled yet)
      const { error } = await supabase
        .from('user_2fa_settings')
        .upsert({
          user_id: userId,
          secret_key: secret,
          backup_codes: backupCodes,
          is_enabled: false
        });

      if (error) {
        console.error('[verify-totp] Setup error:', error);
        throw error;
      }

      // Generate otpauth URL for QR code
      const issuer = encodeURIComponent('ERP Smart Arabic');
      const account = encodeURIComponent(userEmail || userId);
      const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      return new Response(
        JSON.stringify({
          success: true,
          secret,
          otpauth_url: otpauthUrl,
          backup_codes: backupCodes,
          message: 'امسح رمز QR باستخدام تطبيق المصادقة'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'enable') {
      // Verify code and enable 2FA
      if (!totp_code) {
        return new Response(
          JSON.stringify({ success: false, error: 'يجب إدخال رمز التحقق', code: 'MISSING_CODE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current settings
      const { data: settings } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!settings?.secret_key) {
        return new Response(
          JSON.stringify({ success: false, error: 'يجب إعداد 2FA أولاً', code: 'NOT_SETUP' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the code
      const isValid = await verifyTOTP(settings.secret_key, totp_code);
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'رمز التحقق غير صحيح', code: 'INVALID_CODE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Enable 2FA
      const { error } = await supabase
        .from('user_2fa_settings')
        .update({
          is_enabled: true,
          enabled_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      console.log(`[verify-totp] 2FA enabled for user ${userId}`);

      return new Response(
        JSON.stringify({ success: true, message: 'تم تفعيل المصادقة الثنائية بنجاح' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Get user settings
      const { data: settings } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!settings?.is_enabled) {
        return new Response(
          JSON.stringify({ success: true, verified: true, message: '2FA not enabled' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try TOTP code first
      if (totp_code) {
        const isValid = await verifyTOTP(settings.secret_key, totp_code);
        if (isValid) {
          await supabase
            .from('user_2fa_settings')
            .update({ last_used_at: new Date().toISOString() })
            .eq('user_id', userId);

          return new Response(
            JSON.stringify({ success: true, verified: true, message: 'تم التحقق بنجاح' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Try backup code
      if (backup_code) {
        const codes = settings.backup_codes || [];
        const index = codes.indexOf(backup_code.toUpperCase());
        if (index !== -1) {
          // Remove used backup code
          codes.splice(index, 1);
          await supabase
            .from('user_2fa_settings')
            .update({ 
              backup_codes: codes,
              last_used_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              verified: true, 
              message: 'تم التحقق بنجاح',
              remaining_backup_codes: codes.length
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, verified: false, error: 'رمز التحقق غير صحيح', code: 'INVALID_CODE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disable') {
      // Verify code first
      if (!totp_code) {
        return new Response(
          JSON.stringify({ success: false, error: 'يجب إدخال رمز التحقق لإلغاء 2FA', code: 'MISSING_CODE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: settings } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!settings?.secret_key) {
        return new Response(
          JSON.stringify({ success: true, message: '2FA is not enabled' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyTOTP(settings.secret_key, totp_code);
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'رمز التحقق غير صحيح', code: 'INVALID_CODE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete 2FA settings
      await supabase
        .from('user_2fa_settings')
        .delete()
        .eq('user_id', userId);

      console.log(`[verify-totp] 2FA disabled for user ${userId}`);

      return new Response(
        JSON.stringify({ success: true, message: 'تم إلغاء المصادقة الثنائية' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action', code: 'INVALID_ACTION' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-totp] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
