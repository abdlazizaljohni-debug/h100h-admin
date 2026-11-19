// ══════════════════════════════════════════════════════════════
//  h100h — المراقبة التقنية · 2026-11-19 · إضافة
//  أخطاء البوابة · نشاط المدراء · السعة والنمو (مع توقعات 9,000 و100,000 طالب)
//  تعتمد على 14-monitoring.sql
// ══════════════════════════════════════════════════════════════
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Grid, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Alert, Skeleton, LinearProgress, TextField, MenuItem, IconButton, Tooltip, Collapse,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts';
import { supabase } from '../supabaseClient';

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-SA');
const bytes = (b: number) => {
  if (!b) return '0';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let x = b;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toLocaleString('ar-SA', { maximumFractionDigits: 1 })} ${u[i]}`;
};
const ago = (s: string) => {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'الآن'; if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60); if (h < 24) return `قبل ${h} س`;
  const d = Math.round(h / 24); return d < 30 ? `قبل ${d} يوم` : new Date(s).toLocaleDateString('ar-SA');
};
const missing = (m: string) => /client_errors|admin_activity|admin_capacity|does not exist|schema cache|PGRST20[25]|42P01/i.test(m);
const NEED_SQL = 'شغّل ملف 14-monitoring.sql في Supabase لتفعيل هذه الصفحة.';

export const MonitoringPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Title title="المراقبة التقنية" />
      <Typography variant="h5" fontWeight={800} mb={1}>المراقبة التقنية</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="أخطاء البوابة" /><Tab label="نشاط المدراء والنظام" /><Tab label="السعة والنمو" />
      </Tabs>
      {tab === 0 && <Errors />}
      {tab === 1 && <Activity />}
      {tab === 2 && <Capacity />}
    </Box>
  );
};

/* ══════ أخطاء البوابة ══════ */
type Err = { sig: string; msg: string; src: string | null; line: number | null; page: string | null; ua_sample: string | null; browser: string | null; count: number; users: number; first_seen: string; last_seen: string; resolved: boolean };
const Errors = () => {
  const notify = useNotify();
  const [rows, setRows] = useState<Err[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState<'open' | 'all'>('open');
  const [open, setOpen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setRows(null); setErr(null);
    let q = supabase.from('client_errors').select('*').order('last_seen', { ascending: false }).limit(300);
    if (show === 'open') q = q.eq('resolved', false);
    q.then(({ data, error }) => {
      if (error) { setErr(missing(error.message) ? NEED_SQL : error.message); setRows([]); return; }
      setRows((data || []) as Err[]);
    });
  }, [show, tick]);
  const act = async (sig: string, kind: 'resolve' | 'delete') => {
    const { error } = kind === 'resolve'
      ? await supabase.from('client_errors').update({ resolved: true }).eq('sig', sig)
      : await supabase.from('client_errors').delete().eq('sig', sig);
    if (error) notify(error.message, { type: 'error' }); else setTick((t) => t + 1);
  };
  const day = Date.now() - 864e5;
  const last24 = (rows || []).filter((r) => new Date(r.last_seen).getTime() > day);
  const affected = last24.reduce((a, r) => a + r.users, 0);
  if (err) return <Alert severity="info">{err}</Alert>;
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><Mini t="أخطاء مفتوحة" v={(rows || []).filter((r) => !r.resolved).length} color="#dc2626" loading={!rows} /></Grid>
        <Grid item xs={6} md={3}><Mini t="ظهرت خلال 24 ساعة" v={last24.length} color="#d97706" loading={!rows} /></Grid>
        <Grid item xs={6} md={3}><Mini t="طلاب تأثروا (تقريبي)" v={affected} color="#7c3aed" loading={!rows} /></Grid>
        <Grid item xs={6} md={3}><Mini t="إجمالي التكرار" v={(rows || []).reduce((a, r) => a + r.count, 0)} color="#64748b" loading={!rows} /></Grid>
      </Grid>
      <Card>
        <Box display="flex" alignItems="center" gap={1} p={1.5} flexWrap="wrap">
          <Typography fontWeight={700} flex={1}>الأخطاء مرتبة بآخر ظهور</Typography>
          <TextField select size="small" value={show} onChange={(e) => setShow(e.target.value as any)}>
            <MenuItem value="open">المفتوحة فقط</MenuItem><MenuItem value="all">الكل</MenuItem>
          </TextField>
          <IconButton onClick={() => setTick((t) => t + 1)}><RefreshIcon /></IconButton>
        </Box>
        {!rows ? <LinearProgress /> : rows.length === 0 ? (
          <Typography color="text.secondary" p={4} textAlign="center">لا توجد أخطاء ✓ — البوابة تعمل بدون مشاكل ظاهرة</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الخطأ</TableCell><TableCell>المتصفح</TableCell><TableCell>التكرار</TableCell><TableCell>آخر ظهور</TableCell><TableCell />
              </TableRow></TableHead>
              <TableBody>
                {rows.map((r) => (
                  <Fragment key={r.sig}>
                    <TableRow hover sx={{ opacity: r.resolved ? .5 : 1 }}>
                      <TableCell sx={{ maxWidth: 480 }}>
                        <Box display="flex" alignItems="center" gap={.5}>
                          <IconButton size="small" onClick={() => setOpen(open === r.sig ? null : r.sig)}>
                            <ExpandMoreIcon fontSize="small" sx={{ transform: open === r.sig ? 'rotate(180deg)' : 'none' }} />
                          </IconButton>
                          <Typography variant="body2" noWrap dir="ltr" title={r.msg} sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{r.msg}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.browser || '—'}</TableCell>
                      <TableCell><Chip size="small" label={`${fmt(r.count)} مرة · ${fmt(r.users)} طالب`} color={r.count >= 20 ? 'error' : r.count >= 5 ? 'warning' : 'default'} variant="outlined" /></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{ago(r.last_seen)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {!r.resolved && <Tooltip title="تم الإصلاح"><IconButton size="small" color="success" onClick={() => act(r.sig, 'resolve')}><CheckIcon fontSize="small" /></IconButton></Tooltip>}
                        <Tooltip title="حذف"><IconButton size="small" onClick={() => act(r.sig, 'delete')}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, borderBottom: open === r.sig ? undefined : 'none' }}>
                        <Collapse in={open === r.sig}>
                          <Box py={1.5} dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary', lineHeight: 1.9 }}>
                            <div><b>message:</b> {r.msg}</div>
                            <div><b>file:</b> {r.src || '—'}{r.line ? `:${r.line}` : ''}</div>
                            <div><b>page:</b> {r.page || '—'}</div>
                            <div><b>first seen:</b> {new Date(r.first_seen).toLocaleString('ar-SA')}</div>
                            <div style={{ wordBreak: 'break-all' }}><b>user agent:</b> {r.ua_sample || '—'}</div>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        البلاغات لا تحتوي أي بيانات شخصية. عند إصلاح خطأ اضغط ✓ — إن ظهر مرة ثانية يعود مفتوحاً تلقائياً.
      </Typography>
    </Box>
  );
};

/* ══════ نشاط المدراء والنظام ══════ */
type Act = { id: number; ts: string; actor: string; tbl: string; row_key: string | null; action: string; changes: Record<string, any> | null };
const TBL_AR: Record<string, string> = {
  students: 'الطلاب', questions: 'الأسئلة', coupons: 'الكوبونات', app_settings: 'الإعدادات', notifications: 'الإعلانات',
  pending_subs: 'الطلبات المعلقة', plan_prices: 'الأسعار', subscription_keys: 'مفاتيح الاشتراك', admin_roles: 'المدراء',
};
const ACT_AR: Record<string, { t: string; c: 'success' | 'info' | 'error' }> = {
  INSERT: { t: 'إضافة', c: 'success' }, UPDATE: { t: 'تعديل', c: 'info' }, DELETE: { t: 'حذف', c: 'error' },
};
const FIELD_AR: Record<string, string> = {
  plan: 'الباقة', active: 'التفعيل', sub_end: 'نهاية الاشتراك', grade: 'الصف', blocked: 'الحظر', role: 'الدور', name: 'الاسم', mob: 'الجوال',
  question: 'السؤال', opts: 'الخيارات', ans: 'الإجابة', solution: 'الحل', image_url: 'الصورة', term: 'الفصل', exam_num: 'الاختبار', subject: 'المادة',
  value: 'القيمة', type: 'النوع', expiry: 'الانتهاء', used: 'الاستخدام', title: 'العنوان', body: 'النص', price: 'السعر',
};
const show = (v: any) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80));
const Activity = () => {
  const [rows, setRows] = useState<Act[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tbl, setTbl] = useState('');
  const [who, setWho] = useState('');
  const [q, setQ] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setRows(null); setErr(null);
    let x = supabase.from('admin_activity').select('*').order('ts', { ascending: false }).limit(300);
    if (tbl) x = x.eq('tbl', tbl);
    if (who === 'admin') x = x.neq('actor', 'النظام'); else if (who === 'system') x = x.eq('actor', 'النظام');
    const s = q.trim().replace(/[%,()]/g, '');
    if (s) x = x.ilike('row_key', `%${s}%`);
    const t = setTimeout(() => x.then(({ data, error }) => {
      if (error) { setErr(missing(error.message) ? NEED_SQL : error.message); setRows([]); return; }
      setRows((data || []) as Act[]);
    }), 300);
    return () => clearTimeout(t);
  }, [tbl, who, q, tick]);
  if (err) return <Alert severity="info">{err}</Alert>;
  return (
    <Card>
      <Box display="flex" gap={1} p={1.5} flexWrap="wrap" alignItems="center">
        <TextField select size="small" label="القسم" value={tbl} onChange={(e) => setTbl(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">الكل</MenuItem>{Object.entries(TBL_AR).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="بواسطة" value={who} onChange={(e) => setWho(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">الكل</MenuItem><MenuItem value="admin">المدراء</MenuItem><MenuItem value="system">النظام (الدفع/البوابة)</MenuItem>
        </TextField>
        <TextField size="small" label="بحث برقم الجوال أو المعرّف" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
        <IconButton onClick={() => setTick((t) => t + 1)}><RefreshIcon /></IconButton>
      </Box>
      {!rows ? <LinearProgress /> : rows.length === 0 ? (
        <Typography color="text.secondary" p={4} textAlign="center">لا يوجد نشاط مسجّل بعد — يبدأ التسجيل من لحظة تشغيل الملف</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>الوقت</TableCell><TableCell>بواسطة</TableCell><TableCell>العملية</TableCell><TableCell>العنصر</TableCell><TableCell>التغيير</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((r) => {
                const a = ACT_AR[r.action] || { t: r.action, c: 'info' as const };
                const ch = r.changes || {};
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Tooltip title={new Date(r.ts).toLocaleString('ar-SA')}><span>{ago(r.ts)}</span></Tooltip></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.actor === 'النظام' ? <Chip size="small" label="النظام" /> : <span dir="ltr">{r.actor}</span>}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={a.c} variant="outlined" label={`${a.t} · ${TBL_AR[r.tbl] || r.tbl}`} /></TableCell>
                    <TableCell dir="ltr" sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{(r.row_key || '—').slice(0, 14)}</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      {r.action === 'UPDATE' ? Object.entries(ch).slice(0, 6).map(([k, v]) => (
                        <Typography key={k} variant="caption" display="block">
                          <b>{FIELD_AR[k] || k}:</b> <span style={{ textDecoration: 'line-through', opacity: .6 }}>{show((v as any)[0])}</span> ← {show((v as any)[1])}
                        </Typography>
                      )) : (
                        <Typography variant="caption" color="text.secondary">
                          {show(ch.question || ch.name || ch.code || ch.title || ch.key || ch.mob)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
};

/* ══════ السعة والنمو ══════ */
type CapData = {
  db_size: number;
  tables: { name: string; bytes: number; rows: number }[];
  storage: { bucket: string; files: number; bytes: number }[];
  growth: { students?: number; by_month?: { m: string; n: number }[]; exams_30d?: number };
};
// حدود باقات Supabase المعروفة (تحقق من صفحة الأسعار عند الترقية)
const PLANS = [
  { name: 'Free', db: 500 * 1024 ** 2, storage: 1024 ** 3 },
  { name: 'Pro', db: 8 * 1024 ** 3, storage: 100 * 1024 ** 3 },
];
const Capacity = () => {
  const [d, setD] = useState<CapData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plan, setPlan] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setD(null); setErr(null);
    supabase.rpc('admin_capacity').then(({ data, error }) => {
      if (error) { setErr(missing(error.message) ? NEED_SQL : error.message); return; }
      setD(data as CapData);
    });
  }, [tick]);
  const m = useMemo(() => {
    if (!d) return null;
    const students = Number(d.growth?.students || 0);
    const storage = (d.storage || []).reduce((a, s) => a + Number(s.bytes || 0), 0);
    const studentTables = ['students', 'exam_results', 'chat_messages', 'audit_log', 'site_visits', 'pending_subs', 'payments', 'auth_fails', 'student_privacy'];
    const perStudentBytes = students ? (d.tables || []).filter((t) => studentTables.includes(t.name)).reduce((a, t) => a + Number(t.bytes), 0) / students : 0;
    const fixed = Math.max(0, d.db_size - perStudentBytes * students);
    const at = (n: number) => fixed + perStudentBytes * n;
    const months = d.growth?.by_month || [];
    const recent = months.slice(-3);
    const perMonth = recent.length ? recent.reduce((a, x) => a + x.n, 0) / recent.length : 0;
    return { students, storage, perStudentBytes, at, perMonth, months };
  }, [d]);
  if (err) return <Alert severity="info">{err}</Alert>;
  if (!d || !m) return <Skeleton variant="rounded" height={420} />;
  const P = PLANS[plan];
  const pct = (v: number, max: number) => Math.min(100, (v / max) * 100);
  const bar = (v: number, max: number) => (
    <LinearProgress variant="determinate" value={pct(v, max)} sx={{ height: 10, borderRadius: 5, mt: .75 }}
      color={v > max * .8 ? 'error' : v > max * .5 ? 'warning' : 'primary'} />
  );
  const targets = [m.students, 3000, 9000, 30000, 100000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).sort((a, b) => a - b);
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary" flex={1}>
          الحدود حسب باقة Supabase المختارة. التوقعات تقديرية من استهلاكك الحالي لكل طالب.
        </Typography>
        <TextField select size="small" label="باقة Supabase" value={plan} onChange={(e) => setPlan(Number(e.target.value))}>
          {PLANS.map((p, i) => <MenuItem key={p.name} value={i}>{p.name}</MenuItem>)}
        </TextField>
        <IconButton onClick={() => setTick((t) => t + 1)}><RefreshIcon /></IconButton>
      </Box>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Box display="flex" justifyContent="space-between"><Typography fontWeight={700}>قاعدة البيانات</Typography>
              <Typography variant="body2" color="text.secondary">{bytes(d.db_size)} من {bytes(P.db)}</Typography></Box>
            {bar(d.db_size, P.db)}
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Box display="flex" justifyContent="space-between"><Typography fontWeight={700}>الملفات والصور</Typography>
              <Typography variant="body2" color="text.secondary">{bytes(m.storage)} من {bytes(P.storage)}</Typography></Box>
            {bar(m.storage, P.storage)}
            <Typography variant="caption" color="text.secondary" display="block" mt={.75}>
              {(d.storage || []).map((s) => `${s.bucket}: ${fmt(s.files)} ملف`).join(' · ') || 'لا توجد ملفات بعد'}
            </Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><Mini t="الطلاب الآن" v={m.students} /></Grid>
        <Grid item xs={6} md={3}><Mini t="تسجيلات شهرياً (متوسط 3 أشهر)" v={Math.round(m.perMonth)} color="#0891b2" /></Grid>
        <Grid item xs={6} md={3}><Mini t="اختبارات آخر 30 يوماً" v={Number(d.growth?.exams_30d || 0)} color="#7c3aed" /></Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: '3px solid #059669', height: '100%' }}><CardContent>
            <Typography variant="body2" color="text.secondary">الحجم لكل طالب</Typography>
            <Typography variant="h5" fontWeight={800}>{m.perStudentBytes ? bytes(m.perStudentBytes) : '—'}</Typography>
            <Typography variant="caption" color="text.secondary">بياناته ونتائجه ورسائله</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Typography fontWeight={700} mb={1}>التوقعات حسب عدد الطلاب</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>الطلاب</TableCell><TableCell>حجم القاعدة المتوقع</TableCell><TableCell>{P.name}</TableCell></TableRow></TableHead>
              <TableBody>
                {targets.map((n) => {
                  const v = m.at(n); const ok = v < P.db * .8;
                  return (
                    <TableRow key={n} sx={n === m.students ? { bgcolor: 'action.selected' } : undefined}>
                      <TableCell>{fmt(n)}{n === m.students ? ' (الآن)' : ''}</TableCell>
                      <TableCell>{m.perStudentBytes ? bytes(v) : '—'}</TableCell>
                      <TableCell>{!m.perStudentBytes ? '—' : ok ? <Chip size="small" color="success" label="يكفي" /> : v < P.db ? <Chip size="small" color="warning" label="قريب من الحد" /> : <Chip size="small" color="error" label="يحتاج ترقية" />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              مع كثرة الاختبارات يكبر حجم كل طالب مع الوقت — راجع هذه الصفحة شهرياً.
            </Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}><CardContent>
            <Typography fontWeight={700} mb={1}>التسجيلات شهرياً — آخر 12 شهراً</Typography>
            {m.months.length === 0 ? <Typography color="text.secondary" py={6} textAlign="center">لا توجد بيانات</Typography> : (
              <Box height={240} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={m.months} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} reversed />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} orientation="right" />
                    <RTooltip formatter={(v: number) => [fmt(v), 'تسجيل']} />
                    <Bar dataKey="n" fill="#1a56db" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card><CardContent>
        <Typography fontWeight={700} mb={1}>أكبر الجداول</Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>الجدول</TableCell><TableCell>السجلات</TableCell><TableCell>الحجم</TableCell><TableCell sx={{ width: '40%' }} /></TableRow></TableHead>
          <TableBody>
            {(d.tables || []).slice(0, 12).map((t) => (
              <TableRow key={t.name} hover>
                <TableCell dir="ltr" sx={{ textAlign: 'right' }}>{t.name}</TableCell>
                <TableCell>{fmt(t.rows)}</TableCell>
                <TableCell>{bytes(t.bytes)}</TableCell>
                <TableCell><LinearProgress variant="determinate" value={pct(t.bytes, d.tables[0]?.bytes || 1)} sx={{ height: 6, borderRadius: 3 }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </Box>
  );
};

const Mini = ({ t, v, color = '#1a56db', loading }: { t: string; v: number; color?: string; loading?: boolean }) => (
  <Card sx={{ borderTop: `3px solid ${color}`, height: '100%' }}><CardContent>
    <Typography variant="body2" color="text.secondary">{t}</Typography>
    {loading ? <Skeleton width={60} height={36} /> : <Typography variant="h5" fontWeight={800}>{fmt(v)}</Typography>}
  </CardContent></Card>
);

