import {
  List, Datagrid, TextField, DateField, BooleanField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, NumberField, SelectInput, useRecordContext,
  Create, SimpleForm, TextInput, NumberInput, DateInput, BooleanInput,
  Edit, EditButton,
} from 'react-admin';
import { Chip } from '@mui/material';

const CouponFilters = [
  <SearchInput source="code" placeholder="كود الكوبون" alwaysOn key="code" />,
  <SelectInput source="type" label="النوع" key="type" choices={[
    { id: 'percent', name: 'نسبة مئوية' },
    { id: 'fixed', name: 'مبلغ ثابت' },
    { id: 'free', name: 'مجاني' },
  ]} />,
  <SelectInput source="active" label="الحالة" key="active" choices={[
    { id: true, name: 'نشط' },
    { id: false, name: 'غير نشط' },
  ]} />,
];

const ActiveField = () => {
  const record = useRecordContext();
  if (!record) return null;
  return <Chip label={record.active ? 'نشط' : 'غير نشط'} color={record.active ? 'success' : 'default'} size="small" />;
};

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const CouponList = () => (
  <List
    title="الكوبونات"
    filters={CouponFilters}
    actions={
      <TopToolbar>
        <FilterButton />
        <ExportButton />
      </TopToolbar>
    }
    pagination={<LargePagination />}
    perPage={50}
    sort={{ field: 'created_at', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="code" label="الكود" />
      <TextField source="type" label="النوع" />
      <NumberField source="value" label="القيمة" />
      <DateField source="expiry" label="تاريخ الانتهاء" locales="ar-SA" />
      <ActiveField />
      <NumberField source="used" label="مرات الاستخدام" />
      <DateField source="created_at" label="تاريخ الإنشاء" locales="ar-SA" />
      <EditButton />
    </Datagrid>
  </List>
);

export const CouponShow = () => (
  <Show title="تفاصيل الكوبون">
    <SimpleShowLayout>
      <TextField source="code" label="الكود" />
      <TextField source="type" label="النوع" />
      <NumberField source="value" label="القيمة" />
      <DateField source="expiry" label="تاريخ الانتهاء" locales="ar-SA" />
      <BooleanField source="active" label="نشط" />
      <NumberField source="used" label="مرات الاستخدام" />
      <DateField source="created_at" label="تاريخ الإنشاء" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);

export const CouponCreate = () => (
  <Create title="إنشاء كوبون جديد">
    <SimpleForm>
      <TextInput source="code" label="الكود" required />
      <SelectInput source="type" label="النوع" required choices={[
        { id: 'percent', name: 'نسبة مئوية' },
        { id: 'fixed', name: 'مبلغ ثابت' },
        { id: 'free', name: 'مجاني' },
      ]} />
      <NumberInput source="value" label="القيمة" />
      <DateInput source="expiry" label="تاريخ الانتهاء" />
      <BooleanInput source="active" label="نشط" defaultValue={true} />
    </SimpleForm>
  </Create>
);

export const CouponEdit = () => (
  <Edit title="تعديل الكوبون">
    <SimpleForm>
      <TextInput source="code" label="الكود" disabled />
      <SelectInput source="type" label="النوع" choices={[
        { id: 'percent', name: 'نسبة مئوية' },
        { id: 'fixed', name: 'مبلغ ثابت' },
        { id: 'free', name: 'مجاني' },
      ]} />
      <NumberInput source="value" label="القيمة" />
      <DateInput source="expiry" label="تاريخ الانتهاء" />
      <BooleanInput source="active" label="نشط" />
    </SimpleForm>
  </Edit>
);
