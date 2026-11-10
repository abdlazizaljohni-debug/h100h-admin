import { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import { supabase } from './supabaseClient';

export const CustomLoginPage = () => {
  const [step, setStep]         = useState<'credentials' | 'totp'>('credentials');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  /* ── الخطوة الأولى: بريد + كلمة مرور ── */
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authErr) throw authErr;

      if (!data.session) {
        // MFA مطلوب — ابحث عن عامل TOTP
        const { data: factors, error: fe } = await supabase.auth.mfa.listFactors();
        if (fe) throw fe;

        const totp = factors?.totp?.[0];
        if (totp) {
          setFactorId(totp.id);
          setStep('totp');
          return;
        }
        throw new Error('لم يتم التعرف على المستخدم');
      }

      // لا يوجد MFA — تحقق من دور Admin
      const { data: roleRow } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (!roleRow) {
        await supabase.auth.signOut();
        throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
      }

      // نجح الدخول
      window.location.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  /* ── الخطوة الثانية: رمز TOTP ── */
  const handleTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId });
      if (ce) throw ce;

      const { data, error: ve } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (ve) throw ve;

      // تحقق من دور Admin
      const { data: roleRow } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (!roleRow) {
        await supabase.auth.signOut();
        throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
      }

      window.location.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'رمز غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      dir="rtl"
    >
      <Card sx={{ width: 380, p: 1, boxShadow: 6, borderRadius: 3 }}>
        <CardContent>

          {/* رأس الصفحة */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                bgcolor: 'primary.main', display: 'flex',
                alignItems: 'center', justifyContent: 'center', mb: 1,
              }}
            >
              {step === 'credentials'
                ? <LockOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
                : <SecurityIcon sx={{ color: 'white', fontSize: 28 }} />
              }
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {step === 'credentials' ? 'لوحة التحكم' : 'التصديق الثنائي'}
            </Typography>
            {step === 'totp' && (
              <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
                أدخل الرمز من تطبيق Google Authenticator
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* ── خطوة كلمة المرور ── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                required
                autoFocus
                inputProps={{ dir: 'ltr' }}
              />
              <TextField
                fullWidth
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                required
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                size="large"
                sx={{ borderRadius: 2, py: 1.2 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'دخول'}
              </Button>
            </form>
          )}

          {/* ── خطوة TOTP ── */}
          {step === 'totp' && (
            <form onSubmit={handleTOTP}>
              <TextField
                fullWidth
                label="رمز التصديق"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                sx={{ mb: 3 }}
                required
                autoFocus
                placeholder="000000"
                inputProps={{
                  dir: 'ltr',
                  maxLength: 6,
                  style: {
                    textAlign: 'center',
                    letterSpacing: '0.6em',
                    fontSize: '1.8rem',
                    fontWeight: 700,
                  },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading || totpCode.length !== 6}
                size="large"
                sx={{ borderRadius: 2, py: 1.2, mb: 1 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'تحقق'}
              </Button>
              <Button
                fullWidth
                size="small"
                onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
              >
                ← رجوع
              </Button>
            </form>
          )}

        </CardContent>
      </Card>
    </Box>
  );
};
