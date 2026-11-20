// ══════════════════════════════════════════════════════════════
//  h100h — صلاحيات لوحة الإدارة · 2026-11-20
//  المدير (admin_roles): كل شيء
//  الموظف (staff_members): صلاحياته فقط — تُمنح من صفحة «فريق العمل والصلاحيات»
//  الحماية الحقيقية في قاعدة البيانات (has_perm + سياسات RLS) — هنا فقط لإظهار/إخفاء الأقسام
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const PERMS: { key: string; label: string; hint: string }[] = [
  { key: 'questions_view', label: 'مشاهدة الأسئلة', hint: 'بنك الأسئلة للقراءة فقط + البوابة بوضع المتابعة (كل الصفوف والاختبارات)' },
  { key: 'questions_edit', label: 'إضافة وتعديل الأسئلة', hint: 'إضافة وتعديل وحذف الأسئلة والصور والاستيراد الجماعي' },
  { key: 'students_edit', label: 'تعديل بيانات الطلاب', hint: 'تعديل الاسم والصف + صندوق الرسائل ونتائج الاختبارات' },
  { key: 'students_block', label: 'حظر وإيقاف الطلاب', hint: 'حظر دائم أو إيقاف مؤقت + سجل الدخول وعناوين IP' },
  { key: 'subs', label: 'الاشتراكات والمدفوعات', hint: 'تفعيل الاشتراكات والطلبات المعلقة والمدفوعات والكوبونات' },
];
export const STAFF_DOMAIN = 'staff.h100h.com';
export const staffEmail = (mob: string) => `${mob}@${STAFF_DOMAIN}`;
/** يقبل بريداً إلكترونياً أو رقم جوال موظف (05xxxxxxxx) */
export const loginEmail = (v: string) => {
  const t = v.trim().replace(/[\s-]/g, '');
  return /^05\d{8}$/.test(t) ? staffEmail(t) : v.trim();
};

export type Access = {
  isAdmin: boolean;
  role: string | null;
  staff: { name: string; mob: string; perms: string[] } | null;
  perms: string[];
  name: string;
};
const NONE: Access = { isAdmin: false, role: null, staff: null, perms: [], name: '' };

let cache: Promise<Access> | null = null;
export function resetAccess() { cache = null; }
export function loadAccess(force = false): Promise<Access> {
  if (cache && !force) return cache;
  cache = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NONE;
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from('admin_roles').select('role, full_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('staff_members').select('name, mob, perms, active').eq('user_id', user.id).maybeSingle(),
    ]);
    const staff = s && s.active ? { name: String(s.name || ''), mob: String(s.mob || ''), perms: (s.perms || []) as string[] } : null;
    return {
      isAdmin: !!r,
      role: r?.role || null,
      staff,
      perms: r ? PERMS.map((p) => p.key) : (staff?.perms || []),
      name: r?.full_name || staff?.name || user.email || '',
    };
  })();
  cache.catch(() => { cache = null; });
  return cache;
}

export function useAccess() {
  const [a, setA] = useState<Access | null>(null);
  useEffect(() => { let on = true; loadAccess().then((x) => on && setA(x), () => on && setA(NONE)); return () => { on = false; }; }, []);
  return {
    access: a,
    loading: a === null,
    isAdmin: !!a?.isAdmin,
    can: (p: string) => !!a && (a.isAdmin || a.perms.includes(p)),
  };
}

/** استدعاء دالة staff-admin مع رسالة خطأ واضحة */
export async function staffApi<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('staff-admin', { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* */ }
    if (/Failed to send|not found|404/i.test(msg)) msg = 'دالة staff-admin غير منشورة بعد في Supabase';
    throw new Error(msg);
  }
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}
