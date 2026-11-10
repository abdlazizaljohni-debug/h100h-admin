import {
  List, Datagrid, TextField, DateField,
  Create, SimpleForm, TextInput, SelectInput,
  TopToolbar, Pagination, required,
  useRecordContext,
} from 'react-admin';
import { Chip, Box, Typography } from '@mui/material';

const typeColors: Record<string, 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  announcement: 'primary',
};

const TypeField = () => {
  const record = useRecordContext();
  if (!record) return null;
  const type = record.type as string;
  return <Chip label={type} color={typeColors[type] || 'default'} size="small" />;
};

const LargePagination = () => (
  <Pagination rowsPerPageOptions={[25, 50]} />
);

export const NotificationList = () => (
  <List
    title="الإشعارات"
    pagination={<LargePagination />}
    perPage={25}
    sort={{ field: 'id', order: 'DESC' }}
  >
    <Datagrid bulkActionButtons={false}>
      <TextField source="id" label="#" />
      <TextField source="title" label="العنوان" />
      <TextField source="body" label="النص" />
      <TypeField />
      <TextField source="target" label="الجمهور المستهدف" />
      <DateField source="created_at" label="تاريخ الإرسال" locales="ar-SA" showTime />
    </Datagrid>
  </List>
);

export const NotificationCreate = () => (
  <Create title="إرسال إشعار جديد" redirect="list">
    <SimpleForm>
      <Box sx={{ width: '100%', maxWidth: 600 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          إشعار جديد
        </Typography>
        <TextInput
          source="title"
          label="العنوان"
          fullWidth
          validate={[required()]}
        />
        <TextInput
          source="body"
          label="نص الإشعار"
          fullWidth
          multiline
          rows={4}
          validate={[required()]}
        />
        <SelectInput
          source="type"
          label="نوع الإشعار"
          fullWidth
          defaultValue="info"
          choices={[
            { id: 'info', name: 'معلومات' },
            { id: 'announcement', name: 'إعلان' },
            { id: 'warning', name: 'تحذير' },
            { id: 'success', name: 'نجاح' },
          ]}
        />
        <SelectInput
          source="target"
          label="الجمهور المستهدف"
          fullWidth
          defaultValue="all"
          choices={[
            { id: 'all', name: 'جميع الطلاب' },
            { id: 'active', name: 'المشتركون النشطون' },
            { id: 'expired', name: 'الاشتراكات المنتهية' },
          ]}
        />
      </Box>
    </SimpleForm>
  </Create>
);
