import {
  List, Datagrid, TextField, DateField,
  Show, SimpleShowLayout, SearchInput, FilterButton,
  SelectInput, TopToolbar, ExportButton, Pagination,
  useRecordContext,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusLabels: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  active: { label: 'نشط', color: 'success' },
  expired: { label: 'منتهي', color: 'error' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  cancelled: { label: 'ملغي', color: 'default' },
};

const StatusField = () => {
  const record = useRecordContext();
  if (!record) return null;
  const status = record.status as string;
  const info = statusLabels[status] || { label: status, color: 'default' as const };
  return <Chip label={info.label} color={info.color} size="small" />;
};

const SubscriptionFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn />,
  <SelectInput source="status" label="الحالة" choices={[
    { id: 'active', name: 'نشط' },
    { id: 'expired', name: 'منتهي' },
    { id: 'pending', name: 'قيد الانتظار' },
    { id: 'cancelled', name: 'ملغي' },
  ]} />,
];

const LargePagination = () => (
  <Pagination rowsPerPageOptions={[25, 50, 100]} />
);

export const SubscriptionList = () => (
  <List
    title="الاشتراكات"
    filters={SubscriptionFilters}
    actions={
      <TopToolbar>
        <FilterButton />
        <ExportButton />
      </TopToolbar>
    }
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'id', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="id" label="#" />
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="plan" label="الخطة" />
      <StatusField />
      <DateField source="start_date" label="تاريخ البدء" locales="ar-SA" />
      <DateField source="end_date" label="تاريخ الانتهاء" locales="ar-SA" />
      <DateField source="created_at" label="تاريخ الإنشاء" locales="ar-SA" />
    </Datagrid>
  </List>
);

export const SubscriptionShow = () => (
  <Show title="تفاصيل الاشتراك">
    <SimpleShowLayout>
      <TextField source="id" label="#" />
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="plan" label="الخطة" />
      <TextField source="status" label="الحالة" />
      <DateField source="start_date" label="تاريخ البدء" locales="ar-SA" />
      <DateField source="end_date" label="تاريخ الانتهاء" locales="ar-SA" />
      <TextField source="payment_method" label="طريقة الدفع" />
      <DateField source="created_at" label="تاريخ الإنشاء" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
