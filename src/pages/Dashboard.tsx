import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, Typography, Grid, Box, Chip, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, Tabs, Tab,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PaymentsIcon from '@mui/icons-material/Payments';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import InsightsIcon from '@mui/icons-material/Insights';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from 'recharts';
import { useNotify } from 'react-admin';
import { supabase } from '../supabaseClient';
import { TechTab, SecurityTab, DevTab } from './DashboardInsights';
import { statsRpc, MissingRpc } from '../adminStats';

/* ── أدوات ── */
const FREE = new Set(['free', 'visitor', 'زائر', '', null as unknown as string]);
const PLAN_AR: Record<string, string> = {
  monthly: 'شهري', quarter: 'ربع سنوي', semi: 'نصف سنوي', annual: 'سنوي',
  quarterly: 'ربع سنوي', yearly: 'سنوي', basic: 'عادي', bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي',
};
const normPlan = (p?: string | null) =>
  p === 'quarterly' ? 'quarter' : p === 'yearly' ? 'annual' : p === 'semi_annual' ? 'semi' : (p || '');
const fmt = (n: number) => n.toLocaleString('ar-SA');
const sar = (n: number) => `${n.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س`;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const shortDay = (k: string) => { const [, m, d] = k.split('-'); return `${Number(d)}/${Number(m)}`; };
const todayStr = () => dayKey(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

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

type Student = { mob: string; name: string | null; plan: string | null; active: boolean | null; sub_end: string | null; joined: string | null; created_at?: string | null; role?: string | null; grade?: number | null };
type Pending = { mob: string; name: string | null; plan: string | null; grade: number | null; requested_at: string | null };
type Payment = { id: string; amount: number | null; status: string | null; created_at: string | null };
type Exam = { created_at: string; pct?: number | null; correct?: number | null; wrong?: number | null; score?: number | null; total?: number | null };

/* ── بطاقة رقم ── */
const Kpi = ({ title, value, sub, icon, color, loading }: {
  title: string; value: string; sub?: string; icon: React.ReactNode; color: string; loading: boolean;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ bgcolor: `${color}1A`, color, borderRadius: 2, width: 52, height: 52, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box minWidth={0}>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        {loading ? <Skeleton width={80} height={36} /> :
          <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>}
        {sub && !loading && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </CardContent>
  </Card>
);

const Panel = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {action}
      </Box>
      {children}
    </CardContent>
  </Card>
);

/* ── نافذة التفعيل (مشتركة مع صفحة الاشتراكات المعلقة) ── */
export const ActivateDialog = ({ row, onClose, onDone }: {
  row: { mob: string; name?: string | null; plan?: string | null; grade?: number | null } | null;
  onClose: () => void; onDone: () => void;
}) => {
  const notify = useNotify();
  const [plan, setPlan] = useState('annual');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const p = normPlan(row?.plan);
    setPlan(['monthly', 'quarter', 'semi', 'annual'].includes(p) ? p : 'annual');
  }, [row]);
  if (!row) return null;
  const go = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_activate_subscription', {
      p_mob: row.mob, p_plan: plan, p_name: row.name || null, p_grade: row.grade || null,
    });
    setBusy(false);
    if (error) { notify(`تعذّر التفعيل: ${error.message}`, { type: 'error' }); return; }
    notify(String(data || 'تم التفعيل'), { type: 'success' });
    onDone(); onClose();
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} dir="rtl" maxWidth="xs" fullWidth>
      <DialogTitle>تفعيل اشتراك</DialogTitle>
      <DialogContent>
        <Typography variant="body2" mb={2}>
          {row.name || '—'} · <b dir="ltr">{row.mob}</b>
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="act-plan">الباقة</InputLabel>
          <Select labelId="act-plan" label="الباقة" value={plan} onChange={(e) => setPlan(String(e.target.value))}>
            <MenuItem value="monthly">شهري (شهر)</MenuItem>
            <MenuItem value="quarter">ربع سنوي (3 أشهر)</MenuItem>
            <MenuItem value="semi">نصف سنوي (6 أشهر)</MenuItem>
            <MenuItem value="annual">سنوي (12 شهراً)</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
          إن كان للطالب اشتراك ساري تُضاف المدة إلى نهايته. تُنقل كلمة المرور التي اختارها وقت الاشتراك.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" color="success" onClick={go} disabled={busy}>{busy ? 'جارٍ التفعيل...' : 'تفعيل'}</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── نظرة عامة ── */
const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activate, setActivate] = useState<Pending | null>(null);
  const [tick, setTick] = useState(0);
  // 2026-11-21: الأرقام من الخادم (admin_overview_stats). null = الطريقة القديمة
  const [srv, setSrv] = useState<any | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        try {
          const r = await statsRpc<any>('admin_overview_stats');
          if (!alive) return;
          setSrv(r); setPending((r.pending || []) as Pending[]);
          return;
        } catch (e) {
          if (!(e instanceof MissingRpc)) throw e;
          if (alive) setSrv(null);
        }
        const since30 = daysAgo(29).toISOString();
        const [st, pe, pa, ex] = await Promise.all([
          fetchAll<Student>('students', 'mob,name,plan,active,sub_end,joined,created_at,role,grade'),
          fetchAll<Pending>('pending_subs', 'mob,name,plan,grade,requested_at', (q) => q.order('requested_at', { ascending: false })),
          fetchAll<Payment>('payments', 'id,amount,status,created_at').catch(() => [] as Payment[]),
          fetchAll<Exam>('exam_results', '*', (q) => q.gte('created_at', since30)).catch(() => [] as Exam[]),
        ]);
        if (!alive) return;
        setStudents(st.filter((s) => (s.role || 'student') === 'student'));
        setPending(pe); setPayments(pa); setExams(ex);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'خطأ في جلب البيانات');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tick]);

  const m = useMemo(() => {
    if (srv) {
      const byPlan: Record<string, number> = {};
      (srv.plans || []).forEach((p: any) => { const k = PLAN_AR[normPlan(p.plan)] || p.plan || '—'; byPlan[k] = (byPlan[k] || 0) + Number(p.n || 0); });
      const total = Number(srv.total || 0); const subscribedCount = Number(srv.subscribed || 0);
      return {
        total, subscribedCount, expiringCount: Number(srv.expiring_count || 0), pendingCount: Number(srv.pending_count || 0),
        expiringSoon: (srv.expiring || []) as Student[], newWeek: Number(srv.new_week || 0),
        revMonth: Number(srv.rev_month || 0), revTotal: Number(srv.rev_total || 0), review: Number(srv.review || 0),
        planData: Object.entries(byPlan).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        signups: (srv.signups || []).map((x: any) => ({ day: shortDay(String(x.d)), value: Number(x.n || 0) })),
        examsDaily: (srv.exams_daily || []).map((x: any) => ({ day: shortDay(String(x.d)), value: Number(x.n || 0) })),
        examsToday: Number(srv.exams_today || 0), avgPct: srv.avg_pct == null ? null : Math.round(Number(srv.avg_pct)),
        conv: total ? Math.round((subscribedCount / total) * 1000) / 10 : 0,
      };
    }
    const today = todayStr();
    const in7 = dayKey(new Date(Date.now() + 7 * 864e5));
    const wk = dayKey(daysAgo(6));
    const monthStart = dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const joinedKey = (s: Student) => (s.joined || s.created_at || '').slice(0, 10);

    const subscribed = students.filter((s) => s.active && !FREE.has(s.plan || '') && (!s.sub_end || s.sub_end.slice(0, 10) >= today));
    const expiringSoon = subscribed
      .filter((s) => s.sub_end && s.sub_end.slice(0, 10) <= in7)
      .sort((a, b) => (a.sub_end || '').localeCompare(b.sub_end || ''));
    const newWeek = students.filter((s) => joinedKey(s) >= wk).length;

    const paid = payments.filter((p) => p.status === 'activated');
    const revMonth = paid.filter((p) => (p.created_at || '').slice(0, 10) >= monthStart).reduce((a, p) => a + Number(p.amount || 0), 0);
    const revTotal = paid.reduce((a, p) => a + Number(p.amount || 0), 0);
    const review = payments.filter((p) => ['underpaid', 'needs_review', 'error'].includes(p.status || '')).length;

    const byPlan: Record<string, number> = {};
    subscribed.forEach((s) => { const k = PLAN_AR[normPlan(s.plan)] || s.plan || '—'; byPlan[k] = (byPlan[k] || 0) + 1; });
    const planData = Object.entries(byPlan).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const days: string[] = []; for (let i = 29; i >= 0; i--) days.push(dayKey(daysAgo(i)));
    const joinCount: Record<string, number> = {}; students.forEach((s) => { const k = joinedKey(s); if (k) joinCount[k] = (joinCount[k] || 0) + 1; });
    const signups = days.map((k) => ({ day: shortDay(k), value: joinCount[k] || 0 }));

    const examCount: Record<string, number> = {}; exams.forEach((e) => { const k = (e.created_at || '').slice(0, 10); examCount[k] = (examCount[k] || 0) + 1; });
    const examsDaily = days.slice(-14).map((k) => ({ day: shortDay(k), value: examCount[k] || 0 }));
    const examsToday = examCount[today] || 0;
    const pcts = exams.map((e) => {
      if (e.pct != null) return Number(e.pct);
      const t = Number(e.total ?? ((e.correct || 0) + (e.wrong || 0)));
      const c = Number(e.score ?? e.correct ?? 0);
      return t > 0 ? (c / t) * 100 : NaN;
    }).filter((x) => !isNaN(x));
    const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    const conv = students.length ? Math.round((subscribed.length / students.length) * 1000) / 10 : 0;

    return {
      total: students.length, subscribedCount: subscribed.length, expiringCount: expiringSoon.length, pendingCount: pending.length,
      expiringSoon, newWeek, revMonth, revTotal, review, planData, signups, examsDaily, examsToday, avgPct, conv,
    };
  }, [srv, students, payments, exams, pending]);

  return (
    <Box>
      <Box mb={2} display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="h6" fontWeight={800}>نظرة عامة</Typography>
        <Box flex={1} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => setTick((t) => t + 1)} disabled={loading}>تحديث</Button>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="إجمالي الطلاب" value={fmt(m.total)} sub={`+${fmt(m.newWeek)} هذا الأسبوع`} icon={<PeopleIcon />} color="#1a56db" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="مشتركون نشطون" value={fmt(m.subscribedCount)} sub={`نسبة التحويل ${m.conv.toLocaleString('ar-SA')}٪`} icon={<WorkspacePremiumIcon />} color="#7c3aed" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="طلبات بانتظار التفعيل" value={fmt(m.pendingCount)} sub={m.review ? `${fmt(m.review)} دفعة تحتاج مراجعة` : undefined} icon={<PendingActionsIcon />} color="#d97706" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="إيراد هذا الشهر" value={sar(m.revMonth)} sub={`الإجمالي ${sar(m.revTotal)}`} icon={<PaymentsIcon />} color="#059669" /></Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="تسجيلات جديدة (7 أيام)" value={fmt(m.newWeek)} icon={<PersonAddIcon />} color="#0891b2" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="اختبارات اليوم" value={fmt(m.examsToday)} icon={<AssignmentTurnedInIcon />} color="#2563eb" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="اشتراكات تنتهي خلال 7 أيام" value={fmt(m.expiringCount)} icon={<EventBusyIcon />} color="#dc2626" /></Grid>
        <Grid item xs={12} sm={6} lg={3}><Kpi loading={loading} title="متوسط الدرجات (30 يوماً)" value={m.avgPct == null ? '—' : `${m.avgPct.toLocaleString('ar-SA')}٪`} icon={<InsightsIcon />} color="#9333ea" /></Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={8}>
          <Panel title="التسجيلات الجديدة — آخر 30 يوماً">
            {loading ? <Skeleton variant="rounded" height={240} /> : (
              <Box height={240} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={m.signups} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={2} reversed />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} orientation="right" />
                    <Tooltip formatter={(v: number) => [fmt(v), 'تسجيل']} />
                    <Bar dataKey="value" fill="#1a56db" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Panel title="المشتركون حسب الباقة">
            {loading ? <Skeleton variant="rounded" height={240} /> : m.planData.length === 0 ? (
              <Typography color="text.secondary" py={8} textAlign="center">لا يوجد مشتركون نشطون بعد</Typography>
            ) : (
              <Box height={240} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={m.planData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} orientation="right" />
                    <Tooltip formatter={(v: number) => [fmt(v), 'مشترك']} />
                    <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={6}>
          <Panel title="الاختبارات — آخر 14 يوماً">
            {loading ? <Skeleton variant="rounded" height={220} /> : (
              <Box height={220} dir="ltr">
                <ResponsiveContainer>
                  <LineChart data={m.examsDaily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} reversed />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} orientation="right" />
                    <Tooltip formatter={(v: number) => [fmt(v), 'اختبار']} />
                    <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Panel title="بانتظار التفعيل" action={<Button size="small" href="#/pendingSubs">عرض الكل</Button>}>
            {loading ? <Skeleton variant="rounded" height={220} /> : pending.length === 0 ? (
              <Typography color="text.secondary" py={6} textAlign="center">لا توجد طلبات معلّقة ✓</Typography>
            ) : (
              <Table size="small">
                <TableHead><TableRow><TableCell>الطالب</TableCell><TableCell>الباقة</TableCell><TableCell>التاريخ</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {pending.slice(0, 6).map((p) => (
                    <TableRow key={p.mob} hover>
                      <TableCell><b>{p.name || '—'}</b><br /><span dir="ltr" style={{ fontSize: 12, opacity: .7 }}>{p.mob}</span></TableCell>
                      <TableCell>{PLAN_AR[normPlan(p.plan)] || p.plan || '—'}</TableCell>
                      <TableCell>{p.requested_at ? new Date(p.requested_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                      <TableCell align="left"><Button size="small" variant="contained" color="success" onClick={() => setActivate(p)}>تفعيل</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </Grid>
      </Grid>

      <Panel title="اشتراكات تنتهي خلال 7 أيام">
        {loading ? <Skeleton variant="rounded" height={120} /> : m.expiringSoon.length === 0 ? (
          <Typography color="text.secondary" py={3} textAlign="center">لا توجد اشتراكات قريبة الانتهاء</Typography>
        ) : (
          <Table size="small">
            <TableHead><TableRow><TableCell>الطالب</TableCell><TableCell>الجوال</TableCell><TableCell>الباقة</TableCell><TableCell>ينتهي</TableCell></TableRow></TableHead>
            <TableBody>
              {m.expiringSoon.slice(0, 15).map((s) => (
                <TableRow key={s.mob} hover>
                  <TableCell>{s.name || '—'}</TableCell>
                  <TableCell dir="ltr" sx={{ textAlign: 'right' }}>{s.mob}</TableCell>
                  <TableCell>{PLAN_AR[normPlan(s.plan)] || s.plan}</TableCell>
                  <TableCell>{s.sub_end ? new Date(s.sub_end).toLocaleDateString('ar-SA') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <ActivateDialog row={activate} onClose={() => setActivate(null)} onDone={() => setTick((t) => t + 1)} />
    </Box>
  );
};

/* ── لوحة التحكم: تبويبات (2026-11-19) ── */
const TAB_KEY = 'h100h-dash-tab';
const TABS = ['نظرة عامة', 'تقني', 'أمني', 'تطويري'];
export const Dashboard = () => {
  const [tab, setTab] = useState<number>(() => {
    try { const n = Number(localStorage.getItem(TAB_KEY)); return n >= 0 && n < TABS.length ? n : 0; } catch { return 0; }
  });
  const pick = (n: number) => { setTab(n); try { localStorage.setItem(TAB_KEY, String(n)); } catch { /* */ } };
  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Box mb={1} display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="h5" fontWeight={800}>لوحة التحكم</Typography>
        <Chip label="h100h.com" color="primary" size="small" />
      </Box>
      <Tabs value={tab} onChange={(_, v) => pick(v)} variant="scrollable" allowScrollButtonsMobile
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => <Tab key={t} label={t} sx={{ fontWeight: 700 }} />)}
      </Tabs>
      {tab === 0 && <Overview />}
      {tab === 1 && <TechTab />}
      {tab === 2 && <SecurityTab />}
      {tab === 3 && <DevTab />}
    </Box>
  );
};
