import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import { supabase } from './supabaseClient';
import { loadAccess, loginEmail, resetAccess } from './access';

// 2026-11-19: الدخول بخطوتين — كلمة المرور ثم رمز Google Authenticator
// 2026-11-20: · الموظف يدخل برقم جواله بدل البريد
//             · التحقق الثنائي إجباري للجميع — من لم يربط التطبيق يربطه هنا أول مرة (رمز QR)
type Step = 'credentials' | 'totp' | 'enroll';

export const CustomLoginPage = () => {
  const [step, setStep]         = useState<Step>('credentials');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr]             = useState('');
  const [secret, setSecret]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  /* بعد كلمة المرور (أو جلسة قائمة بلا رمز): هل له صلاحية؟ ثم رمز أو ربط */
  const afterPassword = async (auto = false) => {
    const a = await loadAccess(true);
    if (!a.isAdmin && !a.staff) {
      await supabase.auth.signOut(); resetAccess();
      throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') { if (!auto) window.location.replace('/'); return; }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === 'verified');
    if (totp) { setFactorId(totp.id); setStep('totp'); return; }

    // لم يربط تطبيق المصادقة بعد → ربط أول مرة
    for (const f of (factors?.all || [])) {
      if (f.factor_type === 'totp' && f.status !== 'verified') { try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch { /* */ } }
    }
    const { data: en, error: ee } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'h100h-' + Date.now() });
    if (ee || !en) throw ee || new Error('تعذّر بدء ربط التطبيق');
    setFactorId(en.id); setQr(en.totp.qr_code); setSecret(en.totp.secret);
    setStep('enroll');
  };

  /* جلسة قائمة بلا رمز (مثلاً بعد تحديث الصفحة) → مباشرة لخطوة الرمز */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) afterPassword(true).catch(() => { /* تبقى خطوة كلمة المرور */ });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── الخطوة الأولى: بريد/جوال + كلمة مرور ── */
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: loginEmail(email),
        password,
      });
      if (authErr) throw new Error(/invalid/i.test(authErr.message) ? 'بيانات الدخول غير صحيحة' : authErr.message);
      if (!data.user) throw new Error('لم يتم التعرف على المستخدم');
      await afterPassword();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  /* ── الرمز (للدخول أو لتأكيد الربط) ── */
  const handleTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId });
      if (ce) throw ce;
      const { error: ve } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: totpCode });
      if (ve) throw new Error('الرمز غير صحيح — تأكد من الوقت في جوالك وحاول مرة أخرى');
      const a = await loadAccess(true);
      if (!a.isAdmin && !a.staff) {
        await supabase.auth.signOut(); resetAccess();
        throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
      }
      window.location.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'رمز غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = async () => {
    await supabase.auth.signOut(); resetAccess();
    setStep('credentials'); setTotpCode(''); setError(''); setQr(''); setSecret('');
  };

  const codeField = (
    <TextField
      fullWidth label="رمز التصديق"
      value={totpCode}
      onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      sx={{ mb: 3 }} required autoFocus placeholder="000000"
      inputProps={{
        dir: 'ltr', maxLength: 6, inputMode: 'numeric', autoComplete: 'one-time-code',
        style: { textAlign: 'center', letterSpacing: '0.6em', fontSize: '1.8rem', fontWeight: 700 },
      }}
    />
  );

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default" dir="rtl" px={2}>
      <Card sx={{ width: 400, maxWidth: '100%', p: 1, boxShadow: 6, borderRadius: 3 }}>
        <CardContent>

          {/* رأس الصفحة */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              {step === 'credentials'
                ? <LockOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
                : <SecurityIcon sx={{ color: 'white', fontSize: 28 }} />}
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {step === 'credentials' ? 'لوحة التحكم' : step === 'totp' ? 'التصديق الثنائي' : 'ربط تطبيق المصادقة'}
            </Typography>
            {step === 'totp' && (
              <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
                أدخل الرمز من تطبيق Google Authenticator
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {/* ── خطوة كلمة المرور ── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials}>
              <TextField
                fullWidth label="البريد الإلكتروني أو رقم الجوال" type="text"
                value={email} onChange={e => setEmail(e.target.value)}
                sx={{ mb: 2 }} required autoFocus autoComplete="username" inputProps={{ dir: 'ltr' }}
                helperText="فريق العمل: رقم الجوال (05xxxxxxxx)"
              />
              <TextField
                fullWidth label="كلمة المرور" type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                sx={{ mb: 3 }} required
              />
              <Button fullWidth variant="contained" type="submit" disabled={loading} size="large" sx={{ borderRadius: 2, py: 1.2 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'دخول'}
              </Button>
            </form>
          )}

          {/* ── ربط أول مرة ── */}
          {step === 'enroll' && (
            <form onSubmit={handleTOTP}>
              <Alert severity="info" sx={{ mb: 2 }}>
                التحقق الثنائي إجباري. افتح تطبيق <b>Google Authenticator</b> (أو Microsoft Authenticator) في جوالك،
                اضغط <b>+</b> ثم <b>مسح رمز QR</b>، وأدخل الرمز المكوّن من 6 أرقام.
              </Alert>
              {qr && (
                <Box display="flex" justifyContent="center" mb={1.5}>
                  <Box component="img" src={qr} alt="رمز QR لربط تطبيق المصادقة" sx={{ width: 190, height: 190, bgcolor: '#fff', p: 1, borderRadius: 2 }} />
                </Box>
              )}
              {secret && (
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mb={2} sx={{ wordBreak: 'break-all' }}>
                  أو أدخل المفتاح يدوياً: <b dir="ltr" style={{ fontFamily: 'monospace' }}>{secret}</b>
                </Typography>
              )}
              {codeField}
              <Button fullWidth variant="contained" type="submit" disabled={loading || totpCode.length !== 6} size="large" sx={{ borderRadius: 2, py: 1.2, mb: 1 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'تأكيد الربط والدخول'}
              </Button>
              <Button fullWidth size="small" onClick={backToCredentials}>← رجوع</Button>
            </form>
          )}

          {/* ── خطوة الرمز ── */}
          {step === 'totp' && (
            <form onSubmit={handleTOTP}>
              {codeField}
              <Button fullWidth variant="contained" type="submit" disabled={loading || totpCode.length !== 6} size="large" sx={{ borderRadius: 2, py: 1.2, mb: 1 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'تحقق'}
              </Button>
              <Button fullWidth size="small" onClick={backToCredentials}>← رجوع</Button>
            </form>
          )}

        </CardContent>
      </Card>
    </Box>
  );
};
