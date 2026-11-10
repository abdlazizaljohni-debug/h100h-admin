import {
  List, Datagrid, TextField, DateField, BooleanField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination,
} from 'react-admin';

const StudentUpdateFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
];

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const StudentUpdateList = () => (
  <List
    title="تحديثات الطلاب"
    filters={StudentUpdateFilters}
    actions={
      <TopToolbar>
        <FilterButton />
        <ExportButton />
      </TopToolbar>
    }
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'updated_at', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="mob" label="رقم الجوال" />
      <BooleanField source="force_reset" label="إعادة تعيين قسري" />
      <DateField source="updated_at" label="تاريخ التحديث" locales="ar-SA" showTime />
    </Datagrid>
  </List>
);

export const StudentUpdateShow = () => (
  <Show title="تفاصيل تحديث الطالب">
    <SimpleShowLayout>
      <TextField source="mob" label="رقم الجوال" />
      <BooleanField source="force_reset" label="إعادة تعيين قسري" />
      <DateField source="updated_at" label="تاريخ التحديث" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
