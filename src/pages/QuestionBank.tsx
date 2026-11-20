// ══════════════════════════════════════════════════════════════
//  h100h — بنك الأسئلة · 2026-11-19 · إضافة
//  التغطية (كم سؤال لكل صف/مادة/اختبار/فصل) · الجودة (بدون حل، مكررة، ناقصة)
//  إضافة وتعديل وحذف سؤال · استيراد جماعي بلصق من Excel
//  نفس أعمدة جدول questions التي تقرأها البوابة: subject, grade, exam_num,
//  term, question, opts (4 خيارات), ans (0-3), solution, image_url
//  v2 (2026-11-19): رفع صور الأسئلة (تُضغط تلقائياً WebP) + معاينة كما يراها الطالب + نسخ سؤال
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Grid, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Radio, Chip, Alert, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, LinearProgress, Checkbox, FormControlLabel, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../supabaseClient';
import { useAccess } from '../access';

type Q = {
  id: string; subject: string; grade: number; exam_num: number; term?: number | null;
  question: string; opts: any; ans: number; solution?: string | null; image_url?: string | null; created_at?: string;
};

const GRADES: [number, string][] = [
  [1, 'أول ابتدائي'], [2, 'ثاني ابتدائي'], [3, 'ثالث ابتدائي'], [4, 'رابع ابتدائي'], [5, 'خامس ابتدائي'], [6, 'سادس ابتدائي'],
  [7, 'أول متوسط'], [8, 'ثاني متوسط'], [9, 'ثالث متوسط'], [10, 'أول ثانوي'], [11, 'ثاني ثانوي'], [12, 'ثالث ثانوي'],
  [13, 'جامعي'], [14, 'موظف'],
];
const GRADE_AR = Object.fromEntries(GRADES) as Record<number, string>;
const SUBJ_AR: Record<string, string> = {
  math: 'رياضيات', phys: 'فيزياء', chem: 'كيمياء', bio: 'أحياء', eng: 'إنجليزي', arabic: 'لغة عربية', sci: 'علوم',
  islamic: 'دراسات إسلامية', social: 'اجتماعيات', digital: 'رقمية', health_sci: 'علوم صحية', mgmt: 'مبادئ الإدارة',
  admin_skills: 'مهارات إدارية', marketing: 'تسويق', law: 'قانون', research: 'مصادر المعلومات', rhetoric: 'بلاغة ونقد',
  quran: 'قرآن', tawheed: 'توحيد', fiqh: 'فقه', hadith: 'حديث', art: 'فنية', pe: 'بدنية', critical: 'تفكير ناقد',
};
const subjName = (s: string) => SUBJ_AR[s] ? `${SUBJ_AR[s]}` : s;
const optsArr = (o: any): string[] => {
  if (Array.isArray(o)) return o.map(String);
  if (typeof o === 'string') { try { const v = JSON.parse(o); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } }
  return [];
};
const LETTERS = ['أ', 'ب', 'ج', 'د'];
const MIN_OK = 20;  // عدد الأسئلة المريح لكل اختبار
const MIN_WARN = 10;

/* ══════ صور الأسئلة: ضغط ثم رفع إلى Supabase Storage ══════ */
const BUCKET = 'question-images';
const MAX_W = 1200, MAX_H = 900;
// يحوّل أي صورة إلى WebP بحجم مناسب للجوال (يوفّر باقة الطالب وسعة الخادم)
async function compressImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bmp.width, MAX_H / bmp.height);
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);          // خلفية بيضاء للصور الشفافة
  ctx.drawImage(bmp, 0, 0, w, h);
  for (const q of [0.85, 0.75, 0.6, 0.45]) {
    const b: Blob | null = await new Promise((res) => c.toBlob(res, 'image/webp', q));
    if (b && (b.size <= 350 * 1024 || q === 0.45)) return b;
  }
  throw new Error('تعذّر ضغط الصورة');
}
function storagePath(url?: string | null): string | null {
  if (!url) return null;
  const m = String(url).match(/\/storage\/v1\/object\/public\/question-images\/(.+)$/);
  return m ? decodeURIComponent(m[1].split('?')[0]) : null;
}
async function uploadQImage(file: Blob, grade?: number, subject?: string): Promise<string> {
  const blob = await compressImage(file);
  const rnd = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `g${grade || 0}/${(subject || 'misc').replace(/[^a-zA-Z0-9_-]/g, '') || 'misc'}/${rnd}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw new Error(/bucket|not found/i.test(error.message) ? 'مخزن الصور غير مهيأ — شغّل 12-question-images.sql' : error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function removeQImage(url?: string | null) {
  const p = storagePath(url);
  if (p) { try { await supabase.storage.from(BUCKET).remove([p]); } catch { /* */ } }
}

/* ══════ معاينة السؤال كما يراه الطالب ══════ */
const PreviewDialog = ({ q, onClose, onEdit }: { q: Q; onClose: () => void; onEdit?: (q: Q) => void }) => {
  const o = optsArr(q.opts);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box flex={1}>معاينة السؤال</Box>
        <Chip size="small" label={GRADE_AR[q.grade] || q.grade} />
        <Chip size="small" label={subjName(q.subject)} />
        <Chip size="small" variant="outlined" label={`اختبار ${q.exam_num} · فصل ${q.term ?? 1}`} />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ bgcolor: '#0D1226', color: '#E6E9FA', borderRadius: 3, p: 2.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{q.question}</Typography>
          {q.image_url && (
            <Box textAlign="center" my={2}>
              <img src={q.image_url} alt="صورة السؤال" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 12, border: '1px solid #2a2f55' }} />
            </Box>
          )}
          <Box display="flex" flexDirection="column" gap={1} mt={1.5}>
            {o.map((t, i) => (
              <Box key={i} sx={{
                display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: 2,
                border: '1.5px solid', borderColor: i === Number(q.ans) ? '#34D399' : 'rgba(99,102,241,.3)',
                bgcolor: i === Number(q.ans) ? 'rgba(52,211,153,.12)' : 'rgba(99,102,241,.06)',
              }}>
                <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13,
                  bgcolor: i === Number(q.ans) ? '#34D399' : 'rgba(99,102,241,.25)', color: i === Number(q.ans) ? '#052e1c' : '#C7D2FE' }}>{LETTERS[i] || i + 1}</Box>
                <Typography flex={1} sx={{ whiteSpace: 'pre-wrap' }}>{t}</Typography>
                {i === Number(q.ans) && <CheckCircleIcon sx={{ color: '#34D399' }} fontSize="small" />}
              </Box>
            ))}
          </Box>
          {q.solution && (
            <Box mt={2} p={1.5} sx={{ borderRadius: 2, bgcolor: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.3)' }}>
              <Typography variant="caption" sx={{ color: '#FBBF24', fontWeight: 800 }}>💡 الحل</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: .5 }}>{q.solution}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {onEdit && <Button startIcon={<EditIcon />} onClick={() => { onClose(); onEdit(q); }}>تعديل</Button>}
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

type Cov = { grade: number; subject: string; exam_num: number; term: number; n: number; no_sol: number; with_img: number };
const isMissingFn = (m: string) => /admin_question|function|schema cache|PGRST202/i.test(m);

export const QuestionBankPage = () => {
  const notify = useNotify();
  const [tab, setTab] = useState(0);
  const [cov, setCov] = useState<Cov[] | null>(null);
  const [covErr, setCovErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Q> | null>(null);
  const [tick, setTick] = useState(0);
  // 2026-11-20: صلاحية «مشاهدة الأسئلة» فقط → قراءة بدون إضافة/تعديل/استيراد
  const { can, loading: accLoading } = useAccess();
  const canEdit = !accLoading && can('questions_edit');
  const onEdit = canEdit ? setEdit : undefined;

  useEffect(() => {
    let alive = true;
    setCov(null); setCovErr(null);
    supabase.rpc('admin_question_coverage').then(({ data, error }) => {
      if (!alive) return;
      if (error) { setCovErr(isMissingFn(error.message) ? 'MISSING' : error.message); setCov([]); return; }
      setCov(((data || []) as any[]).map((r) => ({ ...r, n: Number(r.n), no_sol: Number(r.no_sol), with_img: Number(r.with_img) })));
    });
    return () => { alive = false; };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);
  const subjects = useMemo(() => [...new Set((cov || []).map((r) => r.subject).filter(Boolean))].sort(), [cov]);
  const total = useMemo(() => (cov || []).reduce((a, r) => a + r.n, 0), [cov]);

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Title title="بنك الأسئلة" />
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
        <Typography variant="h5" fontWeight={800}>بنك الأسئلة</Typography>
        {cov && !covErr && <Chip color="primary" label={`${total.toLocaleString('ar-SA')} سؤال`} />}
        <Box flex={1} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={reload} disabled={cov === null}>تحديث</Button>
        {canEdit
          ? <Button variant="contained" onClick={() => setEdit({ grade: 12, exam_num: 1, term: 1, opts: ['', '', '', ''], ans: 0, subject: subjects[0] || '' })}>+ سؤال جديد</Button>
          : !accLoading && <Chip variant="outlined" label="مشاهدة فقط" />}
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="التغطية" /><Tab label="الجودة" /><Tab label={canEdit ? 'بحث وتعديل' : 'بحث'} />{canEdit && <Tab label="استيراد جماعي" />}
      </Tabs>
      {covErr === 'MISSING' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          لعرض التغطية والجودة شغّل ملف <b>13-question-bank.sql</b> في Supabase. البحث والتعديل والإضافة تعمل الآن.
        </Alert>
      )}
      {covErr && covErr !== 'MISSING' && <Alert severity="error" sx={{ mb: 2 }}>{covErr}</Alert>}
      {tab === 0 && (cov === null ? <Skeleton variant="rounded" height={400} /> : <Coverage cov={cov} />)}
      {tab === 1 && <Quality onEdit={onEdit} tick={tick} />}
      {tab === 2 && <Browse subjects={subjects} onEdit={onEdit} tick={tick} />}
      {tab === 3 && canEdit && <Import subjects={subjects} onDone={reload} />}
      {edit && canEdit && <EditDialog q={edit} subjects={subjects} onClose={() => setEdit(null)}
        onSaved={() => { setEdit(null); notify('تم الحفظ ✓', { type: 'success' }); reload(); }} />}
    </Box>
  );
};

/* ── التغطية (محسوبة داخل قاعدة البيانات) ── */
const Coverage = ({ cov }: { cov: Cov[] }) => {
  const [term, setTerm] = useState<'all' | '1' | '2'>('all');
  const data = useMemo(() => {
    const m = new Map<string, { grade: number; subject: string; ex: Record<number, number>; total: number; noSol: number; img: number }>();
    cov.filter((r) => term === 'all' || String(r.term) === term).forEach((r) => {
      const k = `${r.grade}|${r.subject}`;
      const x = m.get(k) || { grade: r.grade, subject: r.subject, ex: {}, total: 0, noSol: 0, img: 0 };
      x.ex[r.exam_num] = (x.ex[r.exam_num] || 0) + r.n; x.total += r.n; x.noSol += r.no_sol; x.img += r.with_img;
      m.set(k, x);
    });
    return [...m.values()].sort((a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject));
  }, [cov, term]);
  const exams = useMemo(() => [...new Set(cov.map((r) => r.exam_num))].filter((x) => x != null).sort((a, b) => a - b), [cov]);
  const total = cov.reduce((a, r) => a + r.n, 0);
  const weak = data.reduce((n, r) => n + exams.filter((e) => (r.ex[e] || 0) < MIN_WARN).length, 0);
  const gradesCovered = new Set(data.map((r) => r.grade)).size;
  const term2 = cov.filter((r) => r.term === 2).reduce((a, r) => a + r.n, 0);
  const imgs = cov.reduce((a, r) => a + r.with_img, 0);
  const cell = (n: number) => {
    const color = n >= MIN_OK ? '#059669' : n >= MIN_WARN ? '#d97706' : '#dc2626';
    return <Box sx={{ px: 1, py: .25, borderRadius: 1, bgcolor: `${color}1A`, color, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{n.toLocaleString('ar-SA')}</Box>;
  };
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={2.4 as any}><Mini t="إجمالي الأسئلة" v={total} /></Grid>
        <Grid item xs={6} md={2.4 as any}><Mini t="صفوف فيها أسئلة" v={gradesCovered} sub={`من ${GRADES.length}`} /></Grid>
        <Grid item xs={6} md={2.4 as any}><Mini t="أسئلة الفصل الثاني" v={term2} sub="جاهزة لفتح الفصل" /></Grid>
        <Grid item xs={6} md={2.4 as any}><Mini t="أسئلة بصور" v={imgs} color="#7c3aed" /></Grid>
        <Grid item xs={12} md={2.4 as any}><Mini t="اختبارات ضعيفة" v={weak} sub={`أقل من ${MIN_WARN} أسئلة`} color="#dc2626" /></Grid>
      </Grid>
      <Card><CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
          <Typography fontWeight={700} flex={1}>عدد الأسئلة لكل اختبار</Typography>
          <TextField select size="small" value={term} onChange={(e) => setTerm(e.target.value as any)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">كل الفصول</MenuItem><MenuItem value="1">الفصل الأول</MenuItem><MenuItem value="2">الفصل الثاني</MenuItem>
          </TextField>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          الأخضر {MIN_OK}+ سؤال · البرتقالي {MIN_WARN}–{MIN_OK - 1} · الأحمر أقل من {MIN_WARN}
        </Typography>
        {data.length === 0 ? <Typography color="text.secondary" py={4} textAlign="center">لا توجد بيانات</Typography> : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الصف</TableCell><TableCell>المادة</TableCell>
                {exams.map((e) => <TableCell key={e} align="center">اختبار {e}</TableCell>)}
                <TableCell align="center">المجموع</TableCell><TableCell align="center">بدون حل</TableCell><TableCell align="center">بصور</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={`${r.grade}|${r.subject}`} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{GRADE_AR[r.grade] || r.grade}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{subjName(r.subject)}</TableCell>
                    {exams.map((e) => <TableCell key={e} align="center">{cell(r.ex[e] || 0)}</TableCell>)}
                    <TableCell align="center"><b>{r.total.toLocaleString('ar-SA')}</b></TableCell>
                    <TableCell align="center">{r.noSol ? <Chip size="small" color="warning" variant="outlined" label={r.noSol.toLocaleString('ar-SA')} /> : '✓'}</TableCell>
                    <TableCell align="center">{r.img ? r.img.toLocaleString('ar-SA') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent></Card>
    </Box>
  );
};

const Mini = ({ t, v, sub, color = '#1a56db' }: { t: string; v: number; sub?: string; color?: string }) => (
  <Card sx={{ borderTop: `3px solid ${color}`, height: '100%' }}><CardContent>
    <Typography variant="body2" color="text.secondary">{t}</Typography>
    <Typography variant="h5" fontWeight={800}>{v.toLocaleString('ar-SA')}</Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </CardContent></Card>
);

// جلب أسئلة بأرقامها (دفعات صغيرة)
async function fetchByIds(ids: string[]): Promise<Q[]> {
  const out: Q[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from('questions').select('*').in('id', ids.slice(i, i + 100));
    out.push(...((data || []) as Q[]));
  }
  const order = new Map(ids.map((id, i) => [id, i]));
  return out.sort((a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0));
}

/* ── الجودة (محسوبة داخل قاعدة البيانات) ── */
const Quality = ({ onEdit, tick }: { onEdit?: (q: Q) => void; tick: number }) => {
  const [kind, setKind] = useState<'broken' | 'dup' | 'nosol'>('broken');
  const [counts, setCounts] = useState<{ broken: number; dup: number; nosol: number; total: number } | null>(null);
  const [rows, setRows] = useState<Q[] | null>(null);
  const [why, setWhy] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    supabase.rpc('admin_question_issue_counts').then(({ data, error }) => {
      if (error) { setErr(isMissingFn(error.message) ? 'شغّل ملف 13-question-bank.sql في Supabase لعرض الجودة.' : error.message); return; }
      const r = (data as any[])?.[0] || {};
      setCounts({ broken: Number(r.broken || 0), dup: Number(r.dup || 0), nosol: Number(r.nosol || 0), total: Number(r.total || 0) });
    });
  }, [tick]);
  useEffect(() => {
    let alive = true;
    setRows(null);
    supabase.rpc('admin_question_issues', { p_kind: kind, p_limit: 300 }).then(async ({ data, error }) => {
      if (!alive) return;
      if (error) { setRows([]); return; }
      const list = (data || []) as { id: string; problem: string }[];
      setWhy(Object.fromEntries(list.map((x) => [x.id, x.problem])));
      const qs = await fetchByIds(list.map((x) => x.id));
      if (alive) setRows(qs);
    });
    return () => { alive = false; };
  }, [kind, tick]);
  if (err) return <Alert severity="warning">{err}</Alert>;
  const good = counts && counts.total ? Math.max(0, Math.round(((counts.total - counts.broken - counts.nosol) / counts.total) * 100)) : 0;
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        {([['broken', 'أسئلة فيها خلل', '#dc2626'], ['dup', 'أسئلة مكررة', '#d97706'], ['nosol', 'بدون شرح للحل', '#64748b']] as const).map(([k, t, c]) => (
          <Grid item xs={12} md={4} key={k}>
            <Card onClick={() => setKind(k)} sx={{ cursor: 'pointer', borderTop: `3px solid ${c}`, outline: kind === k ? `2px solid ${c}` : 'none' }}>
              <CardContent><Typography variant="body2" color="text.secondary">{t}</Typography>
                {counts ? <Typography variant="h5" fontWeight={800}>{counts[k].toLocaleString('ar-SA')}</Typography> : <Skeleton width={60} height={36} />}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {counts && counts.total > 0 && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" fontWeight={700}>نسبة الأسئلة السليمة والمشروحة</Typography>
            <Typography variant="body2">{good.toLocaleString('ar-SA')}٪</Typography>
          </Box>
          <LinearProgress variant="determinate" value={good} sx={{ height: 10, borderRadius: 5 }} />
        </CardContent></Card>
      )}
      {rows === null ? <LinearProgress /> : <QTable rows={rows} onEdit={onEdit} extra={kind === 'broken' ? (q) => why[String(q.id)] || '' : undefined} />}
      {rows && rows.length >= 300 && <Typography variant="caption" color="text.secondary">يعرض أول 300 — أصلحها ثم حدّث لعرض البقية</Typography>}
    </Box>
  );
};

const QTable = ({ rows, onEdit, extra }: { rows: Q[]; onEdit?: (q: Q) => void; extra?: (q: Q) => string }) => {
  const [pv, setPv] = useState<Q | null>(null);
  return (
  <Card><Box sx={{ overflowX: 'auto' }}>
    <Table size="small">
      <TableHead><TableRow>
        <TableCell>السؤال</TableCell><TableCell>الصف</TableCell><TableCell>المادة</TableCell><TableCell>اختبار</TableCell><TableCell>فصل</TableCell>
        {extra && <TableCell>المشكلة</TableCell>}<TableCell />
      </TableRow></TableHead>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا شيء هنا ✓</TableCell></TableRow>}
        {rows.map((q) => (
          <TableRow key={q.id} hover>
            <TableCell sx={{ maxWidth: 420 }}>
              <Box display="flex" alignItems="center" gap={.75}>
                {q.image_url && <Tooltip title="فيه صورة"><ImageIcon fontSize="small" color="primary" /></Tooltip>}
                <Typography variant="body2" noWrap title={q.question}>{q.question}</Typography>
              </Box>
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{GRADE_AR[q.grade] || q.grade}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{subjName(q.subject)}</TableCell>
            <TableCell>{q.exam_num}</TableCell>
            <TableCell>{q.term ?? 1}</TableCell>
            {extra && <TableCell><Chip size="small" color="error" variant="outlined" label={extra(q)} /></TableCell>}
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title="معاينة"><IconButton size="small" onClick={() => setPv(q)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
              {onEdit && <Tooltip title="تعديل"><IconButton size="small" onClick={() => onEdit(q)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
  {pv && <PreviewDialog q={pv} onClose={() => setPv(null)} onEdit={onEdit} />}
  </Card>
  );
};

/* ── بحث وتعديل (البحث يتم على الخادم — سريع مهما كثرت الأسئلة) ── */
const Browse = ({ subjects, onEdit, tick }: { subjects: string[]; onEdit?: (q: Q) => void; tick: number }) => {
  const [grade, setGrade] = useState<number | ''>('');
  const [subject, setSubject] = useState('');
  const [exam, setExam] = useState<number | ''>('');
  const [term, setTerm] = useState<number | ''>('');
  const [text, setText] = useState('');
  const [withImg, setWithImg] = useState(false);
  const [rows, setRows] = useState<Q[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const LIMIT = 200;
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setRows(null); setErr(null);
      let q = supabase.from('questions').select('*', { count: 'exact' });
      if (grade !== '') q = q.eq('grade', grade);
      if (subject) q = q.eq('subject', subject);
      if (exam !== '') q = q.eq('exam_num', exam);
      if (term !== '') q = q.eq('term', term);
      if (withImg) q = q.not('image_url', 'is', null).neq('image_url', '');
      const s = text.trim().replace(/[%,()]/g, ' ');
      if (s) q = q.ilike('question', `%${s}%`);
      const { data, error, count: c } = await q.order('created_at', { ascending: false }).limit(LIMIT);
      if (!alive) return;
      if (error) { setErr(error.message); setRows([]); return; }
      setRows((data || []) as Q[]); setCount(c ?? null);
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [grade, subject, exam, term, text, withImg, tick]);
  return (
    <Box>
      <Box display="flex" gap={1} flexWrap="wrap" mb={2} alignItems="center">
        <TextField select size="small" label="الصف" value={grade} onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 150 }}>
          <MenuItem value="">الكل</MenuItem>{GRADES.map(([n, t]) => <MenuItem key={n} value={n}>{t}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="المادة" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">الكل</MenuItem>{subjects.map((s) => <MenuItem key={s} value={s}>{subjName(s)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="الاختبار" value={exam} onChange={(e) => setExam(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 110 }}>
          <MenuItem value="">الكل</MenuItem>{[1, 2, 3, 4].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="الفصل" value={term} onChange={(e) => setTerm(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 110 }}>
          <MenuItem value="">الكل</MenuItem><MenuItem value={1}>الأول</MenuItem><MenuItem value={2}>الثاني</MenuItem>
        </TextField>
        <TextField size="small" label="بحث في نص السؤال" value={text} onChange={(e) => setText(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
        <FormControlLabel control={<Checkbox size="small" checked={withImg} onChange={(e) => setWithImg(e.target.checked)} />} label="بصور فقط" />
      </Box>
      {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
      <Typography variant="caption" color="text.secondary" display="block" mb={.5}>
        {rows === null ? 'جارٍ البحث…' : `${(count ?? rows.length).toLocaleString('ar-SA')} نتيجة${(count ?? 0) > LIMIT ? ` · يعرض أحدث ${LIMIT} — ضيّق البحث بالفلاتر` : ''}`}
      </Typography>
      {rows === null ? <LinearProgress /> : <QTable rows={rows} onEdit={onEdit} />}
    </Box>
  );
};

/* ── نافذة الإضافة والتعديل ── */
const EditDialog = ({ q, subjects, onClose, onSaved }: { q: Partial<Q>; subjects: string[]; onClose: () => void; onSaved: () => void }) => {
  const notify = useNotify();
  const [f, setF] = useState<Partial<Q>>({ ...q, opts: optsArr(q.opts).length ? optsArr(q.opts) : ['', '', '', ''] });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [preview, setPreview] = useState(false);
  const uploaded = useRef<string[]>([]);   // صور رُفعت في هذه النافذة (تُحذف إن أُلغيت)
  const opts = optsArr(f.opts);
  const cancel = async () => {
    for (const u of uploaded.current) if (u !== q.image_url) await removeQImage(u);
    onClose();
  };
  const setOpt = (i: number, v: string) => { const o = [...opts]; o[i] = v; setF({ ...f, opts: o }); };
  const valid = f.subject && f.grade && f.exam_num && f.question?.trim() && opts.length >= 2 && opts.every((o) => o.trim()) && f.ans != null && f.ans < opts.length;
  const save = async () => {
    setBusy(true);
    const row: Record<string, unknown> = {
      subject: String(f.subject).trim(), grade: Number(f.grade), exam_num: Number(f.exam_num), term: Number(f.term || 1),
      question: f.question!.trim(), opts: opts.map((o) => o.trim()), ans: Number(f.ans),
      solution: f.solution?.trim() || null, image_url: f.image_url?.trim() || null,
    };
    const { error } = f.id
      ? await supabase.from('questions').update(row).eq('id', f.id)
      : await supabase.from('questions').insert({ ...row, added_by: 'admin-panel' });
    setBusy(false);
    if (error) { notify(`تعذّر الحفظ: ${error.message}`, { type: 'error' }); return; }
    // نظافة المخزن: الصورة القديمة المستبدلة، والصور المرفوعة ولم تُستخدم
    const keep = f.image_url || null;
    if (q.image_url && q.image_url !== keep && f.id) await removeQImage(q.image_url);
    for (const u of uploaded.current) if (u !== keep) await removeQImage(u);
    onSaved();
  };
  const del = async () => {
    setBusy(true);
    const { error } = await supabase.from('questions').delete().eq('id', f.id!);
    setBusy(false);
    if (error) { notify(`تعذّر الحذف: ${error.message}`, { type: 'error' }); return; }
    await removeQImage(q.image_url);
    for (const u of uploaded.current) await removeQImage(u);
    onSaved();
  };
  const duplicate = () => {
    // نسخة جديدة بنفس البيانات (بدون الصورة حتى لا تُحذف مع الأصل)
    setF({ ...f, id: undefined, image_url: null, question: f.question });
    uploaded.current = [];
    notify('نسخة جديدة — عدّلها ثم احفظ', { type: 'info' });
  };
  return (
    <Dialog open onClose={busy ? undefined : cancel} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box flex={1}>{f.id ? 'تعديل سؤال' : 'سؤال جديد'}</Box>
        {f.id && <Button size="small" startIcon={<ContentCopyIcon />} onClick={duplicate} disabled={busy}>نسخ كسؤال جديد</Button>}
        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setPreview(true)} disabled={!f.question}>معاينة</Button>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5} sx={{ mt: 0 }}>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth size="small" label="الصف" value={f.grade ?? ''} onChange={(e) => setF({ ...f, grade: Number(e.target.value) })}>
              {GRADES.map(([n, t]) => <MenuItem key={n} value={n}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" label="المادة (رمز)" value={f.subject ?? ''} onChange={(e) => setF({ ...f, subject: e.target.value })}
              helperText={subjName(String(f.subject || ''))} inputProps={{ list: 'qb-subjects', dir: 'ltr' }} />
            <datalist id="qb-subjects">{subjects.map((s) => <option key={s} value={s}>{subjName(s)}</option>)}</datalist>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth size="small" label="رقم الاختبار" value={f.exam_num ?? 1} onChange={(e) => setF({ ...f, exam_num: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth size="small" label="الفصل" value={f.term ?? 1} onChange={(e) => setF({ ...f, term: Number(e.target.value) })}>
              <MenuItem value={1}>الأول</MenuItem><MenuItem value={2}>الثاني</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="نص السؤال" value={f.question ?? ''} onChange={(e) => setF({ ...f, question: e.target.value })} />
          </Grid>
          {opts.map((o, i) => (
            <Grid item xs={12} md={6} key={i}>
              <Box display="flex" alignItems="center" gap={.5}>
                <Tooltip title="الإجابة الصحيحة"><Radio checked={Number(f.ans) === i} onChange={() => setF({ ...f, ans: i })} color="success" /></Tooltip>
                <TextField fullWidth size="small" label={`الخيار ${LETTERS[i] || i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)}
                  sx={Number(f.ans) === i ? { '& .MuiOutlinedInput-root': { bgcolor: '#05966914' } } : undefined} />
              </Box>
            </Grid>
          ))}
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} label="شرح الحل (اختياري)" value={f.solution ?? ''} onChange={(e) => setF({ ...f, solution: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <ImageField value={f.image_url || ''} grade={Number(f.grade) || 0} subject={String(f.subject || '')}
              onChange={(u, isNew) => { if (isNew && u) uploaded.current.push(u); setF({ ...f, image_url: u || null }); }} disabled={busy} />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>اختر الدائرة الخضراء بجانب الإجابة الصحيحة.</Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          {f.id && !confirmDel && <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDel(true)} disabled={busy}>حذف</Button>}
          {f.id && confirmDel && <Button color="error" variant="contained" onClick={del} disabled={busy}>تأكيد الحذف نهائياً</Button>}
        </Box>
        <Box>
          <Button onClick={cancel} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</Button>
        </Box>
      </DialogActions>
      {preview && <PreviewDialog q={{ ...(f as Q), opts }} onClose={() => setPreview(false)} />}
    </Dialog>
  );
};

/* ── حقل الصورة: رفع من الجهاز / لصق / سحب وإفلات / رابط ── */
const ImageField = ({ value, grade, subject, onChange, disabled }: {
  value: string; grade: number; subject: string; disabled?: boolean;
  onChange: (url: string, isNew?: boolean) => void;
}) => {
  const notify = useNotify();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const take = async (file?: File | Blob | null) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { notify('الملف ليس صورة', { type: 'warning' }); return; }
    if (file.size > 15 * 1024 * 1024) { notify('الصورة كبيرة جداً (الحد 15MB قبل الضغط)', { type: 'warning' }); return; }
    setBusy(true);
    try {
      const url = await uploadQImage(file, grade, subject);
      onChange(url, true);
      notify('تم رفع الصورة ✓', { type: 'success' });
    } catch (e: any) { notify(`تعذّر الرفع: ${e?.message || e}`, { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Box
      onPaste={(e) => { const it = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/')); if (it) { e.preventDefault(); take(it.getAsFile()); } }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
      tabIndex={0}
      sx={{ border: '2px dashed', borderColor: drag ? 'primary.main' : 'divider', borderRadius: 2, p: 1.5, bgcolor: drag ? 'action.hover' : 'transparent', outline: 'none' }}>
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
        {value ? (
          <img src={value} alt="" style={{ height: 90, maxWidth: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }} />
        ) : (
          <Box sx={{ width: 90, height: 90, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}><ImageIcon color="disabled" /></Box>
        )}
        <Box flex={1} minWidth={200}>
          <Typography variant="body2" fontWeight={700}>صورة السؤال (اختياري)</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            اختر صورة، أو اسحبها هنا، أو الصقها (Ctrl+V). تُضغط تلقائياً لتناسب الجوال.
          </Typography>
          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            <Button size="small" variant="outlined" startIcon={busy ? <CircularProgress size={14} /> : <CloudUploadIcon />}
              onClick={() => input.current?.click()} disabled={busy || disabled}>{value ? 'تغيير الصورة' : 'رفع صورة'}</Button>
            {value && <Button size="small" color="error" onClick={() => onChange('')} disabled={busy || disabled}>إزالة</Button>}
            <Button size="small" onClick={() => setShowUrl((v) => !v)}>رابط</Button>
          </Box>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
        </Box>
      </Box>
      {showUrl && (
        <TextField fullWidth size="small" sx={{ mt: 1.5 }} label="أو رابط صورة مباشر" value={value}
          onChange={(e) => onChange(e.target.value.trim())} inputProps={{ dir: 'ltr' }} />
      )}
    </Box>
  );
};

/* ── استيراد جماعي ── */
// كل سطر: السؤال | خيار1 | خيار2 | خيار3 | خيار4 | رقم الصحيح (1-4) | الحل (اختياري)
// يُفصل بـ Tab (لصق من Excel مباشرة) أو |
const Import = ({ subjects, onDone }: { subjects: string[]; onDone: () => void }) => {
  const notify = useNotify();
  const [grade, setGrade] = useState(12);
  const [subject, setSubject] = useState(subjects[0] || '');
  const [exam, setExam] = useState(1);
  const [term, setTerm] = useState(1);
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const p = (line.includes('\t') ? line.split('\t') : line.split('|')).map((x) => x.trim());
    const question = p[0] || '';
    const rest = p.slice(1);
    // آخر عمود رقم؟ إذا كان قبل الحل
    let ansIdx = -1; let solution = '';
    for (let k = rest.length - 1; k >= 0; k--) { if (/^[1-4أبجد]$/.test(rest[k])) { ansIdx = k; break; } }
    const opts = ansIdx >= 0 ? rest.slice(0, ansIdx) : rest.slice(0, 4);
    if (ansIdx >= 0) solution = rest.slice(ansIdx + 1).join(' ');
    const a = ansIdx >= 0 ? rest[ansIdx] : '';
    const ans = /^[1-4]$/.test(a) ? Number(a) - 1 : LETTERS.indexOf(a);
    const errors: string[] = [];
    if (!question) errors.push('بدون سؤال');
    if (opts.length < 2 || opts.some((o) => !o)) errors.push('الخيارات ناقصة');
    if (ans < 0 || ans >= opts.length) errors.push('رقم الإجابة');
    return { i: i + 1, question, opts, ans, solution, errors };
  }), [raw]);
  const good = parsed.filter((r) => r.errors.length === 0);
  const run = async () => {
    if (!subject.trim()) { notify('اكتب رمز المادة', { type: 'warning' }); return; }
    setBusy(true);
    const rows = good.map((r) => ({
      subject: subject.trim(), grade, exam_num: exam, term, question: r.question, opts: r.opts, ans: r.ans,
      solution: r.solution || null, added_by: 'admin-import',
    }));
    let ok = 0; let fail = '';
    for (let k = 0; k < rows.length; k += 200) {
      const { error } = await supabase.from('questions').insert(rows.slice(k, k + 200));
      if (error) { fail = error.message; break; }
      ok += Math.min(200, rows.length - k);
    }
    setBusy(false);
    if (fail) notify(`أُضيف ${ok} ثم توقف: ${fail}`, { type: 'error' });
    else { notify(`تمت إضافة ${ok} سؤال ✓`, { type: 'success' }); setRaw(''); onDone(); }
  };
  return (
    <Card><CardContent>
      <Alert severity="info" sx={{ mb: 2 }}>
        انسخ الأعمدة من Excel والصقها هنا. كل سطر سؤال، بالترتيب: <b>السؤال · الخيار 1 · الخيار 2 · الخيار 3 · الخيار 4 · رقم الإجابة الصحيحة (1–4) · شرح الحل (اختياري)</b>.
        يمكن أيضاً الفصل بعلامة | بدل الأعمدة.
      </Alert>
      <Grid container spacing={1.5} mb={1.5}>
        <Grid item xs={6} md={3}>
          <TextField select fullWidth size="small" label="الصف" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {GRADES.map(([n, t]) => <MenuItem key={n} value={n}>{t}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField fullWidth size="small" label="المادة (رمز)" value={subject} onChange={(e) => setSubject(e.target.value)} helperText={subjName(subject)} inputProps={{ list: 'qb-subjects-imp', dir: 'ltr' }} />
          <datalist id="qb-subjects-imp">{subjects.map((s) => <option key={s} value={s}>{subjName(s)}</option>)}</datalist>
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField select fullWidth size="small" label="رقم الاختبار" value={exam} onChange={(e) => setExam(Number(e.target.value))}>
            {[1, 2, 3, 4].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField select fullWidth size="small" label="الفصل" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
            <MenuItem value={1}>الأول</MenuItem><MenuItem value={2}>الثاني</MenuItem>
          </TextField>
        </Grid>
      </Grid>
      <TextField fullWidth multiline minRows={8} maxRows={20} value={raw} onChange={(e) => setRaw(e.target.value)}
        placeholder={'ما ناتج 5 × 6؟\t11\t30\t56\t25\t2\tلأن 5 × 6 = 30'} />
      {parsed.length > 0 && (
        <Box mt={2}>
          <Box display="flex" gap={1} alignItems="center" mb={1} flexWrap="wrap">
            <Chip color="success" label={`سليم: ${good.length}`} />
            {parsed.length - good.length > 0 && <Chip color="error" label={`فيه خطأ: ${parsed.length - good.length}`} />}
            <Box flex={1} />
            <Button variant="contained" disabled={!good.length || busy} onClick={run}>
              {busy ? 'جارٍ الإضافة…' : `إضافة ${good.length} سؤال إلى ${GRADE_AR[grade]} · ${subjName(subject)} · اختبار ${exam}`}
            </Button>
          </Box>
          <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell>#</TableCell><TableCell>السؤال</TableCell><TableCell>الخيارات</TableCell><TableCell>الصحيح</TableCell><TableCell>الحالة</TableCell></TableRow></TableHead>
              <TableBody>
                {parsed.slice(0, 200).map((r) => (
                  <TableRow key={r.i}>
                    <TableCell>{r.i}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" noWrap title={r.question}>{r.question}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 280 }}><Typography variant="caption" noWrap display="block">{r.opts.join(' · ')}</Typography></TableCell>
                    <TableCell>{r.ans >= 0 ? r.opts[r.ans] : '—'}</TableCell>
                    <TableCell>{r.errors.length ? <Chip size="small" color="error" label={r.errors.join('، ')} /> : <Chip size="small" color="success" label="✓" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </CardContent></Card>
  );
};
