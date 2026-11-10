import { StudentPrivacyPage } from './pages/privacy/StudentPrivacy';
import { CustomLoginPage } from './CustomLoginPage';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { i18nProvider } from './i18nProvider';

// Icons
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

// Pages - existing
import { Dashboard } from './pages/Dashboard';
import { StudentList, StudentShow } from './pages/students/Students';
import { ExamResultList, ExamResultShow } from './pages/examResults/ExamResults';
import { SubscriptionList, SubscriptionShow } from './pages/subscriptions/Subscriptions';
import { NotificationList, NotificationCreate } from './pages/notifications/Notifications';
import { MonitorPage } from './pages/monitor/Monitor';
import { AuditPage } from './pages/audit/Audit';
import { SettingsPage } from './pages/settings/Settings';

// Pages - new
import { CouponList, CouponShow, CouponCreate, CouponEdit } from './pages/coupons/Coupons';
import { QuestionList, QuestionShow } from './pages/questions/Questions';
import { CurriculumList, CurriculumShow } from './pages/curriculum/Curriculum';
import { SiteVisitList, SiteVisitShow } from './pages/siteVisits/SiteVisits';
import { MessageList, MessageShow } from './pages/messages/Messages';
import { PendingSubList, PendingSubShow } from './pages/pendingSubs/PendingSubs';
import { StudentUpdateList, StudentUpdateShow } from './pages/studentUpdates/StudentUpdates';

// Custom pages
import { ParentsPage } from './pages/parents/Parents';
import { GradeStatsPage } from './pages/gradeStats/GradeStats';

// Custom Layout
import { Layout } from './components/Layout';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Admin
        title="لوحة تحكم h100h"
  loginPage={CustomLoginPage}
  dataProvider={dataProvider}
  authProvider={authProvider}
  i18nProvider={i18nProvider}
  dashboard={Dashboard}
  layout={Layout}
  disableTelemetry
  requireAuth
      >
        {/* الطلاب */}
        <Resource
          name="students"
          list={StudentList}
          show={StudentShow}
          icon={PeopleIcon}
          options={{ label: 'الطلاب' }}
        />

        {/* الاختبارات */}
        <Resource
          name="examResults"
          list={ExamResultList}
          show={ExamResultShow}
          icon={AssignmentIcon}
          options={{ label: 'نتائج الاختبارات' }}
        />

        {/* الاشتراكات */}
        <Resource
          name="subscriptions"
          list={SubscriptionList}
          show={SubscriptionShow}
          icon={CardMembershipIcon}
          options={{ label: 'الاشتراكات' }}
        />

        {/* الإشعارات */}
        <Resource
          name="notifications"
          list={NotificationList}
          create={NotificationCreate}
          icon={NotificationsIcon}
          options={{ label: 'الإشعارات' }}
        />

        {/* الكوبونات */}
        <Resource
          name="coupons"
          list={CouponList}
          show={CouponShow}
          create={CouponCreate}
          edit={CouponEdit}
          icon={LocalOfferIcon}
          options={{ label: 'الكوبونات' }}
        />

        {/* الأسئلة */}
        <Resource
          name="questions"
          list={QuestionList}
          show={QuestionShow}
          icon={QuizIcon}
          options={{ label: 'الأسئلة' }}
        />

        {/* أسئلة المنهج */}
        <Resource
          name="curriculumQuestions"
          list={CurriculumList}
          show={CurriculumShow}
          icon={MenuBookIcon}
          options={{ label: 'أسئلة المنهج' }}
        />

        {/* زيارات الموقع */}
        <Resource
          name="siteVisits"
          list={SiteVisitList}
          show={SiteVisitShow}
          icon={TrafficIcon}
          options={{ label: 'زيارات الموقع' }}
        />

        {/* الرسائل */}
        <Resource
          name="messages"
          list={MessageList}
          show={MessageShow}
          icon={ChatIcon}
          options={{ label: 'الرسائل' }}
        />

        {/* الاشتراكات المعلقة */}
        <Resource
          name="pendingSubs"
          list={PendingSubList}
          show={PendingSubShow}
          icon={PendingIcon}
          options={{ label: 'الاشتراكات المعلقة' }}
        />

        {/* تحديثات الطلاب */}
        <Resource
          name="studentUpdates"
          list={StudentUpdateList}
          show={StudentUpdateShow}
          icon={UpdateIcon}
          options={{ label: 'تحديثات الطلاب' }}
        />

        {/* صفحات مخصصة */}
        <CustomRoutes>
         <Route path="/privacy" element={<StudentPrivacyPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/parents" element={<ParentsPage />} />
          <Route path="/grade-stats" element={<GradeStatsPage />} />
        </CustomRoutes>
      </Admin>
    </ThemeProvider>
  );
}
