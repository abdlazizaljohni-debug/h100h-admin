import {
  List, Datagrid, TextField, DateField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, NumberField, SelectInput,
  FunctionField, useRecordContext, useRefresh,
} from 'react-admin';
import { useState } from 'react';
import { Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ActivateDialog } from '../Dashboard';

// زر «تفعيل» — يستدعي admin_activate_subscription (إضافة 2026-11-19)
const ActivateButton = () => {
  const record = useRecordContext<any>();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  if (!record?.mob) return null;
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => setOpen(true)}>
        تفعيل
      </Button>
      {open && <ActivateDialog row={record} onClose={() => setOpen(false)} onDone={refresh} />}
    </span>
  );
};

const PendingSubFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
  <SearchInput source="name" placeholder="الاسم" key="name" />,
  <SelectInput source="plan" label="الخطة" key="plan" choices={[
    { id: 'monthly', name: 'شهري' },
    { id: 'quarterly', name: 'ربع سنوي' },
    { id: 'yearly', name: 'سنوي' },
    { id: 'quarter', name: 'ربع سنوي (البوابة)' },
    { id: 'semi', name: 'نصف سنوي' },
    { id: 'annual', name: 'سنوي (البوابة)' },
    { id: 'free', name: 'مجاني' },
  ]} />,
  <SelectInput source="grade" label="الصف" key="grade" choices={[
    { id: 1, name: 'الأول' }, { id: 2, name: 'الثاني' }, { id: 3, name: 'الثالث' },
    { id: 4, name: 'الرابع' }, { id: 5, name: 'الخامس' }, { id: 6, name: 'السادس' },
    { id: 7, name: 'السابع' }, { id: 8, name: 'الثامن' }, { id: 9, name: 'التاسع' },
    { id: 10, name: 'العاشر' }, { id: 11, name: 'الحادي عشر' }, { id: 12, name: 'الثاني عشر' },
  ]} />,
];

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const PendingSubList = () => (
  <List
    title="الاشتراكات المعلقة"
    filters={PendingSubFilters}
    actions={
      <TopToolbar>
        <FilterButton />
        <ExportButton />
      </TopToolbar>
    }
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'requested_at', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="name" label="الاسم" />
      <TextField source="plan" label="الخطة" />
      <NumberField source="grade" label="الصف" />
      <DateField source="requested_at" label="تاريخ الطلب" locales="ar-SA" showTime />
      <FunctionField label="" render={() => <ActivateButton />} />
    </Datagrid>
  </List>
);

export const PendingSubShow = () => (
  <Show title="تفاصيل الاشتراك المعلق">
    <SimpleShowLayout>
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="name" label="الاسم" />
      <TextField source="plan" label="الخطة" />
      <NumberField source="grade" label="الصف" />
      <DateField source="requested_at" label="تاريخ الطلب" locales="ar-SA" showTime />
      <ActivateButton />
    </SimpleShowLayout>
  </Show>
);
