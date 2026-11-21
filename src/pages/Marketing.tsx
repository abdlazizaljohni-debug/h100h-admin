// ══════════════════════════════════════════════════════════════
//  h100h — التسويق · 2026-11-19 · إضافة
//  شرائح الطلاب للمتابعة (واتساب برسالة جاهزة + رسالة داخل المنصة)
//  أداء الكوبونات + إنشاء كوبون سريع · مصادر الزيارات · إعلان في البوابة
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Grid, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Chip, Alert, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Switch, LinearProgress,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ChatIcon from '@mui/icons-material/Chat';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CasinoIcon from '@mui/icons-material/Casino';
import { supabase } from '../supabaseClient';
import { statsRpc, MissingRpc } from '../adminStats';

const PLAN_AR: Record<string, string> = { monthly: 'شهري', quarter: 'ربع سنوي', semi: 'نصف سنوي', annual: 'سنوي', quarterly: 'ربع سنوي', yearly: 'سنوي' };
const fmt = (n: number) => Number(n || 0).toLocaleString('ar-SA');
const sar = (n: number) => `${Number(n || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ر.س`;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const wa = (mob: string, text: string) => `https://wa.me/966${mob.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;
const first = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || '';

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

type Person = { mob: string; name: string; detail: string };
type Segment = { id: string; title: string; desc: string; color: string; people: Person[]; template: string; count?: number };

const TPL_KEY = 'h100h-mkt-templates';
const DEFAULT_TPL: Record<string, string> = {
  pending: 'أهلاً {name} 👋\nلاحظنا إنك بدأت الاشتراك في منصة ركز وحل وما اكتمل. تحتاج مساعدة؟ نقدر نكمّله لك الحين{coupon_line}\nh100h.com',
  expiring: 'أهلاً {name} 🌟\nاشتراكك في ركز وحل ينتهي قريباً ({date}). جدّد الحين وكمّل مذاكرتك بدون انقطاع{coupon_line}\nh100h.com',
  expired: 'وحشتنا يا {name} 💙\nاشتراكك انتهى، وأضفنا اختبارات جديدة. ارجع لنا{coupon_line}\nh100h.com',
  hot: 'أهلاً {name} 👏\nشفنا مستواك ممتاز في الاختبارات المجانية! افتح كل الاختبارات والمواد مع الاشتراك{coupon_line}\nh100h.com',
  inactive: 'أهلاً {name} 👋\nصار لك فترة ما دخلت ركز وحل. جرّب اختبار اليوم — ما ياخذ أكثر من 10 دقائق ✏️\nh100h.com',
};
const loadTpl = (): Record<string, string> => { try { return { ...DEFAULT_TPL, ...JSON.parse(localStorage.getItem(TPL_KEY) || '{}') }; } catch { return DEFAULT_TPL; } };

export const MarketingPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Title title="التسويق" />
      <Typography variant="h5" fontWeight={800} mb={1}>التسويق والنمو</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="شرائح المتابعة" /><Tab label="الكوبونات" /><Tab label="مصادر الزيارات" /><Tab label="إعلان في البوابة" />
      </Tabs>
      {tab === 0 && <Segments />}
      {tab === 1 && <Coupons />}
      {tab === 2 && <Traffic />}
      {tab === 3 && <Announce />}
    </Box>
  );
};

/* ══════ الشرائح ══════ */
const Segments = () => {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{ st: any[]; pe: any[]; ex: any[] }>({ st: [], pe: [], ex: [] });
  const [sel, setSel] = useState('pending');
  const [tpl, setTpl] = useState<Record<string, string>>(loadTpl);
  const [coupon, setCoupon] = useState('');
  const [bulk, setBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [tick, setTick] = useState(0);
  // 2026-11-21: الحساب على الخادم (admin_marketing_segments) — الأعداد + قائمة الشريحة المختارة فقط
  const [srv, setSrv] = useState<{ counts: Record<string, number>; people: Record<string, any[]>; limit: number } | null>(null);
  const [segLoading, setSegLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        try {
          const r = await statsRpc<any>('admin_marketing_segments', { p_seg: sel, p_limit: 5000 });
          if (!alive) return;
          setSrv({ counts: r.counts || {}, people: { [sel]: r.people || [] }, limit: Number(r.limit || 5000) });
          return;
        } catch (e) {
          if (!(e instanceof MissingRpc)) throw e;
          if (alive) setSrv(null);
        }
        const since = new Date(Date.now() - 30 * 864e5).toISOString();
        const [st, pe, ex] = await Promise.all([
          fetchAll<any>('students', 'mob,name,grade,plan,active,sub_end,joined,created_at,last_login,role'),
          fetchAll<any>('pending_subs', 'mob,name,plan,grade,requested_at'),
          fetchAll<any>('exam_results', 'mob,pct,score,total,created_at', (q) => q.gte('created_at', since)).catch(() => []),
        ]);
        if (alive) setData({ st: st.filter((s) => (s.role || 'student') === 'student'), pe, ex });
      } catch (e: any) { if (alive) setErr(e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // تغيير الشريحة في وضع الخادم: نجيب قائمتها فقط
  useEffect(() => {
    if (!srv || srv.people[sel]) return;
    let alive = true;
    setSegLoading(true);
    statsRpc<any>('admin_marketing_segments', { p_seg: sel, p_limit: 5000 })
      .then((r) => { if (alive) setSrv((o) => (o ? { ...o, counts: r.counts || o.counts, people: { ...o.people, [sel]: r.people || [] } } : o)); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setSegLoading(false); });
    return () => { alive = false; };
  }, [sel, srv]);

  const segments: Segment[] = useMemo(() => {
    const t = today();
    if (srv) {
      const d = (s?: string) => (s ? new Date(s).toLocaleDateString('ar-SA') : '—');
      const P = (id: string, f: (x: any) => string): Person[] => (srv.people[id] || []).map((x) => ({ mob: x.mob, name: x.name, detail: f(x) }));
      const c = (id: string) => Number(srv.counts[id] || 0);
      return [
        { id: 'pending', title: 'اشتراك لم يكتمل', desc: 'طلبوا الاشتراك ولم يُفعَّل', color: '#d97706', count: c('pending'),
          people: P('pending', (x) => `${PLAN_AR[x.plan] || x.plan || ''} · ${d(x.date)}`), template: tpl.pending },
        { id: 'expiring', title: 'ينتهي خلال 7 أيام', desc: 'فرصة التجديد', color: '#dc2626', count: c('expiring'),
          people: P('expiring', (x) => `ينتهي ${d(x.date)}`), template: tpl.expiring },
        { id: 'expired', title: 'انتهى اشتراكه (30 يوماً)', desc: 'استرجاع المشتركين', color: '#7c3aed', count: c('expired'),
          people: P('expired', (x) => `انتهى ${d(x.date)}`), template: tpl.expired },
        { id: 'hot', title: 'مجانيون متفاعلون', desc: '3 اختبارات فأكثر خلال 30 يوماً وبدون اشتراك', color: '#059669', count: c('hot'),
          people: P('hot', (x) => `${fmt(x.n)} اختبار${x.avg != null ? ` · متوسط ${fmt(Math.round(Number(x.avg)))}٪` : ''}`), template: tpl.hot },
        { id: 'inactive', title: 'غير نشطين 14 يوماً', desc: 'سجّلوا ولم يدخلوا مؤخراً', color: '#64748b', count: c('inactive'),
          people: P('inactive', (x) => `آخر دخول ${d(x.date)}`), template: tpl.inactive },
      ];
    } const in7 = addDays(7); const ago30 = addDays(-30);
    const paid = (s: any) => s.plan && !['free', 'visitor'].includes(s.plan);
    const active = (s: any) => s.active && paid(s) && (!s.sub_end || s.sub_end >= t);
    const examsBy = new Map<string, { n: number; sum: number; c: number }>();
    data.ex.forEach((e) => {
      const r = examsBy.get(e.mob) || { n: 0, sum: 0, c: 0 }; r.n++;
      const p = e.pct != null && Number(e.pct) > 0 ? Number(e.pct) : Number(e.total) > 0 ? (Number(e.score) / Number(e.total)) * 100 : NaN;
      if (!isNaN(p)) { r.sum += p; r.c++; } examsBy.set(e.mob, r);
    });
    const d = (s?: string) => (s ? new Date(s).toLocaleDateString('ar-SA') : '—');
    const stuMobs = new Set(data.st.filter(active).map((s) => s.mob));
    return [
      { id: 'pending', title: 'اشتراك لم يكتمل', desc: 'طلبوا الاشتراك ولم يُفعَّل', color: '#d97706',
        people: data.pe.filter((p) => !stuMobs.has(p.mob)).map((p) => ({ mob: p.mob, name: p.name, detail: `${PLAN_AR[p.plan] || p.plan || ''} · ${d(p.requested_at)}` })), template: tpl.pending },
      { id: 'expiring', title: 'ينتهي خلال 7 أيام', desc: 'فرصة التجديد', color: '#dc2626',
        people: data.st.filter((s) => active(s) && s.sub_end && s.sub_end <= in7).map((s) => ({ mob: s.mob, name: s.name, detail: `ينتهي ${d(s.sub_end)}` })), template: tpl.expiring },
      { id: 'expired', title: 'انتهى اشتراكه (30 يوماً)', desc: 'استرجاع المشتركين', color: '#7c3aed',
        people: data.st.filter((s) => paid(s) && s.sub_end && s.sub_end < t && s.sub_end >= ago30).map((s) => ({ mob: s.mob, name: s.name, detail: `انتهى ${d(s.sub_end)}` })), template: tpl.expired },
      { id: 'hot', title: 'مجانيون متفاعلون', desc: '3 اختبارات فأكثر خلال 30 يوماً وبدون اشتراك', color: '#059669',
        people: data.st.filter((s) => !active(s) && (examsBy.get(s.mob)?.n || 0) >= 3).map((s) => {
          const r = examsBy.get(s.mob)!; return { mob: s.mob, name: s.name, detail: `${fmt(r.n)} اختبار${r.c ? ` · متوسط ${fmt(Math.round(r.sum / r.c))}٪` : ''}` };
        }).sort((a, b) => b.detail.localeCompare(a.detail)), template: tpl.hot },
      { id: 'inactive', title: 'غير نشطين 14 يوماً', desc: 'سجّلوا ولم يدخلوا مؤخراً', color: '#64748b',
        people: data.st.filter((s) => { const l = s.last_login || s.joined || s.created_at; return l && l < addDays(-14) && l >= addDays(-90); })
          .map((s) => ({ mob: s.mob, name: s.name, detail: `آخر دخول ${d(s.last_login || s.joined)}` })), template: tpl.inactive },
    ];
  }, [data, tpl, srv]);

  const seg = segments.find((s) => s.id === sel)!;
  const render = (p: Person) => seg.template
    .replace(/\{name\}/g, first(p.name))
    .replace(/\{date\}/g, p.detail.replace(/^[^\d٠-٩]*/, ''))
    .replace(/\{coupon_line\}/g, coupon ? ` — استخدم كوبون ${coupon} للخصم 🎁` : '.')
    .replace(/\{coupon\}/g, coupon);
  const saveTpl = (v: string) => { const n = { ...tpl, [sel]: v }; setTpl(n); try { localStorage.setItem(TPL_KEY, JSON.stringify(n)); } catch { /* */ } };

  const sendBulk = async () => {
    setBusy(true);
    const rows = seg.people.map((p) => ({
      student_mob: p.mob, student_name: p.name || '', from_role: 'admin', text: render(p),
      read_by_admin: true, read_by_student: false, ts: new Date().toISOString(),
    }));
    let ok = 0; let fail = '';
    for (let k = 0; k < rows.length; k += 200) {
      const { error } = await supabase.from('chat_messages').insert(rows.slice(k, k + 200));
      if (error) { fail = error.message; break; }
      ok += Math.min(200, rows.length - k);
    }
    setBusy(false); setBulk(false);
    if (fail) notify(`أُرسلت ${ok} ثم توقف: ${fail}`, { type: 'error' });
    else notify(`تم إرسال ${ok} رسالة داخل المنصة ✓`, { type: 'success' });
  };

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Grid container spacing={1.5} mb={2}>
        {segments.map((s) => (
          <Grid item xs={6} md={12 / 5 as any} key={s.id}>
            <Card onClick={() => setSel(s.id)} sx={{ cursor: 'pointer', height: '100%', borderTop: `3px solid ${s.color}`, outline: sel === s.id ? `2px solid ${s.color}` : 'none' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography variant="body2" fontWeight={700}>{s.title}</Typography>
                {loading ? <Skeleton width={50} height={36} /> : <Typography variant="h5" fontWeight={800}>{fmt(s.count ?? s.people.length)}</Typography>}
                <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={5}>
          <Card><CardContent>
            <Typography fontWeight={700} mb={1}>الرسالة — {seg.title}</Typography>
            <TextField fullWidth multiline minRows={5} value={seg.template} onChange={(e) => saveTpl(e.target.value)} />
            <Typography variant="caption" color="text.secondary" display="block" mt={.5}>
              {'{name}'} الاسم الأول · {'{date}'} التاريخ · {'{coupon_line}'} سطر الكوبون (يختفي إذا ما فيه كوبون)
            </Typography>
            <Box display="flex" gap={1} mt={1.5} alignItems="center">
              <TextField size="small" label="كوبون (اختياري)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} inputProps={{ dir: 'ltr' }} sx={{ flex: 1 }} />
              <Button size="small" onClick={() => saveTpl(DEFAULT_TPL[sel])}>الافتراضي</Button>
            </Box>
            {seg.people[0] && (
              <Box mt={2} p={1.5} sx={{ bgcolor: '#dcf8c6', borderRadius: 2, whiteSpace: 'pre-wrap', color: '#111' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={.5}>معاينة لـ {first(seg.people[0].name) || seg.people[0].mob}</Typography>
                <Typography variant="body2">{render(seg.people[0])}</Typography>
              </Box>
            )}
            <Button fullWidth variant="contained" startIcon={<ChatIcon />} sx={{ mt: 2 }} disabled={!seg.people.length} onClick={() => setBulk(true)}>
              إرسال للكل داخل المنصة ({fmt(seg.people.length)})
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" mt={.5}>تظهر للطالب في محادثة الدعم داخل حسابه.</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} lg={7}>
          <Card>
            <Box display="flex" alignItems="center" p={1.5} gap={1}>
              <Typography fontWeight={700} flex={1}>الطلاب ({fmt(seg.people.length)})</Typography>
              <Typography variant="caption" color="text.secondary">تم فتح {fmt(seg.people.filter((p) => sent[`${sel}:${p.mob}`]).length)}</Typography>
              <IconButton size="small" onClick={() => setTick((t) => t + 1)}><RefreshIcon fontSize="small" /></IconButton>
            </Box>
            {seg.count != null && seg.count > seg.people.length && !segLoading && (
              <Alert severity="info" sx={{ mx: 1.5, mb: 1 }}>تظهر أول {fmt(seg.people.length)} من {fmt(seg.count)} — الإرسال الجماعي يشمل الظاهرين فقط.</Alert>
            )}
            <Box sx={{ maxHeight: 560, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>الاسم</TableCell><TableCell>الجوال</TableCell><TableCell>التفاصيل</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {(loading || segLoading) ? <TableRow><TableCell colSpan={4}><LinearProgress /></TableCell></TableRow> :
                    seg.people.length === 0 ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا أحد في هذه الشريحة الآن ✓</TableCell></TableRow> :
                    seg.people.map((p) => {
                      const k = `${sel}:${p.mob}`;
                      return (
                        <TableRow key={p.mob} hover sx={{ opacity: sent[k] ? .55 : 1 }}>
                          <TableCell>{p.name || '—'}</TableCell>
                          <TableCell dir="ltr" sx={{ textAlign: 'right' }}>{p.mob}</TableCell>
                          <TableCell><Typography variant="caption">{p.detail}</Typography></TableCell>
                          <TableCell>
                            <Tooltip title="فتح واتساب بالرسالة">
                              <IconButton size="small" color="success" component="a" href={wa(p.mob, render(p))} target="_blank" rel="noopener"
                                onClick={() => setSent((s) => ({ ...s, [k]: true }))}><WhatsAppIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={bulk} onClose={busy ? undefined : () => setBulk(false)} dir="rtl">
        <DialogTitle>إرسال رسالة لـ {fmt(seg.people.length)} طالب؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2">سيستلم كل طالب في شريحة «{seg.title}» الرسالة باسمه داخل محادثة الدعم في حسابه. لا يمكن التراجع بعد الإرسال.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulk(false)} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={sendBulk} disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ══════ الكوبونات ══════ */
const Coupons = () => {
  const notify = useNotify();
  const [rows, setRows] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [srvRev, setSrvRev] = useState<Record<string, { n: number; sum: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', type: 'percent', value: 20, days: 7 });
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    (async () => {
      setLoading(true);
      // 2026-11-21: إيراد الكوبونات من الخادم (admin_coupon_revenue)، والطريقة القديمة احتياط
      const revP = statsRpc<any[]>('admin_coupon_revenue').then((r) => {
        const m: Record<string, { n: number; sum: number }> = {};
        (r || []).forEach((x) => { m[String(x.code).toUpperCase()] = { n: Number(x.n || 0), sum: Number(x.sum || 0) }; });
        return m;
      }).catch(() => null);
      const [{ data: c }, sr] = await Promise.all([
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        revP,
      ]);
      const p = sr ? [] : await fetchAll<any>('payments', 'coupon,amount,status').catch(() => []);
      setRows(c || []); setSrvRev(sr); setPays(p); setLoading(false);
    })();
  }, [tick]);
  const rev = useMemo(() => {
    if (srvRev) return srvRev;
    const m: Record<string, { n: number; sum: number }> = {};
    pays.filter((p) => p.status === 'activated' && p.coupon).forEach((p) => {
      const k = String(p.coupon).toUpperCase(); m[k] = m[k] || { n: 0, sum: 0 }; m[k].n++; m[k].sum += Number(p.amount || 0);
    });
    return m;
  }, [pays, srvRev]);
  const gen = () => {
    const words = ['RKZ', 'HALL', 'NAJAH', 'TOP', 'BACK', 'STAR'];
    setForm({ ...form, code: `${words[Math.floor(Math.random() * words.length)]}${form.value}${Math.random().toString(36).slice(2, 5).toUpperCase()}` });
  };
  const create = async () => {
    setBusy(true);
    const { error } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(), type: form.type, value: Number(form.value), active: true,
      expiry: form.days > 0 ? addDays(form.days) : null,
    });
    setBusy(false);
    if (error) { notify(`تعذّر الإنشاء: ${error.message}`, { type: 'error' }); return; }
    notify('تم إنشاء الكوبون ✓', { type: 'success' }); setForm({ ...form, code: '' }); setTick((t) => t + 1);
  };
  const toggle = async (c: any) => {
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('code', c.code);
    if (error) notify(error.message, { type: 'error' }); else setTick((t) => t + 1);
  };
  const t = today();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={4}>
        <Card><CardContent>
          <Typography fontWeight={700} mb={1.5}>كوبون سريع</Typography>
          <Box display="flex" gap={1} mb={1.5}>
            <TextField fullWidth size="small" label="الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} inputProps={{ dir: 'ltr' }} />
            <Tooltip title="توليد كود"><IconButton onClick={gen}><CasinoIcon /></IconButton></Tooltip>
          </Box>
          <Box display="flex" gap={1} mb={1.5}>
            <TextField select size="small" label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} sx={{ flex: 1 }}>
              <MenuItem value="percent">نسبة ٪</MenuItem><MenuItem value="fixed">مبلغ ر.س</MenuItem>
            </TextField>
            <TextField size="small" type="number" label="القيمة" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} sx={{ flex: 1 }} />
          </Box>
          <TextField select fullWidth size="small" label="الصلاحية" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} sx={{ mb: 1.5 }}>
            {[[1, 'يوم واحد'], [3, '3 أيام'], [7, 'أسبوع'], [14, 'أسبوعين'], [30, 'شهر'], [0, 'بدون انتهاء']].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <Button fullWidth variant="contained" onClick={create} disabled={busy || form.code.trim().length < 3 || !(form.value > 0) || (form.type === 'percent' && form.value > 100)}>إنشاء</Button>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>استخدمه مع شرائح المتابعة في رسائل الواتساب.</Typography>
        </CardContent></Card>
      </Grid>
      <Grid item xs={12} lg={8}>
        <Card><Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الكود</TableCell><TableCell>الخصم</TableCell><TableCell>الانتهاء</TableCell><TableCell>الاستخدام</TableCell><TableCell>إيراد عبره</TableCell><TableCell>مفعّل</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}><LinearProgress /></TableCell></TableRow> :
                rows.map((c) => {
                  const expired = c.expiry && c.expiry < t;
                  const r = rev[String(c.code).toUpperCase()];
                  return (
                    <TableRow key={c.code} hover>
                      <TableCell dir="ltr" sx={{ textAlign: 'right', fontWeight: 700 }}>
                        {c.code}
                        <IconButton size="small" onClick={() => { navigator.clipboard?.writeText(c.code); notify('نُسخ'); }}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton>
                      </TableCell>
                      <TableCell>{c.type === 'percent' ? `${fmt(c.value)}٪` : c.type === 'fixed' ? sar(c.value) : c.type}</TableCell>
                      <TableCell>{c.expiry ? <Chip size="small" color={expired ? 'default' : 'info'} variant="outlined" label={expired ? 'منتهٍ' : new Date(c.expiry).toLocaleDateString('ar-SA')} /> : '—'}</TableCell>
                      <TableCell>{fmt(c.used || 0)}</TableCell>
                      <TableCell>{r ? `${sar(r.sum)} (${fmt(r.n)})` : '—'}</TableCell>
                      <TableCell><Switch size="small" checked={!!c.active} onChange={() => toggle(c)} /></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Box></Card>
      </Grid>
    </Grid>
  );
};

/* ══════ مصادر الزيارات ══════ */
const Traffic = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  // 2026-11-21: التجميع على الخادم (admin_traffic_stats)، والطريقة القديمة احتياط
  const [srv, setSrv] = useState<any | null>(null);
  useEffect(() => {
    setLoading(true); setErr(null);
    statsRpc<any>('admin_traffic_stats', { p_days: days })
      .then((r) => { setSrv(r); setRows([]); setLoading(false); })
      .catch((e) => {
        if (!(e instanceof MissingRpc)) { setErr(e.message); setLoading(false); return; }
        setSrv(null);
    fetchAll<any>('site_visits', 'referrer,page,device_type,session_id,created_at', (q) => q.gte('created_at', new Date(Date.now() - days * 864e5).toISOString()))
      .then(setRows).catch((e2) => setErr(e2.message)).finally(() => setLoading(false));
      });
  }, [days]);
  const m = useMemo(() => {
    const src = (r: string) => {
      if (!r) return 'مباشر / رابط محفوظ';
      try {
        const h = new URL(r).hostname.replace(/^www\./, '');
        if (/h100h\.com$/.test(h)) return 'داخلي';
        if (/google\./.test(h)) return 'Google';
        if (/(t\.co|twitter|x\.com)/.test(h)) return 'X (تويتر)';
        if (/(instagram)/.test(h)) return 'Instagram';
        if (/(tiktok)/.test(h)) return 'TikTok';
        if (/(snapchat)/.test(h)) return 'Snapchat';
        if (/(whatsapp|wa\.me)/.test(h)) return 'WhatsApp';
        if (/(facebook|fb\.)/.test(h)) return 'Facebook';
        if (/(youtube)/.test(h)) return 'YouTube';
        if (/bing\./.test(h)) return 'Bing';
        return h;
      } catch { return r.slice(0, 40); }
    };
    const count = (f: (r: any) => string) => {
      const c: Record<string, number> = {}; rows.forEach((r) => { const k = f(r); c[k] = (c[k] || 0) + 1; });
      return Object.entries(c).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
    };
    if (srv) {
      const c: Record<string, number> = {};
      (srv.referrers || []).forEach((x: any) => { const k = src(x.k); c[k] = (c[k] || 0) + Number(x.n || 0); });
      return {
        sources: Object.entries(c).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).filter((x) => x.k !== 'داخلي'),
        pages: ((srv.pages || []) as any[]).map((x) => ({ k: String(x.k), n: Number(x.n || 0) })),
        sessions: Number(srv.sessions || 0), visits: Number(srv.visits || 0),
      };
    }
    return { sources: count((r) => src(r.referrer)).filter((x) => x.k !== 'داخلي'), pages: count((r) => r.page || '/').slice(0, 10), sessions: new Set(rows.map((r) => r.session_id)).size, visits: rows.length };
  }, [rows, srv]);
  const Bars = ({ items, color }: { items: { k: string; n: number }[]; color: string }) => {
    const max = Math.max(1, ...items.map((i) => i.n));
    return (
      <Box display="flex" flexDirection="column" gap={1}>
        {items.length === 0 && <Typography color="text.secondary" py={3} textAlign="center">لا توجد بيانات</Typography>}
        {items.slice(0, 10).map((i) => (
          <Box key={i.k}>
            <Box display="flex" justifyContent="space-between"><Typography variant="body2" noWrap dir="auto">{i.k}</Typography><Typography variant="body2">{fmt(i.n)}</Typography></Box>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover' }}><Box sx={{ height: '100%', width: `${(i.n / max) * 100}%`, bgcolor: color, borderRadius: 4 }} /></Box>
          </Box>
        ))}
      </Box>
    );
  };
  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Box display="flex" gap={1} alignItems="center" mb={2}>
        <Chip label={`${fmt(m.visits)} زيارة · ${fmt(m.sessions)} جلسة`} />
        <Box flex={1} />
        <TextField select size="small" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <MenuItem value={7}>آخر 7 أيام</MenuItem><MenuItem value={30}>آخر 30 يوماً</MenuItem><MenuItem value={90}>آخر 90 يوماً</MenuItem>
        </TextField>
      </Box>
      {loading ? <Skeleton variant="rounded" height={300} /> : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><Card><CardContent><Typography fontWeight={700} mb={1.5}>من وين يجون الزوار؟</Typography><Bars items={m.sources} color="#1a56db" /></CardContent></Card></Grid>
          <Grid item xs={12} md={6}><Card><CardContent><Typography fontWeight={700} mb={1.5}>أكثر الصفحات زيارة</Typography><Bars items={m.pages} color="#7c3aed" /></CardContent></Card></Grid>
        </Grid>
      )}
      <Alert severity="info" sx={{ mt: 2 }}>
        نصيحة: أضف <b dir="ltr">?ref=tiktok</b> أو <b dir="ltr">?ref=snap</b> لروابطك في الإعلانات والبايو، عشان تعرف أي منصة تجيب طلاب أكثر.
      </Alert>
    </Box>
  );
};

/* ══════ إعلان في البوابة ══════ */
const Announce = () => {
  const notify = useNotify();
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ title: '', body: '', type: 'announcement' });
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }) => setRows(data || []));
  }, [tick]);
  const create = async () => {
    setBusy(true);
    const { error } = await supabase.from('notifications').insert({ title: f.title.trim(), body: f.body.trim(), type: f.type, target: 'all', active: true });
    setBusy(false);
    if (error) { notify(`تعذّر النشر: ${error.message}`, { type: 'error' }); return; }
    notify('نُشر الإعلان ✓', { type: 'success' }); setF({ ...f, title: '', body: '' }); setTick((t) => t + 1);
  };
  const toggle = async (n: any) => {
    const { error } = await supabase.from('notifications').update({ active: !n.active }).eq('id', n.id);
    if (error) notify(error.message, { type: 'error' }); else setTick((t) => t + 1);
  };
  const activeN = rows.filter((r) => r.active).length;
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={5}>
        <Card><CardContent>
          <Typography fontWeight={700} mb={.5}>إعلان جديد</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>يظهر أعلى صفحة الطالب في البوابة (آخر 3 إعلانات مفعّلة).</Typography>
          <TextField fullWidth size="small" label="العنوان" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} sx={{ mb: 1.5 }} />
          <TextField fullWidth multiline minRows={3} label="النص" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} sx={{ mb: 1.5 }} />
          <TextField select fullWidth size="small" label="النوع" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} sx={{ mb: 1.5 }}>
            <MenuItem value="announcement">إعلان</MenuItem><MenuItem value="info">معلومة</MenuItem><MenuItem value="success">خبر سار</MenuItem><MenuItem value="warning">تنبيه</MenuItem>
          </TextField>
          {(f.title || f.body) && (
            <Box sx={{ display: 'flex', gap: 1.5, bgcolor: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: 3, p: 1.5, mb: 1.5, color: '#1e1b4b' }}>
              <Box><Typography fontWeight={800} variant="body2">{f.title}</Typography><Typography variant="body2">{f.body}</Typography></Box>
            </Box>
          )}
          <Button fullWidth variant="contained" onClick={create} disabled={busy || !f.title.trim()}>نشر في البوابة</Button>
        </CardContent></Card>
      </Grid>
      <Grid item xs={12} lg={7}>
        <Card>
          <Box p={1.5}><Typography fontWeight={700}>الإعلانات ({fmt(activeN)} مفعّل)</Typography></Box>
          <Table size="small">
            <TableHead><TableRow><TableCell>العنوان</TableCell><TableCell>التاريخ</TableCell><TableCell>مفعّل</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((n) => (
                <TableRow key={n.id} hover>
                  <TableCell><b>{n.title}</b><Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ maxWidth: 360 }}>{n.body}</Typography></TableCell>
                  <TableCell>{n.created_at ? new Date(n.created_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell><Switch size="small" checked={!!n.active} onChange={() => toggle(n)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Grid>
    </Grid>
  );
};
