// ══════════════════════════════════════════════════════════════
//  h100h — صندوق الرسائل (محادثات الطلاب مع الإدارة) · 2026-11-19 · إضافة
//  واجهة مثل واتساب: قائمة المحادثات + المحادثة + معلومات الطالب
//  ردود جاهزة · غير مقروء · لم يُرد عليه · تحديث تلقائي كل 15 ثانية
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box, Card, Typography, TextField, Button, Avatar, Badge, Chip, IconButton, Divider,
  ToggleButtonGroup, ToggleButton, CircularProgress, Menu, MenuItem, Tooltip, Alert, useMediaQuery,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltIcon from '@mui/icons-material/Bolt';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../supabaseClient';
import { ActivateDialog } from './Dashboard';

type Msg = {
  id: number | string; student_mob: string; student_name: string | null;
  from_role: 'student' | 'admin'; text: string; read_by_admin: boolean; read_by_student: boolean; ts: string;
};
type Conv = { mob: string; name: string; last: Msg; unread: number; total: number; waiting: boolean };

const PLAN_AR: Record<string, string> = { monthly: 'شهري', quarter: 'ربع سنوي', semi: 'نصف سنوي', annual: 'سنوي', quarterly: 'ربع سنوي', yearly: 'سنوي' };
const GRADE_AR: Record<number, string> = {
  1: 'أول ابتدائي', 2: 'ثاني ابتدائي', 3: 'ثالث ابتدائي', 4: 'رابع ابتدائي', 5: 'خامس ابتدائي', 6: 'سادس ابتدائي',
  7: 'أول متوسط', 8: 'ثاني متوسط', 9: 'ثالث متوسط', 10: 'أول ثانوي', 11: 'ثاني ثانوي', 12: 'ثالث ثانوي', 13: 'جامعي', 14: 'موظف',
};
const wa = (mob: string, text = '') => `https://wa.me/966${mob.replace(/^0/, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const ago = (s: string) => {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 60); if (h < 24) return `${h} س`;
  const d = Math.round(h / 24); return d < 30 ? `${d} يوم` : new Date(s).toLocaleDateString('ar-SA');
};

const TPL_KEY = 'h100h-quick-replies';
const DEFAULT_TPL = [
  'أهلاً {name} 👋 كيف أقدر أساعدك؟',
  'تم تفعيل اشتراكك بنجاح ✅ بالتوفيق يا {name}!',
  'لاستعادة كلمة المرور اضغط «نسيت كلمة المرور» في صفحة الدخول، وتوصلك كلمة مؤقتة على الواتساب.',
  'نعتذر عن الإزعاج، فريقنا يراجع المشكلة الآن وبنرد عليك قريباً 🙏',
  'تقدر تشترك من صفحة الباقات داخل حسابك، والدفع إلكتروني وآمن 💳',
  'شكراً لتواصلك يا {name} 🌟',
];
const loadTpl = (): string[] => { try { const v = JSON.parse(localStorage.getItem(TPL_KEY) || 'null'); return Array.isArray(v) && v.length ? v : DEFAULT_TPL; } catch { return DEFAULT_TPL; } };

export const ChatInboxPage = () => {
  const notify = useNotify();
  const mobile = useMediaQuery('(max-width:900px)');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'waiting'>('all');
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [lastExam, setLastExam] = useState<any>(null);
  const [tplAnchor, setTplAnchor] = useState<HTMLElement | null>(null);
  const [tpl, setTpl] = useState<string[]>(loadTpl);
  const [activate, setActivate] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const since = new Date(Date.now() - 120 * 864e5).toISOString();
    const out: Msg[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await supabase.from('chat_messages').select('*').gte('ts', since)
        .order('ts', { ascending: true }).range(from, from + 999);
      if (error) { setErr(error.message); break; }
      out.push(...((data || []) as Msg[]));
      if (!data || data.length < 1000) break;
    }
    setMsgs(out);
    if (!silent) setLoading(false);
  };
  useEffect(() => { load(); const t = setInterval(() => load(true), 15000); return () => clearInterval(t); }, []);

  const convs: Conv[] = useMemo(() => {
    const map = new Map<string, Conv>();
    msgs.forEach((m) => {
      const c = map.get(m.student_mob) || { mob: m.student_mob, name: '', last: m, unread: 0, total: 0, waiting: false };
      c.total++; c.last = m;
      if (m.student_name && m.from_role === 'student') c.name = m.student_name;
      else if (!c.name && m.student_name) c.name = m.student_name;
      if (m.from_role === 'student' && !m.read_by_admin) c.unread++;
      map.set(m.student_mob, c);
    });
    return [...map.values()].map((c) => ({ ...c, waiting: c.last.from_role === 'student' }))
      .sort((a, b) => b.last.ts.localeCompare(a.last.ts));
  }, [msgs]);

  const shown = convs.filter((c) =>
    (filter === 'all' || (filter === 'unread' ? c.unread > 0 : c.waiting)) &&
    (!q || c.mob.includes(q) || (c.name || '').includes(q) || c.last.text.includes(q)));

  const stats = useMemo(() => {
    // متوسط زمن الرد: من أول رسالة طالب غير مردودة حتى أول رد إداري بعدها (آخر 30 يوماً)
    const since = Date.now() - 30 * 864e5;
    const pend = new Map<string, number>(); const gaps: number[] = [];
    msgs.forEach((m) => {
      const t = new Date(m.ts).getTime(); if (t < since) return;
      if (m.from_role === 'student') { if (!pend.has(m.student_mob)) pend.set(m.student_mob, t); }
      else if (pend.has(m.student_mob)) { gaps.push(t - pend.get(m.student_mob)!); pend.delete(m.student_mob); }
    });
    const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length / 60000 : null;
    return {
      unread: convs.reduce((a, c) => a + c.unread, 0),
      waiting: convs.filter((c) => c.waiting).length,
      avg: avg == null ? '—' : avg < 60 ? `${Math.round(avg)} دقيقة` : `${(avg / 60).toLocaleString('ar-SA', { maximumFractionDigits: 1 })} ساعة`,
    };
  }, [msgs, convs]);

  const thread = useMemo(() => msgs.filter((m) => m.student_mob === sel), [msgs, sel]);
  const conv = convs.find((c) => c.mob === sel);

  // عند فتح محادثة: علّمها مقروءة + اجلب بيانات الطالب
  useEffect(() => {
    if (!sel) return;
    (async () => {
      const unread = msgs.some((m) => m.student_mob === sel && m.from_role === 'student' && !m.read_by_admin);
      if (unread) {
        await supabase.from('chat_messages').update({ read_by_admin: true })
          .eq('student_mob', sel).eq('from_role', 'student').eq('read_by_admin', false);
        setMsgs((p) => p.map((m) => (m.student_mob === sel && m.from_role === 'student' ? { ...m, read_by_admin: true } : m)));
      }
      const [{ data: st }, { data: ex }] = await Promise.all([
        supabase.from('students').select('mob,name,grade,plan,active,sub_end,joined,last_login').eq('mob', sel).maybeSingle(),
        supabase.from('exam_results').select('*').eq('mob', sel).order('created_at', { ascending: false }).limit(1),
      ]);
      setStudent(st || null); setLastExam(ex?.[0] || null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length, sel]);

  const fill = (t: string) => t.replace(/\{name\}/g, (conv?.name || student?.name || '').split(' ')[0] || '');
  const send = async () => {
    const body = text.trim(); if (!body || !sel) return;
    setSending(true);
    const row = {
      student_mob: sel, student_name: conv?.name || student?.name || '', from_role: 'admin', text: body,
      read_by_admin: true, read_by_student: false, ts: new Date().toISOString(),
    };
    const { error } = await supabase.from('chat_messages').insert(row);
    setSending(false);
    if (error) { notify(`تعذّر الإرسال: ${error.message}`, { type: 'error' }); return; }
    setText(''); load(true);
  };
  // تغيير صف الطالب — صلاحية الإدارة فقط (الطالب لا يستطيع تغييره بنفسه)
  const changeGrade = async (g: number) => {
    if (!sel || !student || g === Number(student.grade)) return;
    if (!window.confirm(`تغيير صف الطالب إلى «${GRADE_AR[g]}»؟`)) return;
    const { error } = await supabase.from('students').update({ grade: g }).eq('mob', sel);
    if (error) { notify(`تعذّر التغيير: ${error.message}`, { type: 'error' }); return; }
    setStudent({ ...student, grade: g });
    notify('تم تغيير الصف ✓ — يظهر للطالب عند دخوله القادم', { type: 'success' });
  };
  const saveTpl = (list: string[]) => { setTpl(list); try { localStorage.setItem(TPL_KEY, JSON.stringify(list)); } catch { /* */ } };

  const subActive = student?.active && student?.plan && student.plan !== 'free' && (!student.sub_end || student.sub_end >= new Date().toISOString().slice(0, 10));

  /* ── قائمة المحادثات ── */
  const list = (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box p={1.5}>
        <TextField size="small" fullWidth placeholder="بحث بالاسم أو الجوال أو النص" value={q} onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ ml: 1, opacity: .5 }} /> }} />
        <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)} fullWidth sx={{ mt: 1 }}>
          <ToggleButton value="all">الكل ({convs.length})</ToggleButton>
          <ToggleButton value="unread">غير مقروء ({convs.filter((c) => c.unread).length})</ToggleButton>
          <ToggleButton value="waiting">بانتظار رد ({stats.waiting})</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Divider />
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {loading ? <Box p={4} textAlign="center"><CircularProgress size={28} /></Box> :
          shown.length === 0 ? <Typography color="text.secondary" p={4} textAlign="center">لا توجد محادثات</Typography> :
          shown.map((c) => (
            <Box key={c.mob} onClick={() => setSel(c.mob)} sx={{
              display: 'flex', gap: 1.5, p: 1.5, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider',
              bgcolor: sel === c.mob ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' },
            }}>
              <Badge color="error" badgeContent={c.unread} overlap="circular">
                <Avatar sx={{ bgcolor: c.waiting ? 'warning.main' : 'primary.main' }}>{(c.name || 'ط')[0]}</Avatar>
              </Badge>
              <Box flex={1} minWidth={0}>
                <Box display="flex" justifyContent="space-between" gap={1}>
                  <Typography fontWeight={c.unread ? 800 : 600} noWrap>{c.name || 'زائر'}</Typography>
                  <Typography variant="caption" color="text.secondary" flexShrink={0}>{ago(c.last.ts)}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {c.last.from_role === 'admin' ? 'أنت: ' : ''}{c.last.text}
                </Typography>
              </Box>
            </Box>
          ))}
      </Box>
    </Card>
  );

  /* ── المحادثة ── */
  const chat = sel ? (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" alignItems="center" gap={1} p={1.5} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        {mobile && <IconButton size="small" onClick={() => setSel(null)}><ArrowForwardIcon /></IconButton>}
        <Avatar sx={{ bgcolor: 'primary.main' }}>{(conv?.name || 'ط')[0]}</Avatar>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={700} noWrap>{conv?.name || student?.name || 'زائر'}</Typography>
          <Typography variant="caption" color="text.secondary" dir="ltr">{sel}</Typography>
        </Box>
        <Tooltip title="فتح واتساب"><IconButton component="a" href={wa(sel)} target="_blank" rel="noopener" color="success"><WhatsAppIcon /></IconButton></Tooltip>
        <IconButton onClick={() => load(true)}><RefreshIcon /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {thread.map((m) => {
          const me = m.from_role === 'admin';
          return (
            <Box key={m.id} alignSelf={me ? 'flex-start' : 'flex-end'} sx={{ maxWidth: '78%' }}>
              <Box sx={{
                px: 1.75, py: 1, borderRadius: 2.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                bgcolor: me ? 'primary.main' : 'background.paper', color: me ? 'primary.contrastText' : 'text.primary',
                boxShadow: 1, borderEndStartRadius: me ? 4 : undefined, borderEndEndRadius: me ? undefined : 4,
              }}>
                <Typography variant="body2">{m.text}</Typography>
              </Box>
              <Box display="flex" gap={.5} alignItems="center" justifyContent={me ? 'flex-start' : 'flex-end'} mt={.25}>
                <Typography variant="caption" color="text.disabled">{new Date(m.ts).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</Typography>
                {me && <DoneAllIcon sx={{ fontSize: 14, color: m.read_by_student ? 'info.main' : 'text.disabled' }} />}
              </Box>
            </Box>
          );
        })}
        <div ref={bottom} />
      </Box>
      <Box p={1.5} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" gap={1} alignItems="flex-end">
          <Tooltip title="ردود جاهزة"><IconButton onClick={(e) => setTplAnchor(e.currentTarget)} color="warning"><BoltIcon /></IconButton></Tooltip>
          <TextField fullWidth multiline maxRows={4} size="small" placeholder="اكتب ردك… (Enter للإرسال)" value={text}
            onChange={(e) => setText(e.target.value)} disabled={sending}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button variant="contained" onClick={send} disabled={!text.trim() || sending} sx={{ minWidth: 48, height: 40 }}>
            {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ transform: 'scaleX(-1)' }} />}
          </Button>
        </Box>
        <Menu anchorEl={tplAnchor} open={!!tplAnchor} onClose={() => setTplAnchor(null)} PaperProps={{ sx: { maxWidth: 420 } }}>
          {tpl.map((t, i) => (
            <MenuItem key={i} onClick={() => { setText(fill(t)); setTplAnchor(null); }} sx={{ whiteSpace: 'normal', display: 'flex', gap: 1 }}>
              <Typography variant="body2" flex={1}>{t}</Typography>
              <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); saveTpl(tpl.filter((_, j) => j !== i)); }}>حذف</Button>
            </MenuItem>
          ))}
          <Divider />
          <MenuItem disabled={!text.trim()} onClick={() => { saveTpl([...tpl, text.trim()]); setTplAnchor(null); notify('تم حفظ الرد الجاهز'); }}>
            + احفظ النص المكتوب كرد جاهز
          </MenuItem>
          <MenuItem onClick={() => { saveTpl(DEFAULT_TPL); setTplAnchor(null); }}>استرجاع الردود الافتراضية</MenuItem>
        </Menu>
      </Box>
    </Card>
  ) : (
    <Card sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <Typography color="text.secondary">اختر محادثة من القائمة</Typography>
    </Card>
  );

  /* ── معلومات الطالب ── */
  const info = sel && (
    <Card sx={{ height: '100%', p: 2, overflowY: 'auto' }}>
      <Typography fontWeight={700} mb={1.5}>معلومات الطالب</Typography>
      {!student ? <Typography variant="body2" color="text.secondary">غير مسجّل كطالب (زائر)</Typography> : (
        <Box display="flex" flexDirection="column" gap={1.25}>
          <Row k="الاسم" v={student.name} />
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">الصف</Typography>
            <TextField select size="small" variant="standard" value={student.grade ?? ''}
              onChange={(e) => changeGrade(Number(e.target.value))} sx={{ minWidth: 130 }}
              SelectProps={{ renderValue: (v) => GRADE_AR[Number(v)] || '—' }}>
              {Object.entries(GRADE_AR).map(([n, t]) => <MenuItem key={n} value={Number(n)}>{t}</MenuItem>)}
            </TextField>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">الاشتراك</Typography>
            {subActive ? <Chip size="small" color="success" label={PLAN_AR[student.plan] || student.plan} /> : <Chip size="small" label="مجاني" />}
          </Box>
          {student.sub_end && <Row k="ينتهي" v={new Date(student.sub_end).toLocaleDateString('ar-SA')} />}
          <Row k="سجّل" v={student.joined ? new Date(student.joined).toLocaleDateString('ar-SA') : '—'} />
          <Row k="آخر دخول" v={student.last_login ? ago(student.last_login) : '—'} />
          {lastExam && <Row k="آخر اختبار" v={`${lastExam.subject || ''} · ${lastExam.pct != null ? `${lastExam.pct}٪` : `${lastExam.score ?? ''}/${lastExam.total ?? ''}`}`} />}
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
      <Box display="flex" flexDirection="column" gap={1}>
        <Button variant="contained" color="success" onClick={() => setActivate(true)}>تفعيل / تمديد اشتراك</Button>
        <Button variant="outlined" component="a" href={`#/students?filter=${encodeURIComponent(JSON.stringify({ mob: sel }))}`}>صفحة الطالب</Button>
        <Button variant="outlined" color="success" startIcon={<WhatsAppIcon />} component="a" href={wa(sel)} target="_blank" rel="noopener">واتساب</Button>
      </Box>
      {activate && <ActivateDialog row={{ mob: sel, name: student?.name || conv?.name, grade: student?.grade, plan: student?.plan }}
        onClose={() => setActivate(false)} onDone={() => setSel(sel)} />}
    </Card>
  );

  return (
    <Box p={{ xs: 1, md: 2 }}>
      <Title title="صندوق الرسائل" />
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={1.5}>
        <Typography variant="h5" fontWeight={800} flex={1}>صندوق الرسائل</Typography>
        <Chip color="error" label={`غير مقروء: ${stats.unread.toLocaleString('ar-SA')}`} />
        <Chip color="warning" label={`بانتظار رد: ${stats.waiting.toLocaleString('ar-SA')}`} />
        <Chip variant="outlined" label={`متوسط زمن الرد: ${stats.avg}`} />
      </Box>
      {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
      <Box sx={{
        display: 'grid', gap: 1.5, height: { xs: 'calc(100vh - 190px)', md: 'calc(100vh - 170px)' }, minHeight: 480,
        gridTemplateColumns: mobile ? '1fr' : sel ? '320px 1fr 260px' : '320px 1fr',
      }}>
        {(!mobile || !sel) && list}
        {(!mobile || sel) && chat}
        {!mobile && info}
      </Box>
    </Box>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <Box display="flex" justifyContent="space-between" gap={1}>
    <Typography variant="body2" color="text.secondary">{k}</Typography>
    <Typography variant="body2" fontWeight={600} textAlign="left">{v || '—'}</Typography>
  </Box>
);
