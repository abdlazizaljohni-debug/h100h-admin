// ══════════════════════════════════════════════════════════════
//  h100h — تبويبات لوحة التحكم: تقني · أمني · تطويري  (2026-11-19 · إضافة)
//  قراءة فقط — لا تعدّل أي بيانات.
//  تعتمد على الدالة admin_insights() (ملف 09-admin-insights.sql)،
//  وإن لم تكن موجودة تعمل الفحوص الأخرى وتظهر ملاحظة.
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton, Alert, LinearProgress, Tooltip as MuiTooltip, Checkbox,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { createClient } from '@supabase/supabase-js';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { supabase } from '../supabaseClient';

/* ── إعدادات عامة ── */
const ENV = ((import.meta as any).env || {}) as Record<string, string>;
const SB_URL = String(ENV.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SB_ANON = String(ENV.VITE_SUPABASE_ANON_KEY || '');
const SITE = 'https://h100h.com';

// الجداول الحساسة: يجب ألا يقرأها الزائر المجهول
const SENSITIVE = ['students', 'pending_subs', 'pending_pw', 'coupons', 'app_settings', 'payments',
  'admin_roles', 'subscription_keys', 'auth_fails', 'admin_totp', 'chat_messages', 'audit_log'];
const TABLE_AR: Record<string, string> = {
  students: 'الطلاب', pending_subs: 'الاشتراكات المعلقة', pending_pw: 'كلمات مرور الاشتراك',
  coupons: 'الكوبونات', app_settings: 'الإعدادات', payments: 'المدفوعات', admin_roles: 'المدراء',
  subscription_keys: 'مفاتيح الاشتراك', auth_fails: 'محاولات الدخول', admin_totp: 'رموز التحقق',
  chat_messages: 'الرسائل', audit_log: 'سجل المراجعة', exam_results: 'نتائج الاختبارات',
  questions: 'الأسئلة', site_visits: 'زيارات الموقع', notifications: 'الإشعارات',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-SA');
const bytes = (b: number) => {
  if (!b) return '0';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let x = b;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toLocaleString('ar-SA', { maximumFractionDigits: 1 })} ${u[i]}`;
};
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const maskMob = (m: string) => (m && m.length >= 10 ? `${m.slice(0, 3)}****${m.slice(-3)}` : m || '—');
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

type Status = 'ok' | 'warn' | 'bad' | 'unknown';
const STATUS_UI: Record<Status, { color: string; icon: React.ReactNode; label: string }> = {
  ok: { color: '#059669', icon: <CheckCircleIcon fontSize="small" />, label: 'سليم' },
  warn: { color: '#d97706', icon: <WarningAmberIcon fontSize="small" />, label: 'تنبيه' },
  bad: { color: '#dc2626', icon: <ErrorIcon fontSize="small" />, label: 'خطر' },
  unknown: { color: '#64748b', icon: <HelpOutlineIcon fontSize="small" />, label: 'غير معروف' },
};
const StatusChip = ({ s, label }: { s: Status; label?: string }) => (
  <Chip size="small" icon={STATUS_UI[s].icon as any} label={label || STATUS_UI[s].label}
    sx={{ bgcolor: `${STATUS_UI[s].color}1A`, color: STATUS_UI[s].color, fontWeight: 700, '& .MuiChip-icon': { color: 'inherit' } }} />
);

const Panel = ({ title, children, action, sub }: { title: string; children: React.ReactNode; action?: React.ReactNode; sub?: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5} gap={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
        {action}
      </Box>
      {children}
    </CardContent>
  </Card>
);

const Stat = ({ title, value, sub, color = '#1a56db', loading }: { title: string; value: string; sub?: string; color?: string; loading?: boolean }) => (
  <Card sx={{ height: '100%', borderTop: `3px solid ${color}` }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      {loading ? <Skeleton width={90} height={38} /> :
        <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>}
      {sub && !loading && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

const Header = ({ title, sub, onRefresh, loading }: { title: string; sub: string; onRefresh: () => void; loading: boolean }) => (
  <Box mb={2} display="flex" alignItems="center" gap={1} flexWrap="wrap">
    <Box>
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{sub}</Typography>
    </Box>
    <Box flex={1} />
    <Button size="small" startIcon={<RefreshIcon />} onClick={onRefresh} disabled={loading}>إعادة الفحص</Button>
  </Box>
);

/* ── مصادر مشتركة ── */
type Insights = {
  tables?: { name: string; rls: boolean; anon_grant: boolean; anon_policy: boolean; anon_write: boolean; rows: number; bytes: number }[];
  auth?: { fails_24h: number; fails_1h: number; locked: { mob: string; n: number; last: string }[]; top_mobs: { mob: string; n: number; last: string }[]; top_ips: { ip: string; n: number }[]; hourly: { h: string; n: number }[] };
  admins?: { name: string; role: string; email: string | null; last_sign_in: string | null; mfa: boolean }[];
  admins_error?: string;
  settings?: { moyasar_pk_set: boolean; moyasar_pk_test: boolean; term2_start: string | null };
  db?: { size: number; version: string; connections: number; now: string };
  audit?: Record<string, any>[];
};

async function loadInsights(): Promise<{ data: Insights | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_insights');
  if (error) {
    const missing = /admin_insights|function|schema cache|PGRST202/i.test(error.message);
    return { data: null, error: missing ? 'MISSING' : error.message };
  }
  return { data: data as Insights, error: null };
}

// فحص حقيقي: هل يستطيع زائر غير مسجّل (بالمفتاح العام فقط) قراءة الجدول؟
let anonClient: ReturnType<typeof createClient> | null = null;
function getAnon() {
  if (!anonClient && SB_URL && SB_ANON) {
    anonClient = createClient(SB_URL, SB_ANON, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: 'h100h-anon-probe' },
    });
  }
  return anonClient;
}
type AnonResult = { table: string; open: boolean; rows: number | null; note: string };
async function probeAnon(tables: string[]): Promise<AnonResult[]> {
  const c = getAnon();
  if (!c) return tables.map((t) => ({ table: t, open: false, rows: null, note: 'تعذّر الفحص' }));
  return Promise.all(tables.map(async (t) => {
    const { count, error } = await c.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      const notExist = /does not exist|schema cache|PGRST205|42P01/i.test(error.message + (error as any).code);
      return { table: t, open: false, rows: null, note: notExist ? 'غير موجود' : 'مقفل' };
    }
    return { table: t, open: (count || 0) > 0, rows: count ?? 0, note: (count || 0) > 0 ? 'مفتوح للعامة' : 'لا يظهر شيء' };
  }));
}

async function authSettings(): Promise<Record<string, any> | null> {
  try {
    const r = await fetch(`${SB_URL}/auth/v1/settings`, { headers: { apikey: SB_ANON } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/* ══════════════════════════ تقني ══════════════════════════ */
type Check = { name: string; desc: string; status: Status; ms?: number; detail?: string };

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; ok: boolean; val?: T; err?: string }> {
  const t0 = performance.now();
  try { const val = await fn(); return { ms: Math.round(performance.now() - t0), ok: true, val }; }
  catch (e: any) { return { ms: Math.round(performance.now() - t0), ok: false, err: e?.message || String(e) }; }
}
// وصول بسيط بدون قراءة الرد (لأن الدوال تسمح فقط لموقع h100h.com بقراءة الرد)
const reach = (url: string, body?: string) => fetch(url, body
  ? { method: 'POST', mode: 'no-cors', body, cache: 'no-store' }
  : { mode: 'no-cors', cache: 'no-store' });
const speed = (ms?: number, ok = true): Status => (!ok ? 'bad' : ms == null ? 'unknown' : ms < 800 ? 'ok' : ms < 2500 ? 'warn' : 'bad');

export const TechTab = () => {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<Check[]>([]);
  const [ins, setIns] = useState<Insights | null>(null);
  const [insErr, setInsErr] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ t: string; n: number | null }[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const fn = (n: string) => `${SB_URL}/functions/v1/${n}`;
      const [site, portal, rest, authF, payF, dbF, opsF, parentF, insR] = await Promise.all([
        timed(() => reach(`${SITE}/?ping=${Date.now()}`)),
        timed(() => reach(`${SITE}/portal.html?ping=${Date.now()}`)),
        timed(async () => { const { error } = await supabase.from('app_settings').select('key').limit(1); if (error) throw error; }),
        timed(() => reach(fn('auth'), JSON.stringify({ probe: true }))),
        timed(() => reach(fn('pay'), JSON.stringify({ probe: true }))),
        timed(() => reach(`${fn('db')}/__ping`)),
        timed(() => reach(fn('student-ops'), '{}')),
        timed(() => reach(fn('parent-report'), '{}')),
        loadInsights(),
      ]);
      if (!alive) return;
      const s = insR.data?.settings;
      setChecks([
        { name: 'الموقع h100h.com', desc: 'الصفحة الرئيسية', status: speed(site.ms, site.ok), ms: site.ms, detail: site.err },
        { name: 'بوابة الطالب', desc: 'portal.html', status: speed(portal.ms, portal.ok), ms: portal.ms, detail: portal.err },
        { name: 'قاعدة البيانات', desc: 'Supabase REST', status: speed(rest.ms, rest.ok), ms: rest.ms, detail: rest.err },
        { name: 'دالة الدخول', desc: 'auth', status: speed(authF.ms, authF.ok), ms: authF.ms, detail: authF.err },
        { name: 'دالة الدفع', desc: 'pay', status: speed(payF.ms, payF.ok), ms: payF.ms, detail: payF.err },
        { name: 'جسر البيانات', desc: 'db', status: speed(dbF.ms, dbF.ok), ms: dbF.ms, detail: dbF.err },
        { name: 'عمليات الطالب', desc: 'student-ops', status: speed(opsF.ms, opsF.ok), ms: opsF.ms, detail: opsF.err },
        { name: 'تقرير ولي الأمر', desc: 'parent-report', status: speed(parentF.ms, parentF.ok), ms: parentF.ms, detail: parentF.err },
        { name: 'مفتاح Moyasar العام', desc: 'app_settings.moyasar_pk', status: !s ? 'unknown' : s.moyasar_pk_set ? 'ok' : s.moyasar_pk_test ? 'warn' : 'bad',
          detail: !s ? undefined : s.moyasar_pk_set ? 'مفتاح حقيقي (live)' : s.moyasar_pk_test ? 'مفتاح تجريبي (test)' : 'غير مضبوط — الدفع يحوّل للواتساب' },
        { name: 'تاريخ الفصل الثاني', desc: 'term2_start', status: !s ? 'unknown' : s.term2_start ? 'ok' : 'warn', detail: s?.term2_start || 'غير محدد' },
      ]);
      setIns(insR.data); setInsErr(insR.error);
      // عدد الصفوف من الدالة، وإلا عدّ مباشر لأهم الجداول
      if (insR.data?.tables) {
        setCounts(insR.data.tables.map((t) => ({ t: t.name, n: t.rows })).sort((a, b) => (b.n || 0) - (a.n || 0)));
      } else {
        const ts = ['students', 'exam_results', 'questions', 'pending_subs', 'payments', 'chat_messages', 'site_visits', 'coupons'];
        const res = await Promise.all(ts.map(async (t) => {
          const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
          return { t, n: error ? null : count ?? 0 };
        }));
        if (alive) setCounts(res);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [tick]);

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const build = useMemo(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => /assets\/index-/.test(x)) || '';
    return (s.match(/index-([^.]+)\.js/) || [, '—'])[1];
  }, []);

  return (
    <Box>
      <Header title="الحالة التقنية" sub="فحص حي للموقع والخوادم والدوال — يُقاس من متصفحك الآن" onRefresh={() => setTick((t) => t + 1)} loading={loading} />
      {insErr === 'MISSING' && <Alert severity="info" sx={{ mb: 2 }}>لعرض حجم قاعدة البيانات وتفاصيل الجداول شغّل ملف <b>09-admin-insights.sql</b> في Supabase.</Alert>}
      {insErr && insErr !== 'MISSING' && <Alert severity="warning" sx={{ mb: 2 }}>{insErr}</Alert>}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><Stat loading={loading} title="الخدمات السليمة" value={`${fmt(okCount)} / ${fmt(checks.length)}`} color={okCount === checks.length ? '#059669' : '#d97706'} /></Grid>
        <Grid item xs={6} md={3}><Stat loading={loading} title="حجم قاعدة البيانات" value={ins?.db ? bytes(ins.db.size) : '—'} sub="الحد المجاني 500 MB" color="#7c3aed" /></Grid>
        <Grid item xs={6} md={3}><Stat loading={loading} title="اتصالات نشطة" value={ins?.db ? fmt(ins.db.connections) : '—'} sub={ins?.db ? `Postgres ${ins.db.version}` : undefined} color="#0891b2" /></Grid>
        <Grid item xs={6} md={3}><Stat title="نسخة اللوحة" value={build} sub="تتغيّر مع كل نشر" color="#64748b" /></Grid>
      </Grid>

      {ins?.db && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" fontWeight={700}>استهلاك مساحة قاعدة البيانات</Typography>
            <Typography variant="body2" color="text.secondary">{bytes(ins.db.size)} من 500 MB</Typography>
          </Box>
          <LinearProgress variant="determinate" value={Math.min(100, (ins.db.size / (500 * 1024 * 1024)) * 100)} sx={{ height: 10, borderRadius: 5 }}
            color={ins.db.size > 400 * 1024 * 1024 ? 'error' : ins.db.size > 250 * 1024 * 1024 ? 'warning' : 'primary'} />
        </CardContent></Card>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Panel title="فحص الخدمات" sub="الأخضر أقل من 0.8 ثانية · البرتقالي حتى 2.5 ثانية">
            {loading ? <Skeleton variant="rounded" height={320} /> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>الخدمة</TableCell><TableCell>الحالة</TableCell><TableCell>الزمن</TableCell></TableRow></TableHead>
                <TableBody>
                  {checks.map((c) => (
                    <TableRow key={c.name} hover>
                      <TableCell><b>{c.name}</b><br /><Typography variant="caption" color="text.secondary" dir="ltr">{c.desc}</Typography></TableCell>
                      <TableCell>
                        <StatusChip s={c.status} />
                        {c.detail && <Typography variant="caption" display="block" color="text.secondary" mt={.5}>{c.detail}</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{c.ms != null ? `${fmt(c.ms)} ms` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel title="الجداول وعدد السجلات" sub={ins?.tables ? 'تقديري من إحصاءات Postgres' : 'عدّ مباشر'}>
            {loading ? <Skeleton variant="rounded" height={320} /> : (
              <Box sx={{ maxHeight: 380, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow><TableCell>الجدول</TableCell><TableCell>السجلات</TableCell>{ins?.tables && <TableCell>الحجم</TableCell>}</TableRow></TableHead>
                  <TableBody>
                    {counts.map((c) => {
                      const t = ins?.tables?.find((x) => x.name === c.t);
                      return (
                        <TableRow key={c.t} hover>
                          <TableCell>{TABLE_AR[c.t] || c.t}<Typography variant="caption" color="text.secondary" display="block" dir="ltr" textAlign="right">{c.t}</Typography></TableCell>
                          <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{c.n == null ? '—' : fmt(c.n)}</TableCell>
                          {ins?.tables && <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{t ? bytes(t.bytes) : '—'}</TableCell>}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ══════════════════════════ أمني ══════════════════════════ */
type SecCheck = { title: string; status: Status; detail: string; fix?: string };

export const SecurityTab = () => {
  const [loading, setLoading] = useState(true);
  const [ins, setIns] = useState<Insights | null>(null);
  const [insErr, setInsErr] = useState<string | null>(null);
  const [anon, setAnon] = useState<AnonResult[]>([]);
  const [authCfg, setAuthCfg] = useState<Record<string, any> | null>(null);
  const [aal, setAal] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [insR, an, cfg, a] = await Promise.all([
        loadInsights(),
        probeAnon(SENSITIVE),
        authSettings(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => ({ data: null })),
      ]);
      if (!alive) return;
      setIns(insR.data); setInsErr(insR.error); setAnon(an); setAuthCfg(cfg);
      setAal((a as any)?.data?.currentLevel || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [tick]);

  const checks: SecCheck[] = useMemo(() => {
    const out: SecCheck[] = [];
    const openT = anon.filter((x) => x.open);
    out.push({
      title: 'الجداول الحساسة مقفلة عن الزوار',
      status: anon.length === 0 ? 'unknown' : openT.length === 0 ? 'ok' : openT.some((x) => ['students', 'pending_subs', 'pending_pw', 'payments', 'admin_roles'].includes(x.table)) ? 'bad' : 'warn',
      detail: openT.length === 0 ? 'لا يستطيع أي زائر قراءة الجداول الحساسة' : `مفتوح: ${openT.map((x) => TABLE_AR[x.table] || x.table).join('، ')}`,
      fix: openT.length ? 'الخطوة الأمنية التالية: تحويل طلبات البوابة لجسر البيانات ثم قفل هذه الجداول' : undefined,
    });
    out.push({
      title: 'التسجيل الذاتي في لوحة الإدارة مغلق',
      status: !authCfg ? 'unknown' : authCfg.disable_signup ? 'ok' : 'bad',
      detail: !authCfg ? 'تعذّر قراءة إعدادات الدخول' : authCfg.disable_signup ? 'لا أحد يستطيع إنشاء حساب مدير جديد بنفسه' : 'أي شخص يستطيع إنشاء حساب! — Supabase ← Authentication ← Sign In / Providers ← أطفئ Allow new users to sign up',
    });
    out.push({
      title: 'جلستك الحالية بالتحقق الثنائي',
      status: aal === 'aal2' ? 'ok' : aal ? 'warn' : 'unknown',
      detail: aal === 'aal2' ? 'دخلت بكلمة المرور + رمز التطبيق' : 'دخلت بكلمة المرور فقط',
    });
    if (ins?.admins) {
      const noMfa = ins.admins.filter((a) => !a.mfa);
      out.push({
        title: 'كل المدراء فعّلوا التحقق الثنائي',
        status: noMfa.length === 0 ? 'ok' : 'warn',
        detail: noMfa.length === 0 ? `${fmt(ins.admins.length)} مدير — كلهم بتحقق ثنائي` : `بدون تحقق ثنائي: ${noMfa.map((a) => a.name || a.email || '—').join('، ')}`,
      });
    }
    if (ins?.tables) {
      const noRls = ins.tables.filter((t) => !t.rls);
      out.push({
        title: 'حماية الصفوف (RLS) مفعّلة على كل الجداول',
        status: noRls.length === 0 ? 'ok' : 'warn',
        detail: noRls.length === 0 ? 'كل الجداول محمية' : `${fmt(noRls.length)} جدول بدون حماية: ${noRls.slice(0, 8).map((t) => t.name).join('، ')}${noRls.length > 8 ? '…' : ''}`,
      });
      const anonWrite = ins.tables.filter((t) => t.anon_write && (!t.rls || t.anon_policy));
      out.push({
        title: 'لا يستطيع الزائر الكتابة في الجداول',
        status: anonWrite.length === 0 ? 'ok' : 'warn',
        detail: anonWrite.length === 0 ? 'لا كتابة مجهولة' : `يمكن الكتابة في: ${anonWrite.slice(0, 8).map((t) => t.name).join('، ')}`,
      });
    }
    if (ins?.auth) {
      const a = ins.auth;
      out.push({
        title: 'محاولات الدخول الفاشلة طبيعية',
        status: a.locked.length > 0 || a.fails_1h > 40 ? 'warn' : 'ok',
        detail: `${fmt(a.fails_24h)} محاولة فاشلة خلال 24 ساعة · ${fmt(a.locked.length)} حساب مقفل مؤقتاً`,
      });
    }
    if (ins?.settings) {
      out.push({
        title: 'الدفع يُتحقق منه على الخادم',
        status: ins.settings.moyasar_pk_set ? 'ok' : 'warn',
        detail: ins.settings.moyasar_pk_set ? 'المفتاح العام مضبوط والتفعيل يتم بعد التحقق من Moyasar' : 'المفتاح غير مضبوط بعد — الاشتراك يتم يدوياً عبر الواتساب',
      });
    }
    return out;
  }, [anon, authCfg, aal, ins]);

  const known = checks.filter((c) => c.status !== 'unknown');
  const score = known.length ? Math.round((known.filter((c) => c.status === 'ok').length / known.length) * 100) : 0;
  const scoreColor = score >= 85 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
  const hourly = (ins?.auth?.hourly || []).map((h) => ({ h: new Date(h.h).toLocaleTimeString('ar-SA', { hour: 'numeric' }), n: h.n }));

  return (
    <Box>
      <Header title="الحالة الأمنية" sub="فحص حي: يحاول قراءة الجداول كزائر مجهول، ويراجع الدخول والمدراء" onRefresh={() => setTick((t) => t + 1)} loading={loading} />
      {insErr === 'MISSING' && <Alert severity="info" sx={{ mb: 2 }}>لعرض محاولات الدخول الفاشلة وحالة المدراء وحماية الجداول شغّل ملف <b>09-admin-insights.sql</b> في Supabase.</Alert>}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}><CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">درجة الأمان</Typography>
            {loading ? <Skeleton width={120} height={70} sx={{ mx: 'auto' }} /> : (
              <Typography variant="h2" fontWeight={900} sx={{ color: scoreColor, fontVariantNumeric: 'tabular-nums' }}>{fmt(score)}٪</Typography>
            )}
            <LinearProgress variant="determinate" value={loading ? 0 : score} sx={{ height: 8, borderRadius: 4, mt: 1, '& .MuiLinearProgress-bar': { bgcolor: scoreColor } }} />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              {fmt(known.filter((c) => c.status === 'ok').length)} من {fmt(known.length)} فحوص ناجحة
            </Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={4}><Stat loading={loading} title="محاولات فاشلة (24 ساعة)" value={ins?.auth ? fmt(ins.auth.fails_24h) : '—'} sub={ins?.auth ? `آخر ساعة: ${fmt(ins.auth.fails_1h)}` : undefined} color="#dc2626" /></Grid>
        <Grid item xs={6} md={4}><Stat loading={loading} title="حسابات مقفلة مؤقتاً" value={ins?.auth ? fmt(ins.auth.locked.length) : '—'} sub="8 محاولات خلال 15 دقيقة" color="#d97706" /></Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={7}>
          <Panel title="قائمة الفحوص">
            {loading ? <Skeleton variant="rounded" height={300} /> : (
              <Box display="flex" flexDirection="column" gap={1.25}>
                {checks.map((c) => (
                  <Box key={c.title} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', borderInlineStart: `4px solid ${STATUS_UI[c.status].color}` }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography fontWeight={700} flex={1}>{c.title}</Typography>
                      <StatusChip s={c.status} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={.5}>{c.detail}</Typography>
                    {c.fix && <Typography variant="caption" color="primary" display="block" mt={.5}>← {c.fix}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel title="قراءة الجداول كزائر مجهول" sub="اختبار حقيقي بالمفتاح العام فقط">
            {loading ? <Skeleton variant="rounded" height={300} /> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>الجدول</TableCell><TableCell>النتيجة</TableCell></TableRow></TableHead>
                <TableBody>
                  {anon.map((r) => (
                    <TableRow key={r.table} hover>
                      <TableCell>{TABLE_AR[r.table] || r.table}<Typography variant="caption" color="text.secondary" display="block" dir="ltr" textAlign="right">{r.table}</Typography></TableCell>
                      <TableCell>
                        {r.open ? <StatusChip s="bad" label={`مفتوح · ${fmt(r.rows || 0)} صف`} />
                          : r.note === 'غير موجود' ? <Chip size="small" label="غير موجود" />
                          : <StatusChip s="ok" label={r.note} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </Grid>
      </Grid>

      {ins?.auth && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} lg={6}>
            <Panel title="المحاولات الفاشلة حسب الساعة" sub="آخر 24 ساعة">
              {hourly.length === 0 ? <Typography color="text.secondary" py={5} textAlign="center">لا توجد محاولات فاشلة ✓</Typography> : (
                <Box height={220} dir="ltr">
                  <ResponsiveContainer>
                    <BarChart data={hourly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="h" tick={{ fontSize: 11 }} reversed />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} orientation="right" />
                      <Tooltip formatter={(v: number) => [fmt(v), 'محاولة']} />
                      <Bar dataKey="n" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Panel>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Panel title="أكثر الأرقام محاولةً" sub="آخر 24 ساعة — الأرقام مخفية جزئياً">
              {ins.auth.top_mobs.length === 0 ? <Typography color="text.secondary" py={5} textAlign="center">لا شيء</Typography> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>الجوال</TableCell><TableCell>المحاولات</TableCell><TableCell>آخر محاولة</TableCell></TableRow></TableHead>
                  <TableBody>
                    {ins.auth.top_mobs.map((m) => {
                      const locked = ins.auth!.locked.some((l) => l.mob === m.mob);
                      return (
                        <TableRow key={m.mob} hover>
                          <TableCell dir="ltr" sx={{ textAlign: 'right' }}>
                            <MuiTooltip title={m.mob}><span>{maskMob(m.mob)}</span></MuiTooltip>
                            {locked && <Chip size="small" color="warning" label="مقفل" sx={{ mr: 1 }} />}
                          </TableCell>
                          <TableCell>{fmt(m.n)}</TableCell>
                          <TableCell>{dt(m.last)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </Grid>
        </Grid>
      )}

      {ins?.admins && (
        <Panel title="حسابات المدراء">
          <Table size="small">
            <TableHead><TableRow><TableCell>الاسم</TableCell><TableCell>البريد</TableCell><TableCell>الدور</TableCell><TableCell>التحقق الثنائي</TableCell><TableCell>آخر دخول</TableCell></TableRow></TableHead>
            <TableBody>
              {ins.admins.map((a, i) => (
                <TableRow key={i} hover>
                  <TableCell>{a.name || '—'}</TableCell>
                  <TableCell dir="ltr" sx={{ textAlign: 'right' }}>{a.email || '—'}</TableCell>
                  <TableCell>{a.role}</TableCell>
                  <TableCell>{a.mfa ? <StatusChip s="ok" label="مفعّل" /> : <StatusChip s="warn" label="غير مفعّل" />}</TableCell>
                  <TableCell>{dt(a.last_sign_in)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </Box>
  );
};

/* ══════════════════════════ تطويري ══════════════════════════ */
const GRADE_AR: Record<number, string> = {
  1: 'أول ابتدائي', 2: 'ثاني ابتدائي', 3: 'ثالث ابتدائي', 4: 'رابع ابتدائي', 5: 'خامس ابتدائي', 6: 'سادس ابتدائي',
  7: 'أول متوسط', 8: 'ثاني متوسط', 9: 'ثالث متوسط', 10: 'أول ثانوي', 11: 'ثاني ثانوي', 12: 'ثالث ثانوي',
  13: 'جامعي', 14: 'موظف',
};

async function fetchAll<T>(table: string, cols: string, apply?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    let q = supabase.from(table).select(cols).range(from, from + 999);
    if (apply) q = apply(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data || []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type RoadItem = { id: string; title: string; why: string; auto?: boolean | null };
const ROADMAP_KEY = 'h100h-roadmap-done';

export const DevTab = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ins, setIns] = useState<Insights | null>(null);
  const [anon, setAnon] = useState<AnonResult[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(ROADMAP_KEY) || '{}'); } catch { return {}; }
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      const since = daysAgo(29).toISOString();
      try {
        const [st, vi, ex, pa, insR, an] = await Promise.all([
          fetchAll<any>('students', 'mob,grade,plan,active,sub_end,joined,created_at,last_login,role'),
          fetchAll<any>('site_visits', 'session_id,device_type,created_at,mob', (q) => q.gte('created_at', since)).catch(() => []),
          fetchAll<any>('exam_results', '*', (q) => q.gte('created_at', since)).catch(() => []),
          fetchAll<any>('payments', 'mob,status,amount,created_at').catch(() => []),
          loadInsights(),
          probeAnon(['students', 'app_settings', 'coupons', 'pending_subs']),
        ]);
        if (!alive) return;
        setStudents(st.filter((s) => (s.role || 'student') === 'student'));
        setVisits(vi); setExams(ex); setPayments(pa); setIns(insR.data); setAnon(an);
      } catch (e: any) { if (alive) setErr(e?.message || 'خطأ'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [tick]);

  const m = useMemo(() => {
    const now = Date.now();
    const within = (s: string | null | undefined, days: number) => !!s && now - new Date(s).getTime() <= days * 864e5;
    const examMobs = (days: number) => new Set(exams.filter((e) => within(e.created_at, days)).map((e) => e.mob)).size;
    const dau = Math.max(students.filter((s) => within(s.last_login, 1)).length, examMobs(1));
    const wau = Math.max(students.filter((s) => within(s.last_login, 7)).length, examMobs(7));
    const mau = Math.max(students.filter((s) => within(s.last_login, 30)).length, examMobs(30));
    const joinedAt = (s: any) => s.joined || s.created_at;

    const sessions = new Set(visits.map((v) => v.session_id || `${v.mob}-${String(v.created_at).slice(0, 10)}`)).size;
    const newStudents = students.filter((s) => within(joinedAt(s), 30)).length;
    const paidMobs = new Set(payments.filter((p) => p.status === 'activated' && within(p.created_at, 30)).map((p) => p.mob)).size;
    const funnel = [
      { name: 'زيارات (جلسات)', value: sessions },
      { name: 'تسجيل جديد', value: newStudents },
      { name: 'اشتراك مدفوع', value: paidMobs },
    ];

    const g: Record<string, number> = {};
    students.forEach((s) => { const k = GRADE_AR[Number(s.grade)] || 'غير محدد'; g[k] = (g[k] || 0) + 1; });
    const grades = Object.entries(GRADE_AR).map(([n, name]) => ({ name, value: g[name] || 0, n: Number(n) }))
      .concat(g['غير محدد'] ? [{ name: 'غير محدد', value: g['غير محدد'], n: 99 }] : []);

    const subj: Record<string, { n: number; sum: number; c: number }> = {};
    exams.forEach((e) => {
      const k = e.subject || '—';
      subj[k] = subj[k] || { n: 0, sum: 0, c: 0 };
      subj[k].n++;
      const p = e.pct != null && Number(e.pct) > 0 ? Number(e.pct) : Number(e.total) > 0 ? (Number(e.score) / Number(e.total)) * 100 : NaN;
      if (!isNaN(p)) { subj[k].sum += p; subj[k].c++; }
    });
    const subjects = Object.entries(subj).map(([name, v]) => ({ name, value: v.n, avg: v.c ? Math.round(v.sum / v.c) : null }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    const dev: Record<string, number> = {};
    visits.forEach((v) => { const k = v.device_type || 'غير معروف'; dev[k] = (dev[k] || 0) + 1; });
    const DEV_AR: Record<string, string> = { mobile: 'جوال', desktop: 'كمبيوتر', tablet: 'تابلت' };
    const devices = Object.entries(dev).map(([k, value]) => ({ name: DEV_AR[k] || k, value })).sort((a, b) => b.value - a.value);

    // العودة: من سجّلوا قبل 8–60 يوماً، كم منهم دخل آخر 7 أيام
    const cohort = students.filter((s) => { const j = joinedAt(s); return j && !within(j, 7) && within(j, 60); });
    const returned = cohort.filter((s) => within(s.last_login, 7)).length;
    const retention = cohort.length ? Math.round((returned / cohort.length) * 100) : null;

    const days: string[] = []; for (let i = 29; i >= 0; i--) days.push(dayKey(daysAgo(i)));
    const act: Record<string, Set<string>> = {};
    exams.forEach((e) => { const k = String(e.created_at).slice(0, 10); (act[k] = act[k] || new Set()).add(e.mob); });
    const activeDaily = days.map((k) => ({ day: `${Number(k.slice(8))}/${Number(k.slice(5, 7))}`, value: act[k]?.size || 0 }));

    return { dau, wau, mau, funnel, grades, subjects, devices, retention, cohort: cohort.length, activeDaily, sessions };
  }, [students, visits, exams, payments]);

  const roadmap: RoadItem[] = useMemo(() => {
    const isOpen = (t: string) => anon.find((a) => a.table === t)?.open;
    const s = ins?.settings;
    const admins = ins?.admins;
    return [
      { id: 'moyasar', title: 'تفعيل الدفع الإلكتروني (Moyasar)', why: 'المفتاح السري في Secrets + المفتاح العام في الإعدادات', auto: s ? s.moyasar_pk_set : null },
      { id: 'lock-students', title: 'قفل جدول الطلاب عن العامة', why: 'تحويل طلبات البوابة لجسر البيانات أولاً', auto: anon.length ? !isOpen('students') : null },
      { id: 'lock-others', title: 'قفل الإعدادات والكوبونات والطلبات المعلقة', why: 'بيانات حساسة مقروءة حالياً', auto: anon.length ? !isOpen('app_settings') && !isOpen('coupons') && !isOpen('pending_subs') : null },
      { id: 'mfa-all', title: 'التحقق الثنائي لكل المدراء', why: 'حماية الدخول للوحة', auto: admins ? admins.every((a) => a.mfa) : null },
      { id: 'term2', title: 'تأكيد تاريخ فتح الفصل الثاني', why: 'التاريخ الحالي مؤقت', auto: null },
      { id: 'terms', title: 'صفحة الشروط وسياسة الاسترجاع', why: 'مطلوبة لبوابة الدفع وثقة الطالب', auto: null },
      { id: 'claim', title: 'تعديل رقم «30,000 طالب» في الصفحة الرئيسية', why: 'يُستبدل برقم حقيقي أو يُحذف', auto: null },
      { id: 'sitemap', title: 'خريطة الموقع sitemap.xml', why: 'robots.txt يشير لملف غير موجود — يحسّن الظهور في Google', auto: null },
      { id: 'expiry-notify', title: 'تنبيه الطالب قبل انتهاء اشتراكه', why: 'رسالة تلقائية قبل 3 أيام لرفع التجديد', auto: null },
      { id: 'backup', title: 'نسخة احتياطية دورية لقاعدة البيانات', why: 'تصدير أسبوعي للطلاب والنتائج', auto: null },
    ];
  }, [anon, ins]);

  const toggle = (id: string) => {
    const n = { ...done, [id]: !done[id] };
    setDone(n);
    try { localStorage.setItem(ROADMAP_KEY, JSON.stringify(n)); } catch { /* */ }
  };
  const isDone = (r: RoadItem) => (r.auto != null ? r.auto : !!done[r.id]);
  const progress = Math.round((roadmap.filter(isDone).length / roadmap.length) * 100);
  const maxFunnel = Math.max(1, ...m.funnel.map((f) => f.value));

  return (
    <Box>
      <Header title="التطوير والنمو" sub="نشاط الطلاب ومسار التحويل وخطة العمل القادمة" onRefresh={() => setTick((t) => t + 1)} loading={loading} />
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><Stat loading={loading} title="نشطون اليوم" value={fmt(m.dau)} color="#1a56db" /></Grid>
        <Grid item xs={6} md={3}><Stat loading={loading} title="نشطون هذا الأسبوع" value={fmt(m.wau)} color="#0891b2" /></Grid>
        <Grid item xs={6} md={3}><Stat loading={loading} title="نشطون هذا الشهر" value={fmt(m.mau)} sub={students.length ? `${fmt(Math.round((m.mau / students.length) * 100))}٪ من كل الطلاب` : undefined} color="#7c3aed" /></Grid>
        <Grid item xs={6} md={3}><Stat loading={loading} title="نسبة العودة" value={m.retention == null ? '—' : `${fmt(m.retention)}٪`} sub={`من ${fmt(m.cohort)} سجّلوا قبل 8–60 يوماً`} color="#059669" /></Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={5}>
          <Panel title="مسار التحويل" sub="آخر 30 يوماً">
            {loading ? <Skeleton variant="rounded" height={200} /> : (
              <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
                {m.funnel.map((f, i) => {
                  const prev = i > 0 ? m.funnel[i - 1].value : 0;
                  const rate = i > 0 && prev > 0 ? Math.round((f.value / prev) * 1000) / 10 : null;
                  return (
                    <Box key={f.name}>
                      <Box display="flex" justifyContent="space-between" mb={.5}>
                        <Typography variant="body2" fontWeight={700}>{f.name}</Typography>
                        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(f.value)}{rate != null && <Typography component="span" variant="caption" color="text.secondary"> · {rate.toLocaleString('ar-SA')}٪</Typography>}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 14, borderRadius: 7, bgcolor: 'action.hover', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${Math.max(2, (f.value / maxFunnel) * 100)}%`, bgcolor: ['#1a56db', '#7c3aed', '#059669'][i], borderRadius: 7 }} />
                      </Box>
                    </Box>
                  );
                })}
                {m.sessions === 0 && <Typography variant="caption" color="text.secondary">لا توجد بيانات زيارات مسجّلة في site_visits.</Typography>}
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={7}>
          <Panel title="طلاب نشطون يومياً" sub="عدد الطلاب المختلفين الذين أدّوا اختباراً — آخر 30 يوماً">
            {loading ? <Skeleton variant="rounded" height={220} /> : (
              <Box height={220} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={m.activeDaily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={2} reversed />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} orientation="right" />
                    <Tooltip formatter={(v: number) => [fmt(v), 'طالب']} />
                    <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={6}>
          <Panel title="الطلاب حسب الصف">
            {loading ? <Skeleton variant="rounded" height={300} /> : (
              <Box height={Math.max(260, m.grades.length * 22)} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={m.grades} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} orientation="right" interval={0} />
                    <Tooltip formatter={(v: number) => [fmt(v), 'طالب']} />
                    <Bar dataKey="value" fill="#1a56db" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Panel title="أكثر المواد اختباراً" sub="آخر 30 يوماً · مع متوسط الدرجة">
            {loading ? <Skeleton variant="rounded" height={300} /> : m.subjects.length === 0 ? (
              <Typography color="text.secondary" py={8} textAlign="center">لا توجد اختبارات خلال 30 يوماً</Typography>
            ) : (
              <Table size="small">
                <TableHead><TableRow><TableCell>المادة</TableCell><TableCell>الاختبارات</TableCell><TableCell>المتوسط</TableCell></TableRow></TableHead>
                <TableBody>
                  {m.subjects.map((s) => (
                    <TableRow key={s.name} hover>
                      <TableCell>{s.name}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(s.value)}</TableCell>
                      <TableCell>
                        {s.avg == null ? '—' : (
                          <Chip size="small" label={`${fmt(s.avg)}٪`}
                            color={s.avg >= 80 ? 'success' : s.avg >= 60 ? 'warning' : 'error'} variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Panel title="أجهزة الزوار" sub="آخر 30 يوماً">
            {loading ? <Skeleton variant="rounded" height={200} /> : m.devices.length === 0 ? (
              <Typography color="text.secondary" py={6} textAlign="center">لا توجد بيانات</Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.25}>
                {m.devices.map((d) => {
                  const total = m.devices.reduce((a, b) => a + b.value, 0);
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <Box key={d.name}>
                      <Box display="flex" justifyContent="space-between"><Typography variant="body2">{d.name}</Typography><Typography variant="body2">{fmt(pct)}٪</Typography></Box>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={8}>
          <Panel title="خطة التطوير" sub="البنود ذات الشارة «تلقائي» تُفحص من النظام؛ الباقي علّمها بنفسك"
            action={<Chip label={`${fmt(progress)}٪ منجز`} color={progress >= 80 ? 'success' : 'primary'} />}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, mb: 1.5 }} />
            {roadmap.map((r) => {
              const d = isDone(r);
              return (
                <Box key={r.id} display="flex" alignItems="flex-start" gap={1} py={.75} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Checkbox size="small" checked={d} disabled={r.auto != null} onChange={() => toggle(r.id)} sx={{ p: .5 }} />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={700} sx={{ textDecoration: d ? 'line-through' : 'none', opacity: d ? .6 : 1 }}>{r.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.why}</Typography>
                  </Box>
                  {r.auto != null && <Chip size="small" variant="outlined" label="تلقائي" />}
                </Box>
              );
            })}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
};
