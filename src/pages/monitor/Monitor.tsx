import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Alert, Button, Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { supabase } from '../../supabaseClient';

interface LoginAttempt {
  id: number;
  mob: string;
  attempted_at: string;
  success: boolean;
  ip_address: string | null;
}

interface ExamScore {
  subject: string;
  avg_score: number;
  count: number;
}

export const MonitorPage = () => {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [examScores, setExamScores] = useState<ExamScore[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [examError, setExamError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(true);
  const [examLoading, setExamLoading] = useState(true);

  const loadLoginAttempts = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase
        .from('key_attempt_log')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLoginAttempts(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const loadExamScores = async () => {
    setExamLoading(true);
    setExamError(null);
    try {
      // Fetch last 500 results and group client-side (PostgREST doesn't support GROUP BY directly)
      const { data, error } = await supabase
        .from('exam_results')
        .select('subject, score')
        .order('id', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Group by subject
      const grouped: Record<string, { total: number; count: number }> = {};
      (data || []).forEach((row: { subject: string; score: number }) => {
        if (!grouped[row.subject]) grouped[row.subject] = { total: 0, count: 0 };
        grouped[row.subject].total += Number(row.score) || 0;
        grouped[row.subject].count += 1;
      });

      const scores: ExamScore[] = Object.entries(grouped).map(([subject, { total, count }]) => ({
        subject,
        avg_score: Math.round(total / count),
        count,
      })).sort((a, b) => b.avg_score - a.avg_score);

      setExamScores(scores);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExamError(msg);
    } finally {
      setExamLoading(false);
    }
  };

  useEffect(() => {
    loadLoginAttempts();
    loadExamScores();
  }, []);

  const successCount = loginAttempts.filter(a => a.success).length;
  const failCount = loginAttempts.filter(a => !a.success).length;

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700}>مراقب النظام</Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={() => { loadLoginAttempts(); loadExamScores(); }}
        >
          تحديث
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Login Attempts */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  إحصاء تسجيل الدخول (آخر 50)
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip label={`✓ ${successCount}`} color="success" size="small" />
                  <Chip label={`✗ ${failCount}`} color="error" size="small" />
                </Box>
              </Box>

              {loginLoading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
              {loginError && <Alert severity="error">{loginError}</Alert>}
              {!loginLoading && !loginError && (
                <Box sx={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>الجوال</TableCell>
                        <TableCell>الوقت</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>IP</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loginAttempts.map(row => (
                        <TableRow key={row.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>{row.mob}</TableCell>
                          <TableCell sx={{ direction: 'ltr', textAlign: 'right' }}>
                            {new Date(row.attempted_at).toLocaleString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.success ? 'نجح' : 'فشل'}
                              color={row.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ direction: 'ltr', textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary' }}>
                            {row.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Exam Score Distribution */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                توزيع درجات الاختبارات
              </Typography>

              {examLoading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
              {examError && <Alert severity="error">{examError}</Alert>}
              {!examLoading && !examError && (
                <Box>
                  {examScores.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={3}>
                      لا توجد بيانات
                    </Typography>
                  ) : (
                    examScores.map((item, idx) => (
                      <Box key={idx} mb={2}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight={500}>{item.subject}</Typography>
                          <Box display="flex" gap={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {item.count} اختبار
                            </Typography>
                            <Chip
                              label={`${item.avg_score}%`}
                              size="small"
                              color={item.avg_score >= 80 ? 'success' : item.avg_score >= 60 ? 'warning' : 'error'}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ bgcolor: 'grey.200', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${item.avg_score}%`,
                              bgcolor: item.avg_score >= 80 ? 'success.main' : item.avg_score >= 60 ? 'warning.main' : 'error.main',
                              borderRadius: 1,
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
