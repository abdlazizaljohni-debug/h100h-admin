import {
  List, Datagrid, TextField, DateField, BooleanField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, SelectInput, useRecordContext,
} from 'react-admin';
import { Chip } from '@mui/material';

const MessageFilters = [
  <SearchInput source="student_mob" placeholder="جوال الطالب" alwaysOn key="student_mob" />,
  <SearchInput source="student_name" placeholder="اسم الطالب" key="student_name" />,
  <SelectInput source="from_role" label="المرسل" key="from_role" choices={[
    { id: 'student', name: 'طالب' },
    { id: 'admin', name: 'مشرف' },
  ]} />,
  <SelectInput source="read_by_admin" label="قرأه المشرف" key="read_by_admin" choices={[
    { id: true, name: 'نعم' },
    { id: false, name: 'لا' },
  ]} />,
];

const ReadField = ({ source, label }: { source: string; label: string }) => {
  const record = useRecordContext();
  if (!record) return null;
  const val = record[source];
  return <Chip label={val ? 'قُرئت' : 'غير مقروءة'} color={val ? 'success' : 'warning'} size="small" />;
};

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const MessageList = () => (
  <List
    title="الرسائل"
    filters={MessageFilters}
    actions={
      <TopToolbar>
        <FilterButton />
        <ExportButton />
      </TopToolbar>
    }
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'ts', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="student_mob" label="جوال الطالب" />
      <TextField source="student_name" label="اسم الطالب" />
      <TextField source="from_role" label="المرسل" />
      <TextField source="text" label="الرسالة" />
      <ReadField source="read_by_admin" label="قرأه المشرف" />
      <DateField source="ts" label="الوقت" locales="ar-SA" showTime />
    </Datagrid>
  </List>
);

export const MessageShow = () => (
  <Show title="تفاصيل الرسالة">
    <SimpleShowLayout>
      <TextField source="id" label="المعرّف" />
      <TextField source="student_mob" label="جوال الطالب" />
      <TextField source="student_name" label="اسم الطالب" />
      <TextField source="from_role" label="المرسل" />
      <TextField source="text" label="نص الرسالة" />
      <BooleanField source="read_by_admin" label="قرأه المشرف" />
      <BooleanField source="read_by_student" label="قرأه الطالب" />
      <DateField source="ts" label="الوقت" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
