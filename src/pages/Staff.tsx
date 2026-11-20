// ══════════════════════════════════════════════════════════════
//  h100h — فريق العمل والصلاحيات · 2026-11-20 · إضافة
//  · StaffPage      (المدير): إضافة موظف (اسم + جوال + كلمة مرور) ومنح/سحب الصلاحيات
//  · MyAccountPage  (الجميع): تغيير كلمة المرور (للوحة الإدارة والبوابة معاً)
//  · DashboardGate  : المدير يرى لوحة التحكم كاملة، والموظف يرى صفحة ترحيب بأقسامه فقط
// ══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { Title, useNotify } from 'react-admin';
import { Link } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel, FormGroup,
  Chip, Alert, Switch, IconButton, Tooltip, LinearProgress, Grid, CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import PhonelinkLockIcon from '@mui/icons-material/PhonelinkLock';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PERMS, staffApi, useAccess } from '../access';
import { Dashboard } from './Dashboard';

type Staff = { id: string; mob: string; name: string; perms: string[]; active: boolean; created_at: string; updated_at?: string };
const permLabel = (k: string) => PERMS.find((p) => p.key === k)?.label || k;

const PermBoxes = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
  <FormGroup>
    {PERMS.map((p) => (
      <FormControlLabel key={p.key} sx={{ alignItems: 'flex-start', mb: .5 }}
        control={<Checkbox sx={{ pt: .25 }} checked={value.includes(p.key)}
          onChange={(e) => onChange(e.target.checked ? [...value, p.key] : value.filter((x) => x !== p.key))} />}
        label={<Box><Typography fontWeight={700} fontSize={14}>{p.label}</Typography>
          <Typography variant="caption" color="text.secondary">{p.hint}</Typography></Box>} />
    ))}
  </FormGroup>
);

/* ═════════════ صفحة فريق العمل (المدير) ═════════════ */
export const StaffPage = () => {
  const notify = useNotify();
  const { isAdmin, loading: aLoading } = useAccess();
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [err, setErr] = useState('');
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<Staff | null>(null);
  const [pw, setPw] = useState<Staff | null>(null);
  const [del, setDel] = useState<Staff | null>(null);

  const load = useCallback(() => {
    setRows(null); setErr('');
    staffApi<{ staff: Staff[] }>({ action: 'list' })
      .then((d) => setRows(d.staff || []))
      .catch((e) => { setErr(e.message); setRows([]); });
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const toggle = async (s: Staff) => {
    try { await staffApi({ action: 'update', id: s.id, active: !s.active }); notify(s.active ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب', { type: 'success' }); load(); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
  };
  const resetMfa = async (s: Staff) => {
    if (!window.confirm(`حذف ربط تطبيق المصادقة لـ ${s.name}؟ سيربطه من جديد عند دخوله القادم.`)) return;
    try { await staffApi({ action: 'reset_mfa', id: s.id }); notify('تم — سيربط التطبيق من جديد عند الدخول', { type: 'success' }); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
  };

  if (aLoading) return <LinearProgress />;
  if (!isAdmin) return <Box p={3}><Alert severity="warning">هذه الصفحة للمدير فقط.</Alert></Box>;

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Title title="فريق العمل والصلاحيات" />
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>فريق العمل والصلاحيات</Typography>
          <Typography variant="body2" color="text.secondary">
            كل موظف يدخل برقم جواله وكلمة مروره (لوحة الإدارة + البوابة)، والتحقق الثنائي إجباري. تقدر تمنح أو تسحب أي صلاحية في أي وقت.
          </Typography>
        </Box>
        <Box flex={1} />
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={rows === null}>تحديث</Button>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAdd(true)}>إضافة موظف</Button>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}{/staff_members|relation/.test(err) ? ' — شغّل ملف 16-staff.sql أولاً' : ''}</Alert>}

      <Card><Box sx={{ overflowX: 'auto' }}>
        {rows === null && <LinearProgress />}
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>الاسم</TableCell><TableCell>الجوال</TableCell><TableCell>الصلاحيات</TableCell>
            <TableCell>الحالة</TableCell><TableCell />
          </TableRow></TableHead>
          <TableBody>
            {rows?.length === 0 && !err && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>لا يوجد موظفون بعد — اضغط «إضافة موظف»</TableCell></TableRow>
            )}
            {(rows || []).map((s) => (
              <TableRow key={s.id} hover sx={{ opacity: s.active ? 1 : .55 }}>
                <TableCell sx={{ fontWeight: 700 }}>{s.name}</TableCell>
                <TableCell dir="ltr" sx={{ fontFamily: 'monospace' }}>{s.mob}</TableCell>
                <TableCell>
                  <Box display="flex" gap={.5} flexWrap="wrap">
                    {s.perms.length ? s.perms.map((p) => <Chip key={p} size="small" color="primary" variant="outlined" label={permLabel(p)} />)
                      : <Typography variant="caption" color="text.secondary">بدون صلاحيات</Typography>}
                  </Box>
                </TableCell>
                <TableCell>
                  <FormControlLabel control={<Switch size="small" checked={s.active} onChange={() => toggle(s)} />}
                    label={<Typography variant="caption">{s.active ? 'فعّال' : 'موقوف'}</Typography>} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="الاسم والصلاحيات"><IconButton size="small" onClick={() => setEdit(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="كلمة مرور جديدة"><IconButton size="small" onClick={() => setPw(s)}><KeyIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="إعادة ربط تطبيق المصادقة (فقد جواله)"><IconButton size="small" onClick={() => resetMfa(s)}><PhonelinkLockIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="حذف الحساب"><IconButton size="small" color="error" onClick={() => setDel(s)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box></Card>

      {add && <AddDialog onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
      {edit && <EditDialog s={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {pw && <PasswordDialog s={pw} onClose={() => setPw(null)} />}
      {del && (
        <Dialog open onClose={() => setDel(null)} dir="rtl">
          <DialogTitle>حذف حساب {del.name}؟</DialogTitle>
          <DialogContent><Typography>يُحذف دخوله للوحة الإدارة نهائياً. (حسابه في البوابة كطالب يبقى بدون صلاحيات.)</Typography></DialogContent>
          <DialogActions>
            <Button onClick={() => setDel(null)}>إلغاء</Button>
            <Button color="error" variant="contained" onClick={async () => {
              try { await staffApi({ action: 'remove', id: del.id }); notify('تم الحذف', { type: 'success' }); setDel(null); load(); }
              catch (e: any) { notify(e.message, { type: 'error' }); }
            }}>حذف نهائياً</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

const AddDialog = ({ onClose, onDone }: { onClose: () => void; onDone: () => void }) => {
  const notify = useNotify();
  const [name, setName] = useState('');
  const [mob, setMob] = useState('');
  const [pass, setPass] = useState('');
  const [perms, setPerms] = useState<string[]>(['questions_view']);
  const [busy, setBusy] = useState(false);
  const mobOk = /^05\d{8}$/.test(mob);
  const ok = name.trim() && mobOk && pass.length >= 8;
  const save = async () => {
    setBusy(true);
    try {
      const r = await staffApi<{ warning?: string }>({ action: 'create', name, mob, password: pass, perms });
      notify(r?.warning ? `تمت الإضافة — ملاحظة: ${r.warning}` : 'تمت إضافة الموظف ✓', { type: r?.warning ? 'warning' : 'success' });
      onDone();
    } catch (e: any) { notify(e.message, { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>إضافة موظف</DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5} sx={{ mt: .5 }}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="الاسم" value={name} onChange={(e) => setName(e.target.value)} /></Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="رقم الجوال" value={mob} inputProps={{ dir: 'ltr', inputMode: 'numeric' }}
              onChange={(e) => setMob(e.target.value.replace(/\D/g, '').slice(0, 10))}
              error={!!mob && !mobOk} helperText={mob && !mobOk ? 'يبدأ بـ 05 ومكوّن من 10 أرقام' : 'يدخل به اللوحة والبوابة'} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="كلمة المرور (8 أحرف على الأقل)" value={pass} onChange={(e) => setPass(e.target.value)}
              helperText="أرسلها للموظف — يقدر يغيّرها بنفسه من «حسابي»" inputProps={{ dir: 'ltr' }} />
          </Grid>
        </Grid>
        <Typography fontWeight={800} mt={2} mb={1}>الصلاحيات</Typography>
        <PermBoxes value={perms} onChange={setPerms} />
        <Alert severity="info" sx={{ mt: 1.5 }}>
          أول دخول للوحة الإدارة سيُطلب منه ربط تطبيق Google Authenticator (إجباري). وفي البوابة يدخل بنفس الرقم وكلمة المرور كطالب.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" onClick={save} disabled={!ok || busy}>{busy ? <CircularProgress size={18} /> : 'إضافة'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const EditDialog = ({ s, onClose, onDone }: { s: Staff; onClose: () => void; onDone: () => void }) => {
  const notify = useNotify();
  const [name, setName] = useState(s.name);
  const [perms, setPerms] = useState<string[]>(s.perms || []);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await staffApi({ action: 'update', id: s.id, name, perms }); notify('تم الحفظ ✓', { type: 'success' }); onDone(); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{s.name} — <span dir="ltr">{s.mob}</span></DialogTitle>
      <DialogContent>
        <TextField fullWidth label="الاسم" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        <Typography fontWeight={800} mb={1}>الصلاحيات</Typography>
        <PermBoxes value={perms} onChange={setPerms} />
        <Typography variant="caption" color="text.secondary">التغيير يطبّق خلال دقيقة تقريباً.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" onClick={save} disabled={!name.trim() || busy}>حفظ</Button>
      </DialogActions>
    </Dialog>
  );
};

const PasswordDialog = ({ s, onClose }: { s: Staff; onClose: () => void }) => {
  const notify = useNotify();
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await staffApi({ action: 'reset_password', id: s.id, password: pass }); notify('تم تعيين كلمة المرور ✓', { type: 'success' }); onClose(); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>كلمة مرور جديدة — {s.name}</DialogTitle>
      <DialogContent>
        <TextField fullWidth autoFocus label="كلمة المرور (8 أحرف على الأقل)" value={pass} onChange={(e) => setPass(e.target.value)} sx={{ mt: 1 }} inputProps={{ dir: 'ltr' }}
          helperText="تتغير للوحة الإدارة والبوابة معاً" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" onClick={save} disabled={pass.length < 8 || busy}>حفظ</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ═════════════ حسابي (الجميع) ═════════════ */
export const MyAccountPage = () => {
  const notify = useNotify();
  const { access, loading } = useAccess();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = p1.length >= 8 && p1 === p2;
  const save = async () => {
    setBusy(true);
    try { await staffApi({ action: 'change_password', password: p1 }); notify('تم تغيير كلمة المرور ✓', { type: 'success' }); setP1(''); setP2(''); }
    catch (e: any) { notify(e.message, { type: 'error' }); }
    finally { setBusy(false); }
  };
  if (loading) return <LinearProgress />;
  return (
    <Box p={{ xs: 1.5, md: 3 }} maxWidth={560}>
      <Title title="حسابي" />
      <Typography variant="h5" fontWeight={800} mb={2}>حسابي</Typography>
      <Card sx={{ mb: 2 }}><CardContent>
        <Typography fontWeight={800} fontSize={18}>{access?.name}</Typography>
        {access?.staff && <Typography color="text.secondary" dir="ltr" textAlign="right">{access.staff.mob}</Typography>}
        <Box display="flex" gap={.5} flexWrap="wrap" mt={1}>
          {access?.isAdmin ? <Chip color="success" label="مدير — كل الصلاحيات" />
            : (access?.perms || []).map((p) => <Chip key={p} size="small" color="primary" variant="outlined" label={permLabel(p)} />)}
        </Box>
      </CardContent></Card>
      <Card><CardContent>
        <Typography fontWeight={800} mb={1}>تغيير كلمة المرور</Typography>
        {access?.staff && <Alert severity="info" sx={{ mb: 2 }}>كلمة المرور الجديدة تعمل في لوحة الإدارة والبوابة معاً.</Alert>}
        <TextField fullWidth type="password" label="كلمة المرور الجديدة (8 أحرف على الأقل)" value={p1} onChange={(e) => setP1(e.target.value)} sx={{ mb: 1.5 }} autoComplete="new-password" />
        <TextField fullWidth type="password" label="تأكيد كلمة المرور" value={p2} onChange={(e) => setP2(e.target.value)} sx={{ mb: 2 }} autoComplete="new-password"
          error={!!p2 && p1 !== p2} helperText={p2 && p1 !== p2 ? 'غير متطابقة' : ' '} />
        <Button variant="contained" onClick={save} disabled={!ok || busy}>{busy ? <CircularProgress size={18} /> : 'حفظ'}</Button>
      </CardContent></Card>
    </Box>
  );
};

/* ═════════════ الصفحة الرئيسية حسب الصلاحية ═════════════ */
const SHORTCUTS: { perm: string; to: string; label: string }[] = [
  { perm: 'questions_view', to: '/question-bank', label: 'بنك الأسئلة (مشاهدة)' },
  { perm: 'questions_edit', to: '/question-bank', label: 'بنك الأسئلة (إضافة وتعديل)' },
  { perm: 'students_edit', to: '/students', label: 'الطلاب' },
  { perm: 'students_edit', to: '/inbox', label: 'صندوق الرسائل' },
  { perm: 'subs', to: '/pendingSubs', label: 'الاشتراكات المعلقة' },
  { perm: 'subs', to: '/payments', label: 'المدفوعات' },
  { perm: 'subs', to: '/coupons', label: 'الكوبونات' },
];
export const DashboardGate = () => {
  const { access, loading, isAdmin } = useAccess();
  if (loading) return <LinearProgress />;
  if (isAdmin) return <Dashboard />;
  const perms = access?.perms || [];
  const links = SHORTCUTS.filter((s) => perms.includes(s.perm))
    .filter((s, i, arr) => arr.findIndex((x) => x.to === s.to) === i);
  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Title title="لوحة التحكم" />
      <Typography variant="h5" fontWeight={800}>أهلاً {access?.staff?.name || ''} 👋</Typography>
      <Typography color="text.secondary" mb={2}>هذه الأقسام المتاحة لك حسب صلاحياتك:</Typography>
      {links.length === 0 && <Alert severity="info">لا توجد صلاحيات مفعّلة لحسابك بعد — تواصل مع الإدارة.</Alert>}
      <Grid container spacing={1.5}>
        {links.map((l) => (
          <Grid item xs={12} sm={6} md={4} key={l.to}>
            <Card><CardContent>
              <Typography fontWeight={800} mb={1}>{l.label}</Typography>
              <Button component={Link} to={l.to} variant="contained" size="small">فتح</Button>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>
      {perms.some((p) => p === 'questions_view' || p === 'questions_edit') && (
        <Alert severity="success" sx={{ mt: 2 }}>
          تقدر تشوف الاختبارات كما يراها الطالب: ادخل <b>h100h.com/portal.html</b> برقم جوالك وكلمة مرورك — يظهر لك «وضع المتابعة» وتتنقل بين كل الصفوف.
        </Alert>
      )}
    </Box>
  );
};
