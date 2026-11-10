import {
  List, Datagrid, TextField, EmailField, DateField, NumberField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, useRecordContext,
} from 'react-admin';
import { Chip } from '@mui/material';

const StudentFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn />,
];

const StudentListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const LargePagination = () => (
  <Pagination rowsPerPageOptions={[25, 50, 100]} />
);

export const StudentList = () => (
  <List
    title="الطلاب"
    filters={StudentFilters}
    actions={<StudentListActions />}
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'id', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="id" label="#" />
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="name" label="الاسم" />
      <TextField source="grade" label="الصف" />
      <TextField source="city" label="المدينة" />
      <DateField source="created_at" label="تاريخ التسجيل" locales="ar-SA" />
    </Datagrid>
  </List>
);

export const StudentShow = () => (
  <Show title="بيانات الطالب">
    <SimpleShowLayout>
      <TextField source="id" label="#" />
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="name" label="الاسم" />
      <TextField source="grade" label="الصف" />
      <TextField source="city" label="المدينة" />
      <DateField source="created_at" label="تاريخ التسجيل" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
