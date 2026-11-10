import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Alert,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { supabase } from '../../supabaseClient';

interface GradeStat {
  grade: number;
  total_students: number;
  active_students: number;
  total_exams: number;
  avg_score: number | null;
  question_count: number;
}

const gradeNames: Record<number, string> = {
  1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس', 6: 'السادس',
  7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر', 11: 'الحادي عشر', 12: 'الثاني عشر',
};

export const GradeStatsPage = () => {
  const [stats, setStats] = useState<GradeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('grade_stats')
          .select('*')
          .order('grade', { ascending: true });

        if (error) throw error;
        setStats(data || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalStudents = stats.reduce((s, r) => s + Number(r.total_students || 0), 0);
  const totalActive = stats.reduce((s, r) => s + Number(r.active_students || 0), 0);
  const totalExams = stats.reduce((s, r) => s + Number(r.total_exams || 0), 0);

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <BarChartIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>إحصاءات الصفوف</Typography>
      </Box>

      {loading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {totalStudents.toLocaleString('ar-SA')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">إجمالي الطلاب</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {totalActive.toLocaleString('ar-SA')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">الطلاب النشطون</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {totalExams.toLocaleString('ar-SA')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">إجمالي الاختبارات</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>تفصيل حسب الصف</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الصف</TableCell>
                      <TableCell align="center">إجمالي الطلاب</TableCell>
                      <TableCell align="center">الطلاب النشطون</TableCell>
                      <TableCell align="center">نسبة النشاط</TableCell>
                      <TableCell align="center">إجمالي الاختبارات</TableCell>
                      <TableCell align="center">متوسط الدرجة</TableCell>
                      <TableCell align="center">عدد الأسئلة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.map(row => {
                      const activeRate = row.total_students > 0
                        ? Math.round((Number(row.active_students) / Number(row.total_students)) * 100)
                        : 0;
                      const avgScore = row.avg_score ? Math.round(Number(row.avg_score)) : null;
                      return (
                        <TableRow key={row.grade} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {gradeNames[row.grade] || `الصف ${row.grade}`}
                          </TableCell>
                          <TableCell align="center">{Number(row.total_students).toLocaleString('ar-SA')}</TableCell>
                          <TableCell align="center">{Number(row.active_students).toLocaleString('ar-SA')}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${activeRate}%`}
                              size="small"
                              color={activeRate >= 70 ? 'success' : activeRate >= 40 ? 'warning' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="center">{Number(row.total_exams).toLocaleString('ar-SA')}</TableCell>
                          <TableCell align="center">
                            {avgScore !== null ? (
                              <Chip
                                label={`${avgScore}%`}
                                size="small"
                                color={avgScore >= 80 ? 'success' : avgScore >= 60 ? 'warning' : 'error'}
                              />
                            ) : '-'}
                          </TableCell>
                          <TableCell align="center">{Number(row.question_count).toLocaleString('ar-SA')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};
