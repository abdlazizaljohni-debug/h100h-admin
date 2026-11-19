// ══════════════════════════════════════════════════════════════
//  h100h — بنك الأسئلة · 2026-11-19 · إضافة
//  التغطية (كم سؤال لكل صف/مادة/اختبار/فصل) · الجودة (بدون حل، مكررة، ناقصة)
//  إضافة وتعديل وحذف سؤال · استيراد جماعي بلصق من Excel
//  نفس أعمدة جدول questions التي تقرأها البوابة: subject, grade, exam_num,
//  term, question, opts (4 خيارات), ans (0-3), solution, image_url
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Grid, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, MenuItem, Button, Radio, Chip, Alert, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { supabase } from '../supabaseClient';

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
const norm = (s: string) => (s || '').replace(/[\sً-ْـ.,،؟?!:]+/g, '').toLowerCase();
const LETTERS = ['أ', 'ب', 'ج', 'د'];
const MIN_OK = 20;  // عدد الأسئلة المريح لكل اختبار
const MIN_WARN = 10;

async function fetchAllQ(): Promise<Q[]> {
  const out: Q[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data || []) as Q[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const QuestionBankPage = () => {
  const notify = useNotify();
  const [tab, setTab] = useState(0);
  const [all, setAll] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Q> | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetchAllQ().then((d) => alive && setAll(d)).catch((e) => alive && setErr(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);
  const subjects = useMemo(() => [...new Set(all.map((q) => q.subject).filter(Boolean))].sort(), [all]);

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Title title="بنك الأسئلة" />
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
        <Typography variant="h5" fontWeight={800}>بنك الأسئلة</Typography>
        <Chip color="primary" label={`${all.length.toLocaleString('ar-SA')} سؤال`} />
        <Box flex={1} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>تحديث</Button>
        <Button variant="contained" onClick={() => setEdit({ grade: 12, exam_num: 1, term: 1, opts: ['', '', '', ''], ans: 0, subject: subjects[0] || '' })}>+ سؤال جديد</Button>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="التغطية" /><Tab label="الجودة" /><Tab label="بحث وتعديل" /><Tab label="استيراد جماعي" />
      </Tabs>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {loading ? <Skeleton variant="rounded" height={400} /> : (
        <>
          {tab === 0 && <Coverage all={all} />}
          {tab === 1 && <Quality all={all} onEdit={setEdit} />}
          {tab === 2 && <Browse all={all} subjects={subjects} onEdit={setEdit} />}
          {tab === 3 && <Import subjects={subjects} onDone={reload} />}
        </>
      )}
      {edit && <EditDialog q={edit} subjects={subjects} onClose={() => setEdit(null)}
        onSaved={() => { setEdit(null); notify('تم الحفظ ✓', { type: 'success' }); reload(); }} />}
    </Box>
  );
};

/* ── التغطية ── */
const Coverage = ({ all }: { all: Q[] }) => {
  const [term, setTerm] = useState<'all' | '1' | '2'>('all');
  const data = useMemo(() => {
    const rows = all.filter((q) => term === 'all' || String(q.term ?? 1) === term);
    const m = new Map<string, { grade: number; subject: string; ex: Record<number, number>; total: number; noSol: number }>();
    rows.forEach((q) => {
      const k = `${q.grade}|${q.subject}`;
      const r = m.get(k) || { grade: q.grade, subject: q.subject, ex: {}, total: 0, noSol: 0 };
      r.ex[q.exam_num] = (r.ex[q.exam_num] || 0) + 1; r.total++;
      if (!q.solution || !String(q.solution).trim()) r.noSol++;
      m.set(k, r);
    });
    return [...m.values()].sort((a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject));
  }, [all, term]);
  const exams = useMemo(() => [...new Set(all.map((q) => q.exam_num))].filter((x) => x != null).sort((a, b) => a - b), [all]);
  const weak = data.reduce((n, r) => n + exams.filter((e) => (r.ex[e] || 0) < MIN_WARN).length, 0);
  const gradesCovered = new Set(data.map((r) => r.grade)).size;
  const term2 = all.filter((q) => Number(q.term) === 2).length;
  const cell = (n: number) => {
    const color = n >= MIN_OK ? '#059669' : n >= MIN_WARN ? '#d97706' : '#dc2626';
    return <Box sx={{ px: 1, py: .25, borderRadius: 1, bgcolor: `${color}1A`, color, fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{n.toLocaleString('ar-SA')}</Box>;
  };
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><Mini t="إجمالي الأسئلة" v={all.length} /></Grid>
        <Grid item xs={6} md={3}><Mini t="صفوف فيها أسئلة" v={gradesCovered} sub={`من ${GRADES.length}`} /></Grid>
        <Grid item xs={6} md={3}><Mini t="أسئلة الفصل الثاني" v={term2} sub="جاهزة لفتح الفصل" /></Grid>
        <Grid item xs={6} md={3}><Mini t="اختبارات ضعيفة" v={weak} sub={`أقل من ${MIN_WARN} أسئلة`} color="#dc2626" /></Grid>
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
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الصف</TableCell><TableCell>المادة</TableCell>
              {exams.map((e) => <TableCell key={e} align="center">اختبار {e}</TableCell>)}
              <TableCell align="center">المجموع</TableCell><TableCell align="center">بدون حل</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.map((r) => (
                <TableRow key={`${r.grade}|${r.subject}`} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{GRADE_AR[r.grade] || r.grade}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{subjName(r.subject)}</TableCell>
                  {exams.map((e) => <TableCell key={e} align="center">{cell(r.ex[e] || 0)}</TableCell>)}
                  <TableCell align="center"><b>{r.total.toLocaleString('ar-SA')}</b></TableCell>
                  <TableCell align="center">{r.noSol ? <Chip size="small" color="warning" variant="outlined" label={r.noSol.toLocaleString('ar-SA')} /> : '✓'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
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

/* ── الجودة ── */
const Quality = ({ all, onEdit }: { all: Q[]; onEdit: (q: Q) => void }) => {
  const [kind, setKind] = useState<'dup' | 'nosol' | 'broken'>('broken');
  const issues = useMemo(() => {
    const broken = all.filter((q) => {
      const o = optsArr(q.opts);
      return !q.question?.trim() || o.length < 2 || o.some((x) => !x.trim()) || q.ans == null || q.ans < 0 || q.ans >= o.length
        || new Set(o.map(norm)).size !== o.length;
    });
    const nosol = all.filter((q) => !q.solution || !String(q.solution).trim());
    const groups = new Map<string, Q[]>();
    all.forEach((q) => { const k = `${q.grade}|${q.subject}|${norm(q.question)}`; if (norm(q.question).length > 5) groups.set(k, [...(groups.get(k) || []), q]); });
    const dup = [...groups.values()].filter((g) => g.length > 1).flat();
    return { broken, nosol, dup };
  }, [all]);
  const list = issues[kind === 'dup' ? 'dup' : kind === 'nosol' ? 'nosol' : 'broken'];
  const why = (q: Q) => {
    const o = optsArr(q.opts);
    if (!q.question?.trim()) return 'بدون نص';
    if (o.length < 2) return 'خيارات ناقصة';
    if (o.some((x) => !x.trim())) return 'خيار فارغ';
    if (q.ans == null || q.ans < 0 || q.ans >= o.length) return 'رقم الإجابة غير صحيح';
    if (new Set(o.map(norm)).size !== o.length) return 'خيارات مكررة';
    return '';
  };
  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        {([['broken', 'أسئلة فيها خلل', issues.broken.length, '#dc2626'], ['dup', 'أسئلة مكررة', issues.dup.length, '#d97706'], ['nosol', 'بدون شرح للحل', issues.nosol.length, '#64748b']] as const).map(([k, t, n, c]) => (
          <Grid item xs={12} md={4} key={k}>
            <Card onClick={() => setKind(k)} sx={{ cursor: 'pointer', borderTop: `3px solid ${c}`, outline: kind === k ? `2px solid ${c}` : 'none' }}>
              <CardContent><Typography variant="body2" color="text.secondary">{t}</Typography>
                <Typography variant="h5" fontWeight={800}>{n.toLocaleString('ar-SA')}</Typography></CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {all.length > 0 && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Typography variant="body2" fontWeight={700} mb={1}>نسبة الأسئلة السليمة والمشروحة</Typography>
          <LinearProgress variant="determinate" value={Math.round(((all.length - issues.broken.length - issues.nosol.length) / all.length) * 100)} sx={{ height: 10, borderRadius: 5 }} />
        </CardContent></Card>
      )}
      <QTable rows={list.slice(0, 300)} onEdit={onEdit} extra={kind === 'broken' ? why : undefined} />
      {list.length > 300 && <Typography variant="caption" color="text.secondary">يعرض أول 300 فقط</Typography>}
    </Box>
  );
};

const QTable = ({ rows, onEdit, extra }: { rows: Q[]; onEdit: (q: Q) => void; extra?: (q: Q) => string }) => (
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
            <TableCell sx={{ maxWidth: 420 }}><Typography variant="body2" noWrap title={q.question}>{q.question}</Typography></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{GRADE_AR[q.grade] || q.grade}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{subjName(q.subject)}</TableCell>
            <TableCell>{q.exam_num}</TableCell>
            <TableCell>{q.term ?? 1}</TableCell>
            {extra && <TableCell><Chip size="small" color="error" variant="outlined" label={extra(q)} /></TableCell>}
            <TableCell><IconButton size="small" onClick={() => onEdit(q)}><EditIcon fontSize="small" /></IconButton></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box></Card>
);

/* ── بحث وتعديل ── */
const Browse = ({ all, subjects, onEdit }: { all: Q[]; subjects: string[]; onEdit: (q: Q) => void }) => {
  const [grade, setGrade] = useState<number | ''>('');
  const [subject, setSubject] = useState('');
  const [exam, setExam] = useState<number | ''>('');
  const [text, setText] = useState('');
  const rows = useMemo(() => all.filter((q) =>
    (grade === '' || q.grade === grade) && (!subject || q.subject === subject) && (exam === '' || q.exam_num === exam) &&
    (!text || q.question?.includes(text) || optsArr(q.opts).some((o) => o.includes(text)))), [all, grade, subject, exam, text]);
  return (
    <Box>
      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
        <TextField select size="small" label="الصف" value={grade} onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 150 }}>
          <MenuItem value="">الكل</MenuItem>{GRADES.map(([n, t]) => <MenuItem key={n} value={n}>{t}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="المادة" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">الكل</MenuItem>{subjects.map((s) => <MenuItem key={s} value={s}>{subjName(s)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="الاختبار" value={exam} onChange={(e) => setExam(e.target.value === '' ? '' : Number(e.target.value))} sx={{ minWidth: 120 }}>
          <MenuItem value="">الكل</MenuItem>{[1, 2, 3, 4].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </TextField>
        <TextField size="small" label="بحث في النص" value={text} onChange={(e) => setText(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
      </Box>
      <Typography variant="caption" color="text.secondary">{rows.length.toLocaleString('ar-SA')} نتيجة{rows.length > 200 ? ' · يعرض أول 200' : ''}</Typography>
      <QTable rows={rows.slice(0, 200)} onEdit={onEdit} />
    </Box>
  );
};

/* ── نافذة الإضافة والتعديل ── */
const EditDialog = ({ q, subjects, onClose, onSaved }: { q: Partial<Q>; subjects: string[]; onClose: () => void; onSaved: () => void }) => {
  const notify = useNotify();
  const [f, setF] = useState<Partial<Q>>({ ...q, opts: optsArr(q.opts).length ? optsArr(q.opts) : ['', '', '', ''] });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const opts = optsArr(f.opts);
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
    onSaved();
  };
  const del = async () => {
    setBusy(true);
    const { error } = await supabase.from('questions').delete().eq('id', f.id!);
    setBusy(false);
    if (error) { notify(`تعذّر الحذف: ${error.message}`, { type: 'error' }); return; }
    onSaved();
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>{f.id ? 'تعديل سؤال' : 'سؤال جديد'}</DialogTitle>
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
            <TextField fullWidth size="small" label="رابط صورة (اختياري)" value={f.image_url ?? ''} onChange={(e) => setF({ ...f, image_url: e.target.value })} inputProps={{ dir: 'ltr' }} />
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
          <Button onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button variant="contained" onClick={save} disabled={!valid || busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</Button>
        </Box>
      </DialogActions>
    </Dialog>
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
