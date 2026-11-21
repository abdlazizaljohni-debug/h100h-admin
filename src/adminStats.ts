// ══════════════════════════════════════════════════════════════
//  h100h — إحصاءات لوحة الإدارة من الخادم · 2026-11-21 · إضافة
//  الصفحات تطلب الأرقام النهائية من دوال قاعدة البيانات (20-admin-stats.sql)
//  بدل تحميل كل الطلاب في المتصفح. لو الدالة غير موجودة بعد (الملف ما تشغّل)
//  ترجع الصفحة تلقائياً للطريقة القديمة — ما يتعطل شيء.
// ══════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient';

/** الدالة غير منشورة في قاعدة البيانات → استخدم الطريقة القديمة */
export class MissingRpc extends Error {}

const isMissing = (e: any) =>
  !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function|does not exist/i.test(String(e.message || '')));

export async function statsRpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args || {});
  if (error) {
    if (isMissing(error)) throw new MissingRpc(fn);
    throw new Error(error.message);
  }
  return data as T;
}

/** 2026-11-21 → 21/11 */
export const shortDay = (k: string) => { const [, m, d] = String(k).slice(0, 10).split('-'); return `${Number(d)}/${Number(m)}`; };
