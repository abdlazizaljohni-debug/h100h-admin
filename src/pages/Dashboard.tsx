import { Card, CardContent, Typography, Grid, Box, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface Stats {
  totalStudents: number;
  totalExams: number;
  activeSubscriptions: number;
  todayLogins: number;
}

const StatCard = ({ title, value, icon, color }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
          </Typography>
        </Box>
        <Box sx={{
          bgcolor: `${color}20`,
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalExams: 0,
    activeSubscriptions: 0,
    todayLogins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, examsRes, subsRes, loginsRes] = await Promise.all([
          supabase.from('subscribers').select('*', { count: 'exact', head: true }),
          supabase.from('exam_results').select('*', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('key_attempt_log')
            .select('*', { count: 'exact', head: true })
            .eq('success', true)
            .gte('attempted_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
        ]);

        setStats({
          totalStudents: studentsRes.count || 0,
          totalExams: examsRes.count || 0,
          activeSubscriptions: subsRes.count || 0,
          todayLogins: loginsRes.count || 0,
        });
      } catch (err) {
        console.error('خطأ في جلب الإحصاءات:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Box p={3}>
      <Box mb={3} display="flex" alignItems="center" gap={1}>
        <Typography variant="h5" fontWeight={700}>لوحة التحكم</Typography>
        <Chip label="h100h.com" color="primary" size="small" />
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الطلاب"
            value={loading ? '...' : stats.totalStudents}
            icon={<PeopleIcon />}
            color="#1a56db"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="نتائج الاختبارات"
            value={loading ? '...' : stats.totalExams}
            icon={<AssignmentIcon />}
            color="#059669"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="اشتراكات نشطة"
            value={loading ? '...' : stats.activeSubscriptions}
            icon={<CardMembershipIcon />}
            color="#7c3aed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="تسجيلات دخول اليوم"
            value={loading ? '...' : stats.todayLogins}
            icon={<TrendingUpIcon />}
            color="#d97706"
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            نظرة عامة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مرحباً بك في لوحة تحكم h100h. تستطيع من هنا إدارة الطلاب، متابعة نتائج الاختبارات، وإدارة الاشتراكات.
          </Typography>
          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            <Chip label="+90,000 طالب" color="primary" variant="outlined" size="small" />
            <Chip label="منصة تعليمية K-17" color="secondary" variant="outlined" size="small" />
            <Chip label="السعودية" variant="outlined" size="small" />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
