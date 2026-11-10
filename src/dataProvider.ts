import { DataProvider, GetListParams, GetListResult, GetOneParams, GetOneResult,
  CreateParams, CreateResult, UpdateParams, UpdateResult,
  DeleteParams, DeleteResult, GetManyParams, GetManyResult,
  GetManyReferenceParams, GetManyReferenceResult } from 'react-admin';
import { supabase } from './supabaseClient';

// Map react-admin resource names to Supabase table names
const resourceMap: Record<string, string> = {
  students: 'students',
  examResults: 'exam_results',
  subscriptions: 'subscription_keys',
  notifications: 'notifications',
  loginAttempts: 'key_attempt_log',
  auditLog: 'audit_log',
  adminRoles: 'admin_roles',
  coupons: 'coupons',
  questions: 'questions',
  curriculumQuestions: 'curriculum_questions',
  siteVisits: 'site_visits',
  messages: 'chat_messages',
  pendingSubs: 'pending_subs',
  studentUpdates: 'student_updates',
  visits: 'visits',
};

function getTable(resource: string): string {
  return resourceMap[resource] || resource;
}

export const dataProvider: DataProvider = {
  getList: async (resource: string, params: GetListParams): Promise<GetListResult> => {
    const table = getTable(resource);
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .range(from, to)
      .order(field, { ascending: order === 'ASC' });

    // Apply filters
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string') {
            query = query.ilike(key, `%${value}%`);
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      total: count || 0,
    };
  },

  getOne: async (resource: string, params: GetOneParams): Promise<GetOneResult> => {
    const table = getTable(resource);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  getMany: async (resource: string, params: GetManyParams): Promise<GetManyResult> => {
    const table = getTable(resource);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('id', params.ids);

    if (error) throw new Error(error.message);
    return { data: data || [] };
  },

  getManyReference: async (resource: string, params: GetManyReferenceParams): Promise<GetManyReferenceResult> => {
    const table = getTable(resource);
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq(params.target, params.id)
      .range(from, to)
      .order(field, { ascending: order === 'ASC' });

    if (error) throw new Error(error.message);
    return { data: data || [], total: count || 0 };
  },

  create: async (resource: string, params: CreateParams): Promise<CreateResult> => {
    const table = getTable(resource);
    const { data, error } = await supabase
      .from(table)
      .insert(params.data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  update: async (resource: string, params: UpdateParams): Promise<UpdateResult> => {
    const table = getTable(resource);
    const { data, error } = await supabase
      .from(table)
      .update(params.data)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  updateMany: async (resource: string, params: { ids: (string | number)[], data: Record<string, unknown> }) => {
    const table = getTable(resource);
    const { error } = await supabase
      .from(table)
      .update(params.data)
      .in('id', params.ids);

    if (error) throw new Error(error.message);
    return { data: params.ids };
  },

  delete: async (resource: string, params: DeleteParams): Promise<DeleteResult> => {
    const table = getTable(resource);
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  deleteMany: async (resource: string, params: { ids: (string | number)[] }) => {
    const table = getTable(resource);
    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', params.ids);

    if (error) throw new Error(error.message);
    return { data: params.ids };
  },
};
