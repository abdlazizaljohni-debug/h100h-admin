import {
  List, Datagrid, TextField, DateField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, NumberField, SelectInput,
} from 'react-admin';

const SiteVisitFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
  <SearchInput source="page" placeholder="الصفحة" key="page" />,
  <SelectInput source="device_type" label="نوع الجهاز" key="device_type" choices={[
    { id: 'mobile', name: 'جوال' },
    { id: 'tablet', name: 'لوحي' },
    { id: 'desktop', name: 'كمبيوتر' },
  ]} />,
];

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const SiteVisitList = () => (
  <List
    title="زيارات الموقع"
    filters={SiteVisitFilters}
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
      <TextField source="page" label="الصفحة" />
      <TextField source="mob" label="الجوال" />
      <TextField source="device_type" label="الجهاز" />
      <TextField source="browser" label="المتصفح" />
      <TextField source="os" label="نظام التشغيل" />
      <TextField source="lang" label="اللغة" />
      <DateField source="created_at" label="وقت الزيارة" locales="ar-SA" showTime />
    </Datagrid>
  </List>
);

export const SiteVisitShow = () => (
  <Show title="تفاصيل الزيارة">
    <SimpleShowLayout>
      <NumberField source="id" label="#" />
      <TextField source="page" label="الصفحة" />
      <TextField source="mob" label="الجوال" />
      <TextField source="device_type" label="نوع الجهاز" />
      <TextField source="browser" label="المتصفح" />
      <TextField source="os" label="نظام التشغيل" />
      <NumberField source="screen_w" label="عرض الشاشة" />
      <NumberField source="screen_h" label="ارتفاع الشاشة" />
      <TextField source="lang" label="اللغة" />
      <TextField source="referrer" label="المصدر" />
      <TextField source="session_id" label="معرّف الجلسة" />
      <DateField source="created_at" label="وقت الزيارة" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
