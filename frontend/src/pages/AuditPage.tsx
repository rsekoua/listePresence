import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Box,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { fetchMe } from '../api/activites'
import {
  AUDIT_ACTIONS,
  fetchAuditLogs,
  type AuditEntry,
  type AuditFilters,
} from '../api/audit'
import { actionMeta } from '../components/auditMeta'

export function AuditPage() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')

  const filters: AuditFilters = {
    ...(search ? { search } : {}),
    ...(action ? { action } : {}),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit', search, action],
    queryFn: () => fetchAuditLogs(filters),
    enabled: me?.role === 'admin',
  })

  const rows = useMemo(() => (data ?? []).map((e, i) => ({ id: i, ...e })), [data])

  if (me && me.role !== 'admin') {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Journal d'audit
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Accès réservé aux administrateurs.</Typography>
        </Paper>
      </Box>
    )
  }

  const columns: GridColDef<AuditEntry & { id: number }>[] = useMemo(() => [
    {
      field: 'created_at',
      headerName: 'Date',
      width: 150,
      valueFormatter: (value) => dayjs(value as string).format('DD/MM/YYYY HH:mm'),
    },
    { field: 'username', headerName: 'Utilisateur', width: 140 },
    {
      field: 'action_label',
      headerName: 'Action',
      width: 220,
      renderCell: (params) => {
        const meta = actionMeta(params.row.action)
        return (
          <Stack sx={{ height: '100%', justifyContent: 'center' }}>
            <Chip
              size="small"
              icon={meta.icon}
              label={params.row.action_label}
              color={meta.color === 'default' ? undefined : meta.color}
              variant={meta.color === 'default' ? 'outlined' : 'filled'}
              sx={{ fontWeight: 600, '& .MuiChip-icon': { fontSize: 15 } }}
            />
          </Stack>
        )
      },
    },
    { field: 'objet', headerName: 'Détails', flex: 1, minWidth: 200 },
    { field: 'ip_address', headerName: 'IP', width: 130 },
  ], [])

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Journal d'audit
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Actions des utilisateurs (500 entrées les plus récentes)
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
        <TextField
          placeholder="Rechercher (utilisateur, détails…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Toutes</MenuItem>
          {AUDIT_ACTIONS.map((a) => (
            <MenuItem key={a.value} value={a.value}>
              {a.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={48}
          columnHeaderHeight={48}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          sx={{
            border: 0,
            fontSize: 13,
            '--DataGrid-rowBorderColor': '#eef0f4',
            '& .MuiDataGrid-columnHeader': { bgcolor: '#f8fafc' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc' },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 0.4,
            },
            '& .MuiDataGrid-cell': { borderColor: '#eef0f4' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-footerContainer': { borderColor: '#eef0f4' },
          }}
          localeText={{
            ...frFR.components.MuiDataGrid.defaultProps.localeText,
            noRowsLabel: 'Aucune entrée',
          }}
        />
      </Paper>
    </Box>
  )
}
