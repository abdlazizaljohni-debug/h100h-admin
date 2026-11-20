import { AuthProvider } from 'react-admin';
import { supabase } from './supabaseClient';
import { loadAccess, loginEmail, resetAccess } from './access';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail(String(username || '')),
      password,
    });
    if (error) throw new Error(error.message);

    // 2026-11-20: مدير (admin_roles) أو موظف فعّال في فريق العمل (staff_members)
    const a = await loadAccess(true);
    if (!a.isAdmin && !a.staff) {
      await supabase.auth.signOut();
      resetAccess();
      throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
    }
  },

  logout: async () => {
    resetAccess();
    await supabase.auth.signOut();
  },

  checkAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('غير مصرح');
    // 2026-11-20: التحقق الثنائي إجباري للجميع (مدير وموظف)
    // من لم يربط تطبيق المصادقة بعد → صفحة الدخول تعرض خطوة الربط
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.currentLevel !== 'aal2') {
      throw new Error('أدخل رمز التحقق الثنائي');
    }
    const a = await loadAccess();
    if (!a.isAdmin && !a.staff) {
      resetAccess();
      await supabase.auth.signOut();
      throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
    }
  },

  checkError: async (error) => {
    if (error?.status === 401) {
      throw new Error('غير مصرح');
    }
    // 403 = لا صلاحية لهذا القسم (موظف) — لا نسجّل خروجه، تظهر رسالة الخطأ فقط
  },

  getIdentity: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');
    const a = await loadAccess();
    return {
      id: user.id,
      fullName: a.name || user.email || 'مشرف',
      avatar: undefined,
      role: a.isAdmin ? (a.role || 'admin') : 'staff',
    };
  },

  // يرجع كائن الصلاحيات: { isAdmin, role, staff, perms, name }
  getPermissions: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return loadAccess();
  },
};
