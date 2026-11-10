import {
  List, Datagrid, TextField, DateField, NumberField,
  Show, SimpleShowLayout, SearchInput, FilterButton,
  SelectInput, TopToolbar, ExportButton, Pagination,
  NumberInput, useRecordContext,
} from 'react-admin';
import { Chip } from '@mui/material';

const ExamFilters = [
  <SearchInput source="mob" placeholder="رقم الجوال" alwaysOn key="mob" />,
  <SelectInput source="subject" label="المادة" key="subject" choices={[
    { id: 'math', name: 'رياضيات' },
    { id: 'arabic', name: 'لغة عربية' },
    { id: 'science', name: 'علوم' },
    { id: 'english', name: 'إنجليزي' },
    { id: 'islamic', name: 'تربية إسلامية' },
    { id: 'social', name: 'دراسات اجتماعية' },
  ]} />,
  <NumberInput source="grade" label="الصف" key="grade" />,
];

const ScoreField = () => {
  const record = useRecordContext();
  if (!record) return null;
  const score = record.score as number;
  const color = score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error';
  return <Chip label={`${score}%`} color={color as 'success' | 'warning' | 'error'} size="small" />;
};

const LargePagination = () => (
  <Pagination rowsPerPageOptions={[25, 50, 100]} />
);

export const ExamResultList = () => (
  <List
    title="نتائج الاختبارات"
    filters={ExamFilters}
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
      <TextField source="subject" label="المادة" />
      <TextField source="grade" label="الصف" />
      <ScoreField />
      <NumberField source="correct" label="صح" />
      <NumberField source="wrong" label="خطأ" />
      <DateField source="created_at" label="تاريخ الاختبار" locales="ar-SA" showTime />
    </Datagrid>
  </List>
);

export const ExamResultShow = () => (
  <Show title="تفاصيل نتيجة الاختبار">
    <SimpleShowLayout>
      <TextField source="id" label="#" />
      <TextField source="mob" label="رقم الجوال" />
      <TextField source="subject" label="المادة" />
      <TextField source="grade" label="الصف" />
      <NumberField source="score" label="الدرجة %" />
      <NumberField source="correct" label="الإجابات الصحيحة" />
      <NumberField source="wrong" label="الإجابات الخاطئة" />
      <NumberField source="total" label="إجمالي الأسئلة" />
      <DateField source="created_at" label="تاريخ الاختبار" locales="ar-SA" showTime />
    </SimpleShowLayout>
  </Show>
);
