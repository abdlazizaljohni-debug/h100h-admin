// ══════════════════════════════════════════════════════════════
//  h100h — الطلاب · 2026-11-20 (تطوير — نفس الأعمدة السابقة + أدوات الإدارة)
//   · آخر IP ووقت آخر دخول · سجل الدخول الكامل · الحسابات التي دخلت من نفس الـ IP
//   · تعديل (الاسم/الصف/المدينة/المسار/ملاحظة) · حظر دائم · إيقاف مؤقت · تفعيل اشتراك
//   · واتساب ومحادثة ونتائج الطالب بضغطة
//  الصلاحيات: تعديل = students_edit · حظر/إيقاف = students_block · تفعيل = subs (المدير كل شيء)
// ══════════════════════════════════════════════════════════════
import { createContext, useContext, useEffect, useState } from 'react';
import {
  List, Datagrid, TextField, DateField, FunctionField,
  Show, SearchInput, TextInput, SelectInput, FilterButton, ExportButton,
  TopToolbar, Pagination, useRecordContext, useListContext, useNotify, useRefresh, Title, useRedirect,
} from 'react-admin';
import { Link } from 'react-router-dom';
import {
  Box, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField as MuiText, MenuItem, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, Card, CardContent, Grid, LinearProgress, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PublicIcon from '@mui/icons-material/Public';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ForumIcon from '@mui/icons-material/Forum';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { supabase } from '../../supabaseClient';
import { useAccess } from '../../access';
import { ActivateDialog } from '../Dashboard';

type Stu = {
  id: number; mob: string; name?: string | null; grade?: number | null; city?: string | null; track?: string | null;
  plan?: string | null; active?: boolean | null; sub_end?: string | null; created_at?: string | null; last_login?: string | null;
  blocked?: boolean | null; blocked_reason?: string | null; suspended_until?: string | null; admin_note?: string | null;
};
const GRADES: Record<number, string> = {
  1: 'الأول ابتدائي', 2: 'الثاني ابتدائي', 3: 'الثالث ابتدائي', 4: 'الرابع ابتدائي', 5: 'الخامس ابتدائي', 6: 'السادس ابتدائي',
  7: 'الأول متوسط', 8: 'الثاني متوسط', 9: 'الثالث متوسط', 10: 'الأول ثانوي', 11: 'الثاني ثانوي', 12: 'الثالث ثانوي', 13: 'جامعي', 14: 'موظف/قدرات',
};
const fmt = (d?: string | null, time = false) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(+x) ? '—' : x.toLocaleString('ar-SA', time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
};
const isSuspended = (r: Stu) => !!r.suspended_until && new Date(r.suspended_until) > new Date();
const isPaid = (r: Stu) => !!r.active && (!r.sub_end || new Date(r.sub_end) >= new Date(new Date().toDateString()));

/* ── الحالة ── */
const StatusChip = ({ r }: { r: Stu }) => {
  if (r.blocked) return <Chip size="small" color="error" icon={<BlockIcon />} label="محظور" />;
  if (isSuspended(r)) return <Tooltip title={`حتى ${fmt(r.suspended_until, true)}`}><Chip size="small" color="warning" icon={<PauseCircleIcon />} label="موقوف" /></Tooltip>;
  if (isPaid(r)) return <Chip size="small" color="success" variant="outlined" label={`مشترك${r.plan ? ' · ' + r.plan : ''}`} />;
  return <Chip size="small" variant="outlined" label="مجاني" />;
};

/* ── آخر IP لكل صفوف الصفحة بطلب واحد ── */
type LastIp = Record<string, { ip: string; at: string }>;
const LastIpCtx = createContext<LastIp>({});
const LastIpProvider = ({ children }: { children: React.ReactNode }) => {
  const { data } = useListContext<Stu>();
  const [map, setMap] = useState<LastIp>({});
  const key = (data || []).map((r) => r.mob).join(',');
  useEffect(() => {
    const mobs = (data || []).map((r) => r.mob).filter(Boolean);
    if (!mobs.length) return;
    let on = true;
    supabase.rpc('admin_last_logins', { p_mobs: mobs }).then(({ data: rows }) => {
      if (!on || !Array.isArray(rows)) return;
      const m: LastIp = {};
      rows.forEach((x: any) => { m[x.mob] = { ip: x.ip, at: x.at }; });
      setMap(m);
    });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <LastIpCtx.Provider value={map}>{children}</LastIpCtx.Provider>;
};
const LastIpCell = () => {
  const r = useRecordContext<Stu>();
  const m = useContext(LastIpCtx);
  const x = r ? m[r.mob] : undefined;
  if (!x) return <Typography variant="caption" color="text.disabled">—</Typography>;
  return (
    <Box>
      <Typography variant="body2" dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{x.ip}</Typography>
      <Typography variant="caption" color="text.secondary">{fmt(x.at, true)}</Typography>
    </Box>
  );
};

/* ═════════════ نوافذ الإجراءات ═════════════ */
const EditDialog = ({ r, onClose }: { r: Stu; onClose: () => void }) => {
  const notify = useNotify(); const refresh = useRefresh();
  const [f, setF] = useState({ name: r.name || '', grade: r.grade || 1, city: r.city || '', track: r.track || '', admin_note: r.admin_note || '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const upd: Record<string, unknown> = { name: f.name.trim() || r.name, grade: Number(f.grade), admin_note: f.admin_note.trim() || null };
    if (f.city !== (r.city || '')) upd.city = f.city.trim() || null;
    if (f.track !== (r.track || '')) upd.track = f.track.trim() || null;
    const { error } = await supabase.from('students').update(upd).eq('mob', r.mob);
    setBusy(false);
    if (error) { notify(`تعذّر الحفظ: ${error.message}`, { type: 'error' }); return; }
    notify('تم الحفظ ✓', { type: 'success' }); refresh(); onClose();
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} dir="rtl" fullWidth maxWidth="sm">
      <DialogTitle>تعديل بيانات الطالب — <span dir="ltr">{r.mob}</span></DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5} sx={{ mt: .5 }}>
          <Grid item xs={12} sm={6}><MuiText fullWidth label="الاسم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}>
            <MuiText select fullWidth label="الصف" value={f.grade} onChange={(e) => setF({ ...f, grade: Number(e.target.value) })}>
              {Object.entries(GRADES).map(([k, v]) => <MenuItem key={k} value={Number(k)}>{k} — {v}</MenuItem>)}
            </MuiText>
          </Grid>
          <Grid item xs={12} sm={6}><MuiText fullWidth label="المدينة" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}><MuiText fullWidth label="المسار (ثانوي)" value={f.track} onChange={(e) => setF({ ...f, track: e.target.value })} /></Grid>
          <Grid item xs={12}><MuiText fullWidth multiline minRows={2} label="ملاحظة إدارية (لا يراها الطالب)" value={f.admin_note} onChange={(e) => setF({ ...f, admin_note: e.target.value })} /></Grid>
        </Grid>
        {Number(f.grade) !== Number(r.grade) && <Alert severity="info" sx={{ mt: 1.5 }}>تغيير الصف يغيّر الاختبارات اللي تظهر للطالب من دخوله القادم.</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" onClick={save} disabled={busy}>حفظ</Button>
      </DialogActions>
    </Dialog>
  );
};

const BlockDialog = ({ r, mode, onClose }: { r: Stu; mode: 'block' | 'suspend'; onClose: () => void }) => {
  const notify = useNotify(); const refresh = useRefresh();
  const [reason, setReason] = useState(r.blocked_reason || '');
  const [days, setDays] = useState<string>('3');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const upd: Record<string, unknown> = { blocked_reason: reason.trim() || null, blocked_at: new Date().toISOString(), blocked_by: user?.email || null };
    if (mode === 'block') upd.blocked = true;
    else {
      const d = days === 'custom' ? new Date(until + 'T23:59:00') : new Date(Date.now() + Number(days) * 86400000);
      if (isNaN(+d) || d <= new Date()) { setBusy(false); notify('اختر تاريخاً في المستقبل', { type: 'warning' }); return; }
      upd.suspended_until = d.toISOString();
    }
    const { error } = await supabase.from('students').update(upd).eq('mob', r.mob);
    setBusy(false);
    if (error) { notify(`تعذّر التنفيذ: ${error.message}`, { type: 'error' }); return; }
    notify(mode === 'block' ? 'تم حظر الطالب' : 'تم إيقاف الطالب مؤقتاً', { type: 'success' }); refresh(); onClose();
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} dir="rtl" fullWidth maxWidth="xs">
      <DialogTitle>{mode === 'block' ? 'حظر الطالب' : 'إيقاف مؤقت'} — {r.name || r.mob}</DialogTitle>
      <DialogContent>
        <Alert severity={mode === 'block' ? 'error' : 'warning'} sx={{ mb: 2 }}>
          {mode === 'block'
            ? 'يُمنع من الدخول نهائياً، وتنتهي جلسته الحالية خلال دقيقة. تقدر تفك الحظر في أي وقت.'
            : 'يُمنع من الدخول حتى التاريخ المحدد، ثم يرجع حسابه تلقائياً.'}
        </Alert>
        {mode === 'suspend' && (
          <Box mb={2}>
            <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, v) => v && setDays(v)} sx={{ flexWrap: 'wrap' }}>
              <ToggleButton value="1">يوم</ToggleButton>
              <ToggleButton value="3">3 أيام</ToggleButton>
              <ToggleButton value="7">أسبوع</ToggleButton>
              <ToggleButton value="30">شهر</ToggleButton>
              <ToggleButton value="custom">تاريخ محدد</ToggleButton>
            </ToggleButtonGroup>
            {days === 'custom' && <MuiText type="date" fullWidth size="small" sx={{ mt: 1.5 }} value={until} onChange={(e) => setUntil(e.target.value)} InputLabelProps={{ shrink: true }} label="حتى" />}
          </Box>
        )}
        <MuiText fullWidth multiline minRows={2} label="السبب (يظهر للطالب عند محاولة الدخول)" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="مثال: مشاركة الحساب مع أكثر من شخص" inputProps={{ maxLength: 120 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" color={mode === 'block' ? 'error' : 'warning'} onClick={save} disabled={busy}>{mode === 'block' ? 'حظر' : 'إيقاف'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const LoginsDialog = ({ r, onClose }: { r: Stu; onClose: () => void }) => {
  const [rows, setRows] = useState<any[] | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [acc, setAcc] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.rpc('admin_student_logins', { p_mob: r.mob, p_limit: 60 })
      .then(({ data, error }) => { if (error) setErr(error.message); setRows(data || []); });
  }, [r.mob]);
  const openIp = (x: string) => {
    setIp(x); setAcc(null);
    supabase.rpc('admin_ip_accounts', { p_ip: x }).then(({ data }) => setAcc(data || []));
  };
  const ACT: Record<string, { l: string; c: 'success' | 'error' | 'warning' | 'default' }> = {
    LOGIN_OK: { l: 'دخول', c: 'success' }, LOGIN_FAIL: { l: 'فشل', c: 'error' }, LOGIN_LOCKED: { l: 'قفل', c: 'warning' },
    LOGIN_BLOCKED: { l: 'محاولة وهو محظور', c: 'error' }, AUTO_REGISTER: { l: 'تسجيل', c: 'default' },
  };
  const distinct = [...new Set((rows || []).filter((x) => x.ip).map((x) => x.ip as string))];
  return (
    <Dialog open onClose={onClose} dir="rtl" fullWidth maxWidth="md">
      <DialogTitle>سجل الدخول وعناوين IP — {r.name || ''} <span dir="ltr">{r.mob}</span></DialogTitle>
      <DialogContent>
        {rows === null && <LinearProgress />}
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}{/function|admin_student_logins/.test(err) ? ' — شغّل ملف 17-students-admin.sql' : ''}</Alert>}
        {rows && rows.length === 0 && !err && <Alert severity="info">لا يوجد سجل دخول لهذا الرقم بعد.</Alert>}
        {distinct.length > 0 && (
          <Box mb={2}>
            <Typography fontWeight={800} mb={.5}>العناوين المستخدمة ({distinct.length}) — اضغط على أي عنوان لمعرفة الحسابات الأخرى اللي دخلت منه</Typography>
            <Box display="flex" gap={.75} flexWrap="wrap">
              {distinct.map((x) => <Chip key={x} dir="ltr" icon={<PublicIcon />} label={x} onClick={() => openIp(x)} color={ip === x ? 'primary' : 'default'} sx={{ fontFamily: 'monospace' }} />)}
            </Box>
          </Box>
        )}
        {ip && (
          <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
            <Typography fontWeight={800} mb={1}>حسابات دخلت من <span dir="ltr" style={{ fontFamily: 'monospace' }}>{ip}</span></Typography>
            {acc === null ? <LinearProgress /> : (
              <>
                {acc.length > 1 && <Alert severity="warning" sx={{ mb: 1 }}>{acc.length} حسابات من نفس العنوان — قد يكون جهاز عائلة أو مدرسة، أو مشاركة حساب.</Alert>}
                <Table size="small"><TableBody>
                  {acc.map((a) => (
                    <TableRow key={a.mob}>
                      <TableCell dir="ltr" sx={{ fontFamily: 'monospace' }}>{a.mob}</TableCell>
                      <TableCell>{a.name || '—'}</TableCell>
                      <TableCell>{a.logins} دخول</TableCell>
                      <TableCell>{fmt(a.last_at, true)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </>
            )}
          </CardContent></Card>
        )}
        {rows && rows.length > 0 && (
          <Table size="small">
            <TableHead><TableRow><TableCell>الوقت</TableCell><TableCell>العملية</TableCell><TableCell>IP</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((x, i) => (
                <TableRow key={i} hover>
                  <TableCell>{fmt(x.at, true)}</TableCell>
                  <TableCell><Chip size="small" color={(ACT[x.action]?.c || 'default') as any} label={ACT[x.action]?.l || x.action} /></TableCell>
                  <TableCell dir="ltr" sx={{ fontFamily: 'monospace', cursor: x.ip ? 'pointer' : 'default' }} onClick={() => x.ip && openIp(x.ip)}>{x.ip || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>إغلاق</Button></DialogActions>
    </Dialog>
  );
};

/* ── حذف نهائي (المدير فقط) ── */
const DeleteDialog = ({ r, onClose }: { r: Stu; onClose: () => void }) => {
  const notify = useNotify(); const refresh = useRefresh(); const redirect = useRedirect();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_delete_student', { p_mob: r.mob });
    setBusy(false);
    if (error) {
      notify(/admin_delete_student|function/.test(error.message) ? 'شغّل ملف 18-delete-student.sql أولاً' : `تعذّر الحذف: ${error.message}`, { type: 'error' });
      return;
    }
    const d = (data || {}) as Record<string, number>;
    const extra = Object.entries(d).filter(([k]) => k !== 'students').reduce((a, [, v]) => a + Number(v || 0), 0);
    notify(`تم حذف الطالب${extra ? ` و${extra} سجل مرتبط به` : ''}`, { type: 'success' });
    onClose();
    if (/\/students\/\d+/.test(window.location.hash)) redirect('list', 'students'); else refresh();
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} dir="rtl" fullWidth maxWidth="xs">
      <DialogTitle sx={{ color: 'error.main' }}>حذف الطالب نهائياً</DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          يُحذف حساب <b>{r.name || '—'}</b> وكل بياناته: النتائج والمحادثات والطلبات. <b>لا يمكن التراجع.</b>
          <br />المدفوعات وسجلات الأمان تبقى محفوظة.
        </Alert>
        {r.active && <Alert severity="warning" sx={{ mb: 2 }}>هذا الطالب <b>مشترك حالياً</b> — هل الأفضل حظره بدل حذفه؟</Alert>}
        <MuiText fullWidth autoFocus label="اكتب رقم الجوال للتأكيد" value={typed} onChange={(e) => setTyped(e.target.value.trim())}
          placeholder={r.mob} inputProps={{ dir: 'ltr', inputMode: 'numeric' }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" color="error" onClick={go} disabled={busy || typed !== r.mob}>حذف نهائياً</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ── أيقونات الإجراءات (القائمة وصفحة الطالب) ── */
const StudentActions = ({ r, compact }: { r: Stu; compact?: boolean }) => {
  const { can, isAdmin } = useAccess();
  const notify = useNotify(); const refresh = useRefresh();
  const [dlg, setDlg] = useState<null | 'edit' | 'block' | 'suspend' | 'ips' | 'activate' | 'delete'>(null);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const lift = async (what: 'block' | 'suspend') => {
    if (!window.confirm(what === 'block' ? 'فك الحظر عن الطالب؟' : 'إلغاء الإيقاف المؤقت؟')) return;
    const upd = what === 'block' ? { blocked: false } : { suspended_until: null };
    const { error } = await supabase.from('students').update(upd).eq('mob', r.mob);
    if (error) { notify(error.message, { type: 'error' }); return; }
    notify(what === 'block' ? 'تم فك الحظر' : 'تم إلغاء الإيقاف', { type: 'success' }); refresh();
  };
  const wa = '966' + String(r.mob || '').replace(/^0/, '');
  const sz = compact ? 'small' : 'medium';
  return (
    <Box onClick={stop} display="flex" alignItems="center" gap={compact ? 0 : .5} flexWrap="wrap">
      {can('students_edit') && <Tooltip title="تعديل"><IconButton size={sz} onClick={() => setDlg('edit')}><EditIcon fontSize="small" /></IconButton></Tooltip>}
      {can('students_block') && (r.blocked
        ? <Tooltip title="فك الحظر"><IconButton size={sz} color="success" onClick={() => lift('block')}><LockOpenIcon fontSize="small" /></IconButton></Tooltip>
        : <Tooltip title="حظر"><IconButton size={sz} color="error" onClick={() => setDlg('block')}><BlockIcon fontSize="small" /></IconButton></Tooltip>)}
      {can('students_block') && (isSuspended(r)
        ? <Tooltip title="إلغاء الإيقاف"><IconButton size={sz} color="success" onClick={() => lift('suspend')}><PlayCircleIcon fontSize="small" /></IconButton></Tooltip>
        : <Tooltip title="إيقاف مؤقت"><IconButton size={sz} color="warning" onClick={() => setDlg('suspend')}><PauseCircleIcon fontSize="small" /></IconButton></Tooltip>)}
      {(can('students_edit') || can('students_block')) && <Tooltip title="سجل الدخول و IP"><IconButton size={sz} onClick={() => setDlg('ips')}><PublicIcon fontSize="small" /></IconButton></Tooltip>}
      {can('subs') && <Tooltip title="تفعيل اشتراك"><IconButton size={sz} color="primary" onClick={() => setDlg('activate')}><WorkspacePremiumIcon fontSize="small" /></IconButton></Tooltip>}
      {can('students_edit') && <Tooltip title="محادثة الطالب"><IconButton size={sz} component={Link} to={`/inbox?mob=${r.mob}`}><ForumIcon fontSize="small" /></IconButton></Tooltip>}
      {can('students_edit') && <Tooltip title="نتائج الاختبارات"><IconButton size={sz} component={Link} to={`/examResults?filter=${encodeURIComponent(JSON.stringify({ mob: r.mob }))}`}><AssignmentIcon fontSize="small" /></IconButton></Tooltip>}
      <Tooltip title="واتساب"><IconButton size={sz} component="a" href={`https://wa.me/${wa}`} target="_blank" rel="noopener" sx={{ color: '#25D366' }}><WhatsAppIcon fontSize="small" /></IconButton></Tooltip>
      {isAdmin && <Tooltip title="حذف نهائي"><IconButton size={sz} color="error" onClick={() => setDlg('delete')}><DeleteForeverIcon fontSize="small" /></IconButton></Tooltip>}

      {dlg === 'edit' && <EditDialog r={r} onClose={() => setDlg(null)} />}
      {(dlg === 'block' || dlg === 'suspend') && <BlockDialog r={r} mode={dlg} onClose={() => setDlg(null)} />}
      {dlg === 'ips' && <LoginsDialog r={r} onClose={() => setDlg(null)} />}
      {dlg === 'activate' && <ActivateDialog row={r} onClose={() => setDlg(null)} onDone={refresh} />}
      {dlg === 'delete' && <DeleteDialog r={r} onClose={() => setDlg(null)} />}
    </Box>
  );
};

/* ═════════════ القائمة ═════════════ */
const StudentFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
  <TextInput source="name" label="الاسم" key="name" />,
  <SelectInput source="grade" label="الصف" key="grade" choices={Object.entries(GRADES).map(([k, v]) => ({ id: Number(k), name: `${k} — ${v}` }))} />,
  <SelectInput source="blocked" label="الحظر" key="blocked" choices={[{ id: true, name: 'المحظورون فقط' }]} />,
  <SelectInput source="active" label="الاشتراك" key="active" choices={[{ id: true, name: 'المفعّلون' }, { id: false, name: 'غير المفعّلين' }]} />,
];

const StudentListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const LargePagination = () => (
  <Pagination rowsPerPageOptions={[25, 50, 100]} />
);

export const StudentList = () => (
  <List
    title="الطلاب"
    filters={StudentFilters}
    actions={<StudentListActions />}
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'id', order: 'DESC' }}
  >
    <LastIpProvider>
      <Datagrid rowClick="show" bulkActionButtons={false}
        rowSx={(r: any) => (r?.blocked ? { bgcolor: 'rgba(220,38,38,.06)' } : isSuspended(r) ? { bgcolor: 'rgba(245,158,11,.07)' } : {})}>
        <TextField source="id" label="#" />
        <TextField source="mob" label="رقم الجوال" />
        <TextField source="name" label="الاسم" />
        <TextField source="grade" label="الصف" />
        <FunctionField label="الحالة" render={(r: Stu) => <StatusChip r={r} />} />
        <FunctionField label="آخر دخول / IP" render={() => <LastIpCell />} />
        <TextField source="city" label="المدينة" />
        <DateField source="created_at" label="تاريخ التسجيل" locales="ar-SA" />
        <FunctionField label="إجراءات" render={(r: Stu) => <StudentActions r={r} compact />} />
      </Datagrid>
    </LastIpProvider>
  </List>
);

/* ═════════════ صفحة الطالب ═════════════ */
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <Box display="flex" gap={1} py={.75} borderBottom="1px solid" borderColor="divider">
    <Typography color="text.secondary" minWidth={130}>{k}</Typography><Box fontWeight={700}>{v}</Box>
  </Box>
);
const ShowBody = () => {
  const r = useRecordContext<Stu>();
  if (!r) return <LinearProgress />;
  return (
    <Box p={{ xs: 1.5, md: 2.5 }}>
      <Title title={`الطالب ${r.name || r.mob}`} />
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mb={2}>
        <Typography variant="h5" fontWeight={800}>{r.name || '—'}</Typography>
        <Typography dir="ltr" sx={{ fontFamily: 'monospace' }} color="text.secondary">{r.mob}</Typography>
        <StatusChip r={r} />
        <Box flex={1} />
        <StudentActions r={r} />
      </Box>
      {r.blocked && <Alert severity="error" sx={{ mb: 2 }}>محظور{r.blocked_reason ? ` — ${r.blocked_reason}` : ''}</Alert>}
      {isSuspended(r) && <Alert severity="warning" sx={{ mb: 2 }}>موقوف حتى {fmt(r.suspended_until, true)}{r.blocked_reason ? ` — ${r.blocked_reason}` : ''}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Card><CardContent>
          <Row k="#" v={r.id} />
          <Row k="الصف" v={r.grade ? `${r.grade} — ${GRADES[r.grade] || ''}` : '—'} />
          <Row k="المسار" v={r.track || '—'} />
          <Row k="المدينة" v={r.city || '—'} />
          <Row k="تاريخ التسجيل" v={fmt(r.created_at, true)} />
        </CardContent></Card></Grid>
        <Grid item xs={12} md={6}><Card><CardContent>
          <Row k="الباقة" v={r.plan || 'مجاني'} />
          <Row k="الاشتراك" v={isPaid(r) ? 'فعّال' : 'غير مفعّل'} />
          <Row k="ينتهي" v={fmt(r.sub_end)} />
          <Row k="ملاحظة إدارية" v={r.admin_note || '—'} />
        </CardContent></Card></Grid>
      </Grid>
    </Box>
  );
};
export const StudentShow = () => (
  <Show title="بيانات الطالب" actions={false} component="div">
    <ShowBody />
  </Show>
);
