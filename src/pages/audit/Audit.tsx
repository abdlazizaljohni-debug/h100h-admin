import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Alert, Button, Chip, Pagination,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { supabase } from '../../supabaseClient';

interface AuditEntry {
  id: number;
  admin_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const actionColors: Record<string, 'primary' | 'success' | 'error' | 'warning'> = {
  INSERT: 'success',
  UPDATE: 'primary',
  DELETE: 'error',
  LOGIN: 'warning',
};

export const AuditPage = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 25;

  const load = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const from = (p - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error: err, count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (err) throw err;
      setEntries(data || []);
      setTotal(count || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // If audit_log doesn't exist yet, show friendly message
      if (msg.includes('does not exist') || msg.includes('relation')) {
        setError('جدول سجل المراجعة غير موجود بعد. يمكن إنشاؤه من قسم الإعدادات.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700}>سجل المراجعة</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => load(page)}>
          تحديث
        </Button>
      </Box>

      <Card>
        <CardContent>
          {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
          {error && <Alert severity="warning">{error}</Alert>}
          {!loading && !error && (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>الإجراء</TableCell>
                      <TableCell>الجدول</TableCell>
                      <TableCell>المعرّف</TableCell>
                      <TableCell>المشرف</TableCell>
                      <TableCell>الوقت</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          لا توجد سجلات بعد
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map(row => (
                        <TableRow key={row.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.action}
                              color={actionColors[row.action] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{row.table_name}</TableCell>
                          <TableCell>{row.record_id || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {row.admin_id?.substring(0, 8)}...
                          </TableCell>
                          <TableCell sx={{ direction: 'ltr', textAlign: 'right' }}>
                            {new Date(row.created_at).toLocaleString('ar-SA')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>

              {total > perPage && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={Math.ceil(total / perPage)}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
