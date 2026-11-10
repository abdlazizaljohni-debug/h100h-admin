import {
  List, Datagrid, TextField, DateField,
  Show, SimpleShowLayout, SearchInput, FilterButton, ExportButton,
  TopToolbar, Pagination, NumberField, SelectInput,
} from 'react-admin';

const QuestionFilters = [
  <SearchInput source="subject" placeholder="المادة" alwaysOn key="subject" />,
  <SelectInput source="grade" label="الصف" key="grade" choices={[
    { id: 1, name: 'الأول' }, { id: 2, name: 'الثاني' }, { id: 3, name: 'الثالث' },
    { id: 4, name: 'الرابع' }, { id: 5, name: 'الخامس' }, { id: 6, name: 'السادس' },
    { id: 7, name: 'السابع' }, { id: 8, name: 'الثامن' }, { id: 9, name: 'التاسع' },
    { id: 10, name: 'العاشر' }, { id: 11, name: 'الحادي عشر' }, { id: 12, name: 'الثاني عشر' },
  ]} />,
  <SearchInput source="track" placeholder="المسار" key="track" />,
  <SearchInput source="category" placeholder="التصنيف" key="category" />,
];

const LargePagination = () => <Pagination rowsPerPageOptions={[25, 50, 100]} />;

export const QuestionList = () => (
  <List
    title="الأسئلة"
    filters={QuestionFilters}
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
      <TextField source="subject" label="المادة" />
      <NumberField source="grade" label="الصف" />
      <NumberField source="exam_num" label="رقم الاختبار" />
      <TextField source="track" label="المسار" />
      <TextField source="category" label="التصنيف" />
      <TextField source="added_by" label="أضافه" />
      <DateField source="created_at" label="تاريخ الإضافة" locales="ar-SA" />
    </Datagrid>
  </List>
);

export const QuestionShow = () => (
  <Show title="تفاصيل السؤال">
    <SimpleShowLayout>
      <TextField source="id" label="المعرّف" />
      <TextField source="subject" label="المادة" />
      <NumberField source="grade" label="الصف" />
      <NumberField source="exam_num" label="رقم الاختبار" />
      <TextField source="track" label="المسار" />
      <TextField source="category" label="التصنيف" />
      <TextField source="question" label="نص السؤال" />
      <TextField source="option_a" label="الخيار أ" />
      <TextField source="option_b" label="الخيار ب" />
      <TextField source="option_c" label="الخيار ج" />
      <TextField source="option_d" label="الخيار د" />
      <TextField source="correct_answer" label="الإجابة الصحيحة" />
      <NumberField source="ans" label="رقم الإجابة" />
      <TextField source="solution" label="الحل" />
      <TextField source="image_url" label="رابط الصورة" />
      <TextField source="added_by" label="أضافه" />
      <DateField source="created_at" label="تاريخ الإضافة" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
