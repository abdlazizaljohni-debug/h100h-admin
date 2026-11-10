import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Switch, FormControlLabel,
  Divider, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Alert, Chip, CircularProgress,
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
  Tabs, Tab, Tooltip, Snackbar
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../../supabaseClient';
import { Title, useNotify } from 'react-admin';

interface PrivacySettings {
  mask_phone: boolean;
  mask_email: boolean;
  mask_national_id: boolean;
  results_visible_to_supervisors: boolean;
  results_visible_to_parents: boolean;
  allow_student_control: boolean;
  restrict_profile_access: boolean;
  require_reason_for_access: boolean;
}

const defaultSettings: PrivacySettings = {
  mask_phone: false,
  mask_email: false,
  mask_national_id: true,
  results_visible_to_supervisors: true,
  results_visible_to_parents: true,
  allow_student_control: false,
  restrict_profile_access: false,
  require_reason_for_access: false,
};

function maskValue(value: string, type: 'phone' | 'email'): string {
  if (!value) return '—';
  if (type === 'phone') return value.slice(0, 3) + '****' + value.slice(-2);
  if (type === 'email') {
    const [user, domain] = value.split('@');
    return user.slice(0, 2) + '***@' + domain;
  }
  return value;
}

export function StudentPrivacyPage() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const notify = useNotify();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_privacy_settings')
        .select('*')
        .eq('id', 'global')
        .single();

      if (data && !error) {
        setSettings({ ...defaultSettings, ...data.settings });
      }
    } catch {
      // استخدم الإعدادات الافتراضية إذا لم يوجد الجدول بعد
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_privacy_settings')
        .upsert({ id: 'global', settings, updated_at: new Date().toISOString() });

      if (error) throw error;
      setSnackbar({ open: true, message: 'تم حفظ الإعدادات بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الحفظ — تأكد من وجود جدول admin_privacy_settings', severity: 'error' });
    }
    setSaving(false);
  };

  const toggleSetting = (key: keyof PrivacySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const searchStudent = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setFoundStudent(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, email, phone, created_at, is_active')
        .or(`id.eq.${searchId},email.ilike.%${searchId}%,phone.ilike.%${searchId}%`)
        .limit(1)
        .single();

      if (data && !error) {
        setFoundStudent(data);
      } else {
        setSnackbar({ open: true, message: 'لم يُعثر على الطالب', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في البحث', severity: 'error' });
    }
    setSearching(false);
  };

  const deleteStudentData = async () => {
    if (!foundStudent || confirmText !== 'حذف نهائي') return;
    setDeleting(true);
    try {
      // حذف البيانات المرتبطة بالطالب
      const tables = [
        'exam_results',
        'subscriptions',
        'notifications',
        'messages',
        'student_updates',
        'site_visits',
      ];

      for (const table of tables) {
        await supabase.from(table).delete().eq('student_id', foundStudent.id);
      }

      // حذف الطالب نفسه
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', foundStudent.id);

      if (error) throw error;

      setSnackbar({ open: true, message: `تم حذف جميع بيانات الطالب ${foundStudent.name} بشكل نهائي`, severity: 'success' });
      setFoundStudent(null);
      setDeleteDialog(false);
      setConfirmText('');
      setSearchId('');
    } catch (err: any) {
      setSnackbar({ open: true, message: `خطأ في الحذف: ${err.message}`, severity: 'error' });
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Title title="خصوصية الطالب" />

      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <SecurityIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">خصوصية الطالب</Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة وحماية البيانات الشخصية للطلاب
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<VisibilityOffIcon />} iconPosition="start" label="إخفاء البيانات" />
        <Tab icon={<VerifiedUserIcon />} iconPosition="start" label="ظهور النتائج" />
        <Tab icon={<LockIcon />} iconPosition="start" label="تقييد الوصول" />
        <Tab icon={<DeleteForeverIcon />} iconPosition="start" label="حذف البيانات" />
      </Tabs>

      {/* تاب 1: إخفاء البيانات الحساسة */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>إخفاء البيانات الحساسة عن المشرفين</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              عند التفعيل، تُعرض البيانات مخفية جزئياً في جميع الشاشات (مثال: 05**1234)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List disablePadding>
              <ListItem>
                <ListItemText
                  primary="إخفاء رقم الجوال"
                  secondary={settings.mask_phone ? `مثال: ${maskValue('0501234567', 'phone')}` : 'الرقم كامل مرئي'}
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.mask_phone}
                    onChange={() => toggleSetting('mask_phone')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="إخفاء البريد الإلكتروني"
                  secondary={settings.mask_email ? `مثال: ${maskValue('student@email.com', 'email')}` : 'البريد كامل مرئي'}
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.mask_email}
                    onChange={() => toggleSetting('mask_email')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="إخفاء رقم الهوية الوطنية"
                  secondary="يُخفى دائماً بشكل افتراضي لحماية الطالب"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.mask_national_id}
                    onChange={() => toggleSetting('mask_national_id')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            {(settings.mask_phone || settings.mask_email) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                سيرى المشرفون البيانات مخفية — المدير فقط يمكنه الكشف عنها
              </Alert>
            )}

            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                variant="contained"
                onClick={saveSettings}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : null}
              >
                حفظ الإعدادات
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* تاب 2: ظهور النتائج */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>التحكم في ظهور نتائج الطلاب</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              حدد من يمكنه الاطلاع على نتائج الطلاب
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List disablePadding>
              <ListItem>
                <ListItemText
                  primary="المشرفون يرون النتائج"
                  secondary="السماح للمشرفين بمشاهدة نتائج الطلاب"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.results_visible_to_supervisors}
                    onChange={() => toggleSetting('results_visible_to_supervisors')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="أولياء الأمور يرون النتائج"
                  secondary="السماح لولي الأمر بمشاهدة نتائج ابنه"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.results_visible_to_parents}
                    onChange={() => toggleSetting('results_visible_to_parents')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="الطالب يتحكم في ظهور نتائجه"
                  secondary="يتيح للطالب إخفاء نتائجه عن أولياء الأمور"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.allow_student_control}
                    onChange={() => toggleSetting('allow_student_control')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                variant="contained"
                onClick={saveSettings}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : null}
              >
                حفظ الإعدادات
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* تاب 3: تقييد الوصول */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>تقييد الوصول لملف الطالب</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              تحكم في من يمكنه الاطلاع على الملف الكامل للطالب
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List disablePadding>
              <ListItem>
                <ListItemText
                  primary="تقييد عرض الملف الكامل"
                  secondary="المشرفون يرون بيانات محدودة فقط — المدير يرى الكل"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.restrict_profile_access}
                    onChange={() => toggleSetting('restrict_profile_access')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="طلب سبب عند الاطلاع"
                  secondary="يُجبر المشرف على كتابة سبب قبل فتح ملف الطالب"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.require_reason_for_access}
                    onChange={() => toggleSetting('require_reason_for_access')}
                    color="primary"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            {settings.restrict_profile_access && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                تأكد من إعداد صلاحيات Supabase RLS بشكل صحيح لتطبيق هذا القيد فعلياً
              </Alert>
            )}

            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                variant="contained"
                onClick={saveSettings}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : null}
              >
                حفظ الإعدادات
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* تاب 4: حذف البيانات */}
      {tab === 3 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <DeleteForeverIcon color="error" />
              <Typography variant="h6" color="error.main">حذف بيانات الطالب نهائياً</Typography>
            </Box>
            <Alert severity="error" sx={{ mb: 3 }}>
              هذه العملية <strong>لا يمكن التراجع عنها</strong>. سيتم حذف جميع بيانات الطالب بما فيها النتائج والاشتراكات والرسائل.
            </Alert>

            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              ابحث عن الطالب
            </Typography>

            <Box display="flex" gap={2} mb={3}>
              <TextField
                label="ID الطالب أو البريد أو الجوال"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchStudent()}
                size="small"
                sx={{ flex: 1 }}
                dir="ltr"
              />
              <Button
                variant="outlined"
                onClick={searchStudent}
                disabled={searching || !searchId.trim()}
                startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
              >
                بحث
              </Button>
            </Box>

            {foundStudent && (
              <Card variant="outlined" sx={{ mb: 3, borderColor: 'error.light' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{foundStudent.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{foundStudent.email}</Typography>
                      <Typography variant="body2" color="text.secondary">{foundStudent.phone}</Typography>
                      <Box mt={1}>
                        <Chip
                          size="small"
                          label={foundStudent.is_active ? 'نشط' : 'غير نشط'}
                          color={foundStudent.is_active ? 'success' : 'default'}
                        />
                      </Box>
                    </Box>
                    <Tooltip title="حذف جميع البيانات نهائياً">
                      <IconButton
                        color="error"
                        onClick={() => setDeleteDialog(true)}
                        size="large"
                      >
                        <PersonOffIcon fontSize="large" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* نافذة تأكيد الحذف */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon /> تأكيد الحذف النهائي
        </DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>
            أنت على وشك حذف جميع بيانات الطالب <strong>{foundStudent?.name}</strong> بشكل نهائي لا رجعة فيه.
          </DialogContentText>
          <DialogContentText mb={2} color="error">
            اكتب <strong>حذف نهائي</strong> في الحقل أدناه للتأكيد:
          </DialogContentText>
          <TextField
            fullWidth
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="حذف نهائي"
            variant="outlined"
            error={confirmText.length > 0 && confirmText !== 'حذف نهائي'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialog(false); setConfirmText(''); }}>
            إلغاء
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={deleteStudentData}
            disabled={confirmText !== 'حذف نهائي' || deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteForeverIcon />}
          >
            تأكيد الحذف النهائي
          </Button>
        </DialogActions>
      </Dialog>

      {/* رسائل النجاح/الخطأ */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
