// ══════════════════════════════════════════════════════════════
//  h100h — أسعار الجامعيين والموظفين · 2026-11-21 · إضافة
//  تُحفظ في app_settings (prices_university / prices_employee) بنفس الصيغة
//  التي تقرؤها البوابة ودالة الدفع: {"monthly":12,"quarter":25,"semi":50,"annual":100}
//  أسعار الطلاب (الصفوف 1–12) في جدول «أسعار الخطط» أعلاه (plan_prices).
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Grid, Alert, CircularProgress } from '@mui/material';
import { supabase } from '../../supabaseClient';

export const PLANS: { key: string; label: string }[] = [
  { key: 'monthly', label: 'شهري' },
  { key: 'quarter', label: 'ربع سنوي' },
  { key: 'semi', label: 'نصف سنوي' },
  { key: 'annual', label: 'سنوي' },
];
const CATS: { key: string; title: string; hint: string; color: string }[] = [
  { key: 'prices_university', title: 'الجامعيين', hint: 'الصف 13', color: '#7c3aed' },
  { key: 'prices_employee', title: 'الموظفين', hint: 'الصف 14', color: '#059669' },
];
type Vals = Record<string, string>;
const parse = (v: unknown): Record<string, number> => {
  try { const o = typeof v === 'string' ? JSON.parse(v) : v; return o && typeof o === 'object' ? (o as Record<string, number>) : {}; } catch { return {}; }
};

export const CategoryPrices = () => {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<Record<string, Record<string, number>>>({});
  const [vals, setVals] = useState<Record<string, Vals>>({});
  const [exists, setExists] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('app_settings').select('key,value').in('key', CATS.map((c) => c.key));
    if (error) setMsg({ type: 'error', text: error.message });
    const r: Record<string, Record<string, number>> = {}; const v: Record<string, Vals> = {}; const ex: Record<string, boolean> = {};
    CATS.forEach((c) => {
      const row = (data || []).find((x: any) => x.key === c.key);
      ex[c.key] = !!row; r[c.key] = parse(row?.value);
      v[c.key] = Object.fromEntries(PLANS.map((p) => [p.key, r[c.key][p.key] != null ? String(r[c.key][p.key]) : '']));
    });
    setRaw(r); setVals(v); setExists(ex); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    const v = vals[key] || {};
    const bad = PLANS.find((p) => !(Number(v[p.key]) > 0));
    if (bad) { setMsg({ type: 'error', text: `أدخل سعر «${bad.label}» بشكل صحيح` }); return; }
    // نحافظ على أي مفاتيح أخرى موجودة في القيمة
    const next = { ...raw[key], ...Object.fromEntries(PLANS.map((p) => [p.key, Number(v[p.key])])) };
    setBusy(key); setMsg(null);
    const value = JSON.stringify(next);
    const { error } = exists[key]
      ? await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
      : await supabase.from('app_settings').insert({ key, value });
    setBusy(null);
    if (error) { setMsg({ type: 'error', text: error.message }); return; }
    setMsg({ type: 'success', text: `تم حفظ أسعار ${CATS.find((c) => c.key === key)?.title} ✅ — تظهر للطلاب فوراً` });
    load();
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight={600}>أسعار الجامعيين والموظفين</Typography>
          <Button size="small" variant="outlined" onClick={load}>تحديث</Button>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          الجدول أعلاه لأسعار الطلاب (الصفوف 1–12). نوع الاشتراك يُحدَّد تلقائياً من صف الطالب، وصفحة الدفع تتحقق من نفس هذه الأسعار.
        </Typography>
        {msg && <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
        {loading ? <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box> : (
          <Grid container spacing={2}>
            {CATS.map((c) => (
              <Grid item xs={12} md={6} key={c.key}>
                <Box sx={{ border: 1, borderColor: 'divider', borderTop: `3px solid ${c.color}`, borderRadius: 2, p: 2 }}>
                  <Typography fontWeight={700} mb={1.5}>{c.title} <Typography component="span" variant="caption" color="text.secondary">({c.hint})</Typography></Typography>
                  <Grid container spacing={1.5}>
                    {PLANS.map((p) => (
                      <Grid item xs={6} key={p.key}>
                        <TextField fullWidth size="small" type="number" label={`${p.label} (ريال)`}
                          value={vals[c.key]?.[p.key] ?? ''} inputProps={{ dir: 'ltr', min: 1 }}
                          onChange={(e) => setVals((o) => ({ ...o, [c.key]: { ...o[c.key], [p.key]: e.target.value } }))} />
                      </Grid>
                    ))}
                  </Grid>
                  <Button fullWidth variant="contained" sx={{ mt: 1.5 }} disabled={busy === c.key} onClick={() => save(c.key)}>
                    {busy === c.key ? 'جارٍ الحفظ…' : `حفظ أسعار ${c.title}`}
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};
