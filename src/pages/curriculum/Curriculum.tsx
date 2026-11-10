import {
  List, Datagrid, TextField, DateField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, NumberField, SelectInput,
} from 'react-admin';

const CurriculumFilters = [
  <SearchInput source="subject_key" placeholder="المادة" alwaysOn key="subject_key" />,
  <SelectInput source="grade" label="الصف" key="grade" choices={[
    { id: 1, name: 'الأول' }, { id: 2, name: 'الثاني' }, { id: 3, name: 'الثالث' },
    { id: 4, name: 'الرابع' }, { id: 5, name: 'الخامس' }, { id: 6, name: 'السادس' },
    { id: 7, name: 'السابع' }, { id: 8, name: 'الثامن' }, { id: 9, name: 'التاسع' },
    { id: 10, name: 'العاشر' }, { id: 11, name: 'الحادي عشر' }, { id: 12, name: 'الثاني عشر' },
  ]} />,
  <SearchInput source="track" placeholder="المسار" key="track" />,
];

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const CurriculumList = () => (
  <List
    title="أسئلة المنهج"
    filters={CurriculumFilters}
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
      <TextField source="subject_key" label="المادة" />
      <NumberField source="grade" label="الصف" />
      <NumberField source="exam_num" label="رقم الاختبار" />
      <TextField source="track" label="المسار" />
      <DateField source="created_at" label="تاريخ الإضافة" locales="ar-SA" />
    </Datagrid>
  </List>
);

export const CurriculumShow = () => (
  <Show title="تفاصيل سؤال المنهج">
    <SimpleShowLayout>
      <TextField source="id" label="المعرّف" />
      <TextField source="subject_key" label="المادة" />
      <NumberField source="grade" label="الصف" />
      <NumberField source="exam_num" label="رقم الاختبار" />
      <TextField source="track" label="المسار" />
      <TextField source="question" label="نص السؤال" />
      <NumberField source="ans" label="رقم الإجابة" />
      <TextField source="solution" label="الحل" />
      <TextField source="image_url" label="رابط الصورة" />
      <DateField source="created_at" label="تاريخ الإضافة" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
