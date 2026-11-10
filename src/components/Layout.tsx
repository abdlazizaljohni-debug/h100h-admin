import { Layout as RALayout, AppBar, TitlePortal, Menu, usePermissions } from 'react-admin';
import { Box, Typography, Chip, Divider } from '@mui/material';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MonitorIcon from '@mui/icons-material/Monitor';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import QuizIcon from '@mui/icons-material/Quiz';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrafficIcon from '@mui/icons-material/Traffic';
import ChatIcon from '@mui/icons-material/Chat';
import PendingIcon from '@mui/icons-material/Pending';
import BarChartIcon from '@mui/icons-material/BarChart';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import UpdateIcon from '@mui/icons-material/Update';
import SecurityIcon from '@mui/icons-material/Security';

const SectionLabel = ({ label }: { label: string }) => (
  <Box px={2} pt={1.5} pb={0.5}>
    <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
    </Typography>
  </Box>
);

const CustomMenu = () => {
  const { permissions } = usePermissions();

  return (
    <Menu>
      {/* لوحة التحكم */}
      <Menu.DashboardItem primaryText="لوحة التحكم" leftIcon={<DashboardIcon />} />

      <Divider sx={{ my: 0.5 }} />
      <SectionLabel label="الطلاب والاشتراكات" />
      <Menu.Item to="/students" primaryText="الطلاب" leftIcon={<PeopleIcon />} />
      <Menu.Item to="/subscriptions" primaryText="الاشتراكات" leftIcon={<CardMembershipIcon />} />
      <Menu.Item to="/pendingSubs" primaryText="الاشتراكات المعلقة" leftIcon={<PendingIcon />} />
      <Menu.Item to="/parents" primaryText="متابعة الأهل" leftIcon={<FamilyRestroomIcon />} />
      <Menu.Item to="/studentUpdates" primaryText="تحديثات الطلاب" leftIcon={<UpdateIcon />} />
      <Menu.Item to="/privacy" primaryText="خصوصية الطالب" leftIcon={<SecurityIcon />} />

      <Divider sx={{ my: 0.5 }} />
      <SectionLabel label="الاختبارات والمحتوى" />
      <Menu.Item to="/examResults" primaryText="نتائج الاختبارات" leftIcon={<AssignmentIcon />} />
      <Menu.Item to="/questions" primaryText="الأسئلة" leftIcon={<QuizIcon />} />
      <Menu.Item to="/curriculumQuestions" primaryText="أسئلة المنهج" leftIcon={<MenuBookIcon />} />
      <Menu.Item to="/grade-stats" primaryText="إحصاءات الصفوف" leftIcon={<BarChartIcon />} />

      <Divider sx={{ my: 0.5 }} />
      <SectionLabel label="التواصل والتسويق" />
      <Menu.Item to="/notifications" primaryText="الإشعارات" leftIcon={<NotificationsIcon />} />
      <Menu.Item to="/messages" primaryText="الرسائل" leftIcon={<ChatIcon />} />
      <Menu.Item to="/coupons" primaryText="الكوبونات" leftIcon={<LocalOfferIcon />} />

      <Divider sx={{ my: 0.5 }} />
      <SectionLabel label="المراقبة والتحليل" />
      <Menu.Item to="/monitor" primaryText="مراقب النظام" leftIcon={<MonitorIcon />} />
      <Menu.Item to="/siteVisits" primaryText="زيارات الموقع" leftIcon={<TrafficIcon />} />
      <Menu.Item to="/audit" primaryText="سجل المراجعة" leftIcon={<HistoryIcon />} />

      <Divider sx={{ my: 0.5 }} />
      {permissions === 'superadmin' ? (
        <Menu.Item to="/settings" primaryText="الإعدادات" leftIcon={<SettingsIcon />} />
      ) : (
        <Menu.Item to="/settings" primaryText="الإعدادات" leftIcon={<SettingsIcon />} />
      )}
    </Menu>
  );
};

const CustomAppBar = () => (
  <AppBar>
    <TitlePortal />
    <Box sx={{ flexGrow: 1 }} />
    <Chip
      label="h100h Admin"
      size="small"
      sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', ml: 1 }}
      variant="outlined"
    />
  </AppBar>
);

export const Layout = (props: React.ComponentProps<typeof RALayout>) => (
  <RALayout {...props} menu={CustomMenu} appBar={CustomAppBar} />
);
