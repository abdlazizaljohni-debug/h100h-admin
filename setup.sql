-- ==========================================
-- إعداد قاعدة البيانات للوحة تحكم h100h
-- شغّل هذا الملف في Supabase SQL Editor
-- ==========================================

-- 1. جدول صلاحيات المشرفين
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin', 'viewer')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. تفعيل RLS على admin_roles
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- السماح للمشرفين بقراءة صلاحياتهم فقط
CREATE POLICY "admin_roles_self_read" ON admin_roles
  FOR SELECT USING (auth.uid() = user_id);

-- السماح للـ superadmin بإدارة الأدوار
CREATE POLICY "admin_roles_superadmin_all" ON admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'superadmin'
    )
  );

-- 3. إضافة أول مشرف (superadmin)
-- استبدل 'YOUR_USER_UUID_HERE' بـ user_id من Supabase Auth > Users
-- INSERT INTO admin_roles (user_id, role, full_name)
-- VALUES ('YOUR_USER_UUID_HERE', 'superadmin', 'اسم المشرف الرئيسي');

-- 4. جدول سجل المراجعة (اختياري)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_admin_read" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );
CREATE POLICY "audit_log_admin_insert" ON audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid()
    )
  );

-- 5. التحقق من وجود الجداول المطلوبة
-- يجب أن تكون هذه الجداول موجودة مسبقاً في مشروع h100h:
-- - subscribers (الطلاب)
-- - exam_results (نتائج الاختبارات)
-- - subscriptions (الاشتراكات)
-- - notifications (الإشعارات)
-- - key_attempt_log (محاولات تسجيل الدخول)

-- للتحقق:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
