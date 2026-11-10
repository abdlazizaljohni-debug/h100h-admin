import { AuthProvider } from 'react-admin';
import { supabase } from './supabaseClient';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });
    if (error) throw new Error(error.message);

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('لم يتم التعرف على المستخدم');

    const { data: role, error: roleError } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !role) {
      await supabase.auth.signOut();
      throw new Error('ليس لديك صلاحية الوصول للوحة التحكم');
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  checkAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('غير مصرح');
  },

  checkError: async (error) => {
    if (error?.status === 401 || error?.status === 403) {
      throw new Error('غير مصرح');
    }
  },

  getIdentity: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const { data: role } = await supabase
      .from('admin_roles')
      .select('role, full_name')
      .eq('user_id', user.id)
      .single();

    return {
      id: user.id,
      fullName: role?.full_name || user.email || 'مشرف',
      avatar: undefined,
      role: role?.role || 'admin',
    };
  },

  getPermissions: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'guest';

    const { data: role } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return role?.role || 'admin';
  },
};
