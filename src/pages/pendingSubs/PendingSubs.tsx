import {
  List, Datagrid, TextField, DateField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, NumberField, SelectInput,
} from 'react-admin';

const PendingSubFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
  <SearchInput source="name" placeholder="الاسم" key="name" />,
  <SelectInput source="plan" label="الخطة" key="plan" choices={[
    { id: 'monthly', name: 'شهري' },
    { id: 'quarterly', name: 'ربع سنوي' },
    { id: 'yearly', name: 'سنوي' },
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
    </SimpleShowLayout>
  </Show>
);
