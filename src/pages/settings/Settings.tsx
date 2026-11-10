import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Alert, Divider, Chip, List, ListItem, ListItemText,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Grid, Tab, Tabs,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import TuneIcon from '@mui/icons-material/Tune';
import BackupIcon from '@mui/icons-material/Backup';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import { supabase } from '../../supabaseClient';

interface AdminRole {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  created_at: string;
}

interface PlanPrice {
  plan: string;
  price: number;
  updated_at: string;
}

interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

interface BackupLog {
  id: number;
  backup_at: string;
  status: string;
  stats: Record<string, unknown> | null;
}

interface TOTPFactor {
  id: string;
  friendly_name: string;
  created_at: string;
  status: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div hidden={value !== index}>
    {value === index && <Box pt={2}>{children}</Box>}
  </div>
);

export const SettingsPage = () => {
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin roles
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Plan prices
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Record<string, number>>({});

  // App settings
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});

  // Backup log
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // TOTP 2FA
  const [totpFactors, setTotpFactors]   = useState<TOTPFactor[]>([]);
  const [totpLoading, setTotpLoading]   = useState(false);
  const [enrollData, setEnrollData]     = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode]     = useState('');
  const [verifying, setVerifying]       = useState(false);

  useEffect(() => {
    if (tab === 0) loadAdminRoles();
    if (tab === 1) loadPlanPrices();
    if (tab === 2) loadAppSettings();
    if (tab === 3) loadBackups();
    if (tab === 5) loadTotpFactors();
  }, [tab]);

  const loadAdminRoles = async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.from('admin_roles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAdminRoles(data || []);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: m });
    } finally {
      setAdminLoading(false);
    }
  };

  const loadPlanPrices = async () => {
    setPlanLoading(true);
    try {
      const { data, error } = await supabase.from('plan_prices').select('*').order('plan');
      if (error) throw error;
      setPlanPrices(data || []);
      const init: Record<string, number> = {};
      (data || []).forEach((p: PlanPrice) => { init[p.plan] = p.price; });
      setEditingPlan(init);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: m });
    } finally {
      setPlanLoading(false);
    }
  };

  const savePlanPrice = async (plan: string) => {
    try {
      const { error } = await supabase
        .from('plan_prices')
        .update({ price: editingPlan[plan], updated_at: new Date().toISOString() })
        .eq('plan', plan);
      if (error) throw error;
      setMsg({ type: 'success', text: `تم تحديث سعر ${plan} بنجاح ✅` });
      loadPlanPrices();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: m });
    }
  };

  const loadAppSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase.from('app_settings').select('*').order('key');
      if (error) throw error;
      setAppSettings(data || []);
      const init: Record<string, string> = {};
      (data || []).forEach((s: AppSetting) => { init[s.key] = s.value; });
      setEditingSettings(init);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: m });
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveAppSetting = async (key: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: editingSettings[key], updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
      setMsg({ type: 'success', text: `تم حفظ الإعداد "${key}" ✅` });
      loadAppSettings();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: m });
    }
  };

  const loadBackups = async () => {
    setBackupLoading(true);
    try {
      const { data, error } = await supabase.from('backup_log').select('*').order('backup_at', { ascending: false }).limit(50);
      if (error) throw error;
      setBackups(data || []);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: m });
    } finally {
      setBackupLoading(false);
    }
  };

  /* ── TOTP helpers ── */
  const loadTotpFactors = async () => {
    setTotpLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setTotpFactors((data?.totp || []) as TOTPFactor[]);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setTotpLoading(false);
    }
  };

  const startEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'h100h Admin',
      });
      if (error) throw error;
      setEnrollData({
        id:     data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const verifyEnroll = async () => {
    if (!enrollData) return;
    setVerifying(true);
    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
      if (ce) throw ce;

      const { error: ve } = await supabase.auth.mfa.verify({
        factorId:    enrollData.id,
        challengeId: challenge.id,
        code:        verifyCode,
      });
      if (ve) throw ve;

      setMsg({ type: 'success', text: 'تم تفعيل التصديق الثنائي بنجاح ✅' });
      setEnrollData(null);
      setVerifyCode('');
      loadTotpFactors();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setVerifying(false);
    }
  };

  const disableTotp = async (factorId: string) => {
    if (!confirm('هل أنت متأكد من تعطيل التصديق الثنائي؟')) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMsg({ type: 'success', text: 'تم تعطيل التصديق الثنائي' });
      loadTotpFactors();
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const roleColors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    superadmin: 'error',
    admin: 'warning',
    viewer: 'info',
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={2}>الإعدادات</Typography>

      {msg && (
        <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tab icon={<AdminPanelSettingsIcon fontSize="small" />} iconPosition="start" label="المشرفون" />
        <Tab icon={<PriceChangeIcon fontSize="small" />} iconPosition="start" label="أسعار الخطط" />
        <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="إعدادات التطبيق" />
        <Tab icon={<BackupIcon fontSize="small" />} iconPosition="start" label="النسخ الاحتياطية" />
        <Tab icon={<InfoIcon fontSize="small" />} iconPosition="start" label="معلومات النظام" />
        <Tab icon={<SecurityIcon fontSize="small" />} iconPosition="start" label="التصديق الثنائي" />
      </Tabs>

      {/* Admin Roles */}
      <TabPanel value={tab} index={0}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>إدارة المشرفين</Typography>
              <Button size="small" variant="outlined" onClick={loadAdminRoles}>تحديث</Button>
            </Box>
            {adminLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الاسم الكامل</TableCell>
                    <TableCell>user_id</TableCell>
                    <TableCell>الدور</TableCell>
                    <TableCell>تاريخ الإضافة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={2}>لا يوجد مشرفون</Typography>
                      </TableCell>
                    </TableRow>
                  ) : adminRoles.map(r => (
                    <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>{r.full_name || '-'}</TableCell>
                      <TableCell sx={{ direction: 'ltr', textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary' }}>
                        {r.user_id}
                      </TableCell>
                      <TableCell>
                        <Chip label={r.role} color={roleColors[r.role] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Plan Prices */}
      <TabPanel value={tab} index={1}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>أسعار الخطط</Typography>
              <Button size="small" variant="outlined" onClick={loadPlanPrices}>تحديث</Button>
            </Box>
            {planLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الخطة</TableCell>
                    <TableCell>السعر (ريال)</TableCell>
                    <TableCell>آخر تحديث</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {planPrices.map(p => (
                    <TableRow key={p.plan} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{p.plan}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={editingPlan[p.plan] ?? p.price}
                          onChange={e => setEditingPlan(prev => ({ ...prev, [p.plan]: Number(e.target.value) }))}
                          sx={{ width: 120 }}
                          inputProps={{ dir: 'ltr' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {new Date(p.updated_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="contained" onClick={() => savePlanPrice(p.plan)}>
                          حفظ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* App Settings */}
      <TabPanel value={tab} index={2}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>إعدادات التطبيق</Typography>
              <Button size="small" variant="outlined" onClick={loadAppSettings}>تحديث</Button>
            </Box>
            {settingsLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المفتاح</TableCell>
                    <TableCell>القيمة</TableCell>
                    <TableCell>آخر تحديث</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {appSettings.map(s => (
                    <TableRow key={s.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}>
                        {s.key}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editingSettings[s.key] ?? s.value}
                          onChange={e => setEditingSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                          sx={{ minWidth: 200 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {new Date(s.updated_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="contained" onClick={() => saveAppSetting(s.key)}>
                          حفظ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Backup Log */}
      <TabPanel value={tab} index={3}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>سجل النسخ الاحتياطية</Typography>
              <Button size="small" variant="outlined" onClick={loadBackups}>تحديث</Button>
            </Box>
            {backupLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>وقت النسخ</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإحصائيات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" py={2}>لا توجد نسخ احتياطية</Typography>
                      </TableCell>
                    </TableRow>
                  ) : backups.map(b => (
                    <TableRow key={b.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>{b.id}</TableCell>
                      <TableCell>{new Date(b.backup_at).toLocaleString('ar-SA')}</TableCell>
                      <TableCell>
                        <Chip
                          label={b.status}
                          color={b.status === 'success' ? 'success' : b.status === 'running' ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', direction: 'ltr', textAlign: 'right', color: 'text.secondary' }}>
                        {b.stats ? JSON.stringify(b.stats).slice(0, 100) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* System Info */}
      <TabPanel value={tab} index={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>معلومات النظام</Typography>
            <List dense>
              <ListItem><ListItemText primary="المنصة" secondary="h100h.com — تعليمي K-17" /></ListItem>
              <ListItem><ListItemText primary="الإصدار" secondary="React Admin 5 + Vite + TypeScript" /></ListItem>
              <ListItem><ListItemText primary="قاعدة البيانات" secondary="Supabase (PostgreSQL)" /></ListItem>
              <ListItem><ListItemText primary="الطلاب المتوقعون" secondary="+90,000 طالب" /></ListItem>
            </List>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
              <Chip label="RTL عربي" color="primary" size="small" />
              <Chip label="Pagination محلية" color="success" size="small" />
              <Chip label="RLS مُدار" color="warning" size="small" />
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── التصديق الثنائي (TOTP) ── */}
      <TabPanel value={tab} index={5}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              التصديق الثنائي — Google Authenticator
            </Typography>

            {totpLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>

            ) : totpFactors.length > 0 ? (
              /* مفعّل بالفعل */
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  التصديق الثنائي مفعّل ✅ — يُطلب عند كل تسجيل دخول
                </Alert>
                {totpFactors.map(f => (
                  <Box
                    key={f.id}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    p={2}
                    border="1px solid"
                    borderColor="divider"
                    borderRadius={1}
                    mb={1}
                  >
                    <Box>
                      <Typography fontWeight={600}>
                        {f.friendly_name || 'Google Authenticator'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        مفعّل منذ: {new Date(f.created_at).toLocaleDateString('ar-SA')}
                      </Typography>
                    </Box>
                    <Button
                      color="error"
                      variant="outlined"
                      size="small"
                      onClick={() => disableTotp(f.id)}
                    >
                      تعطيل
                    </Button>
                  </Box>
                ))}
              </Box>

            ) : enrollData ? (
              /* إعداد جارٍ — عرض QR Code */
              <Box textAlign="center" py={2}>
                <Typography fontWeight={600} mb={1}>
                  امسح هذا الرمز بتطبيق Google Authenticator
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  أو أدخل المفتاح يدوياً
                </Typography>

                <Box mb={2}>
                  <img
                    src={enrollData.qrCode}
                    alt="QR Code"
                    style={{ width: 200, height: 200, border: '4px solid white' }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    letterSpacing: '0.15em',
                    bgcolor: 'action.hover',
                    px: 2, py: 1,
                    borderRadius: 1,
                    display: 'inline-block',
                    mb: 3,
                    wordBreak: 'break-all',
                  }}
                >
                  {enrollData.secret}
                </Typography>

                <Typography mb={1}>أدخل الرمز من التطبيق للتأكيد:</Typography>
                <TextField
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  sx={{ mb: 2, width: 180 }}
                  inputProps={{
                    dir: 'ltr',
                    maxLength: 6,
                    style: {
                      textAlign: 'center',
                      letterSpacing: '0.6em',
                      fontSize: '1.6rem',
                      fontWeight: 700,
                    },
                  }}
                />

                <Box display="flex" gap={1} justifyContent="center">
                  <Button
                    variant="contained"
                    onClick={verifyEnroll}
                    disabled={verifying || verifyCode.length !== 6}
                    size="large"
                  >
                    {verifying ? <CircularProgress size={20} color="inherit" /> : 'تفعيل'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => { setEnrollData(null); setVerifyCode(''); }}
                  >
                    إلغاء
                  </Button>
                </Box>
              </Box>

            ) : (
              /* غير مفعّل */
              <Box textAlign="center" py={5}>
                <SecurityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary" mb={1}>
                  التصديق الثنائي غير مفعّل
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  أضف طبقة حماية إضافية لحساب الإدارة
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SecurityIcon />}
                  onClick={startEnroll}
                >
                  إعداد Google Authenticator
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};
