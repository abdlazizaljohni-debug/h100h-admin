import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Alert, Button, TextField, Divider,
  Avatar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import { supabase } from '../../supabaseClient';

interface ParentGroup {
  parent_code: string;
  child_count: number;
}

interface StudentChild {
  id: number;
  mob: string;
  name: string;
  grade: number;
  plan: string;
  active: boolean;
  sub_end: string | null;
  last_login: string | null;
}

export const ParentsPage = () => {
  const [parentGroups, setParentGroups] = useState<ParentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<StudentChild[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const loadParents = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('parent_code')
          .not('parent_code', 'is', null)
          .neq('parent_code', '');

        if (error) throw error;

        // Group by parent_code
        const grouped: Record<string, number> = {};
        (data || []).forEach((row: { parent_code: string }) => {
          if (row.parent_code) {
            grouped[row.parent_code] = (grouped[row.parent_code] || 0) + 1;
          }
        });

        const groups: ParentGroup[] = Object.entries(grouped)
          .map(([parent_code, child_count]) => ({ parent_code, child_count }))
          .sort((a, b) => b.child_count - a.child_count);

        setParentGroups(groups);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadParents();
  }, []);

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearched(false);

    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, mob, name, grade, plan, active, sub_end, last_login')
        .eq('parent_code', searchCode.trim());

      if (error) throw error;
      setSearchResult(data || []);
      setSearched(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchError(msg);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <FamilyRestroomIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>متابعة الأهل بكود</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Search by parent code */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>بحث بكود ولي الأمر</Typography>
              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <TextField
                  value={searchCode}
                  onChange={e => setSearchCode(e.target.value)}
                  label="كود ولي الأمر"
                  size="small"
                  sx={{ minWidth: 220 }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  inputProps={{ dir: 'ltr' }}
                />
                <Button
                  variant="contained"
                  startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                  onClick={handleSearch}
                  disabled={searching || !searchCode.trim()}
                >
                  بحث
                </Button>
              </Box>

              {searchError && <Alert severity="error" sx={{ mt: 2 }}>{searchError}</Alert>}

              {searched && (
                <Box mt={2}>
                  {searchResult.length === 0 ? (
                    <Typography color="text.secondary">لا يوجد طلاب بهذا الكود</Typography>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {searchResult.length} طالب مرتبط بالكود: <strong>{searchCode}</strong>
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>الجوال</TableCell>
                            <TableCell>الاسم</TableCell>
                            <TableCell>الصف</TableCell>
                            <TableCell>الخطة</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>انتهاء الاشتراك</TableCell>
                            <TableCell>آخر دخول</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {searchResult.map(s => (
                            <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                              <TableCell>{s.id}</TableCell>
                              <TableCell sx={{ direction: 'ltr', textAlign: 'right' }}>{s.mob}</TableCell>
                              <TableCell>{s.name}</TableCell>
                              <TableCell>{s.grade}</TableCell>
                              <TableCell>{s.plan}</TableCell>
                              <TableCell>
                                <Chip label={s.active ? 'نشط' : 'غير نشط'} color={s.active ? 'success' : 'default'} size="small" />
                              </TableCell>
                              <TableCell>{s.sub_end ? new Date(s.sub_end).toLocaleDateString('ar-SA') : '-'}</TableCell>
                              <TableCell sx={{ direction: 'ltr', textAlign: 'right', fontSize: '0.8rem' }}>
                                {s.last_login ? new Date(s.last_login).toLocaleString('ar-SA') : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* All parent codes */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>جميع أكواد الأهل</Typography>
                {!loading && (
                  <Chip label={`${parentGroups.length} كود`} color="primary" size="small" />
                )}
              </Box>

              {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
              {error && <Alert severity="error">{error}</Alert>}
              {!loading && !error && (
                <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>كود ولي الأمر</TableCell>
                        <TableCell>عدد الأبناء</TableCell>
                        <TableCell>إجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parentGroups.map((pg, idx) => (
                        <TableRow key={pg.parent_code} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ direction: 'ltr', textAlign: 'right', fontFamily: 'monospace' }}>
                            {pg.parent_code}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pg.child_count}
                              color={pg.child_count > 1 ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => { setSearchCode(pg.parent_code); }}
                            >
                              عرض
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
