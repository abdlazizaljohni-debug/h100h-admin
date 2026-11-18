// صفحة المدفوعات (Moyasar) — إضافة 2026-11-19 · قراءة فقط
import {
  List, Datagrid, TextField, DateField, NumberField, FunctionField,
  SearchInput, SelectInput, FilterButton, ExportButton, TopToolbar, Pagination,
  Show, SimpleShowLayout,
} from 'react-admin';
import { Chip } from '@mui/material';

const STATUS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  activated:    { label: 'مفعّل', color: 'success' },
  not_paid:     { label: 'غير مدفوع', color: 'default' },
  underpaid:    { label: 'مبلغ ناقص', color: 'warning' },
  needs_review: { label: 'يحتاج مراجعة', color: 'warning' },
  error:        { label: 'خطأ', color: 'error' },
};
const PLAN_AR: Record<string, string> = { monthly: 'شهري', quarter: 'ربع سنوي', semi: 'نصف سنوي', annual: 'سنوي' };

const StatusChip = ({ v }: { v?: string }) => {
  const s = STATUS[v || ''] || { label: v || '—', color: 'info' as const };
  return <Chip size="small" label={s.label} color={s.color} />;
};

const filters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
  <SelectInput source="status" label="الحالة" key="status" choices={Object.entries(STATUS).map(([id, s]) => ({ id, name: s.label }))} />,
  <SelectInput source="plan" label="الباقة" key="plan" choices={Object.entries(PLAN_AR).map(([id, name]) => ({ id, name }))} />,
];

export const PaymentList = () => (
  <List
    title="المدفوعات"
    filters={filters}
    actions={<TopToolbar><FilterButton /><ExportButton /></TopToolbar>}
    pagination={<Pagination rowsPerPageOptions={[25, 50, 100]} />}
    perPage={50}
    sort={{ field: 'created_at', order: 'DESC' }}
    empty={false}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <DateField source="created_at" label="التاريخ" locales="ar-SA" showTime />
      <TextField source="mob" label="الجوال" />
      <FunctionField label="الباقة" render={(r: any) => PLAN_AR[r.plan] || r.plan || '—'} />
      <NumberField source="amount" label="المبلغ" options={{ style: 'currency', currency: 'SAR' }} locales="ar-SA" />
      <TextField source="coupon" label="الكوبون" emptyText="—" />
      <FunctionField label="الحالة" render={(r: any) => <StatusChip v={r.status} />} />
      <DateField source="sub_end" label="ينتهي الاشتراك" locales="ar-SA" emptyText="—" />
    </Datagrid>
  </List>
);

export const PaymentShow = () => (
  <Show title="تفاصيل الدفعة">
    <SimpleShowLayout>
      <TextField source="id" label="رقم العملية (Moyasar)" />
      <TextField source="mob" label="الجوال" />
      <FunctionField label="الباقة" render={(r: any) => PLAN_AR[r.plan] || r.plan || '—'} />
      <NumberField source="amount" label="المبلغ المدفوع" options={{ style: 'currency', currency: 'SAR' }} locales="ar-SA" />
      <NumberField source="expected" label="المبلغ المتوقع" options={{ style: 'currency', currency: 'SAR' }} locales="ar-SA" emptyText="—" />
      <TextField source="coupon" label="الكوبون" emptyText="—" />
      <FunctionField label="الحالة" render={(r: any) => <StatusChip v={r.status} />} />
      <TextField source="moyasar_status" label="حالة Moyasar" />
      <TextField source="error" label="الخطأ" emptyText="—" />
      <DateField source="sub_end" label="ينتهي الاشتراك" locales="ar-SA" emptyText="—" />
      <DateField source="created_at" label="أُنشئت" locales="ar-SA" showTime />
      <DateField source="activated_at" label="فُعّلت" locales="ar-SA" showTime emptyText="—" />
    </SimpleShowLayout>
  </Show>
);
