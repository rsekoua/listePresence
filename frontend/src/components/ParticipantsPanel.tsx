import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import {
  fetchParticipants,
  fetchStats,
  type Participant,
} from '../api/participants'
import { ParticipantDetailDialog } from './ParticipantDetailDialog'

const REFRESH_MS = 30_000

export function ParticipantsPanel({ activiteId }: { activiteId: string }) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [search, setSearch] = useState('')
  const [structure, setStructure] = useState('')
  const [selected, setSelected] = useState<Participant | null>(null)

  const { data: page, isLoading } = useQuery({
    queryKey: ['participants', activiteId],
    queryFn: () => fetchParticipants(activiteId),
    refetchInterval: REFRESH_MS,
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', activiteId],
    queryFn: () => fetchStats(activiteId),
    refetchInterval: REFRESH_MS,
  })

  const participants = page?.items ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return participants.filter((p) => {
      const matchSearch =
        !q ||
        `${p.prenom} ${p.nom} ${p.email} ${p.numero_cni}`
          .toLowerCase()
          .includes(q)
      const matchStruct = !structure || p.structure === structure
      return matchSearch && matchStruct
    })
  }, [participants, search, structure])

  const columns: GridColDef<Participant>[] = [
    {
      field: 'nom',
      headerName: 'Participant',
      flex: 1.4,
      minWidth: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', height: '100%' }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', color: 'primary.dark', fontSize: 13 }}>
            {params.row.prenom.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {params.row.prenom} {params.row.nom}
          </Typography>
        </Stack>
      ),
    },
    { field: 'structure', headerName: 'Structure', flex: 1, minWidth: 100 },
    { field: 'telephone_wave', headerName: 'Téléphone', width: 125 },
    {
      field: 'horodatage',
      headerName: 'Enregistré',
      width: 120,
      valueFormatter: (v) => dayjs(v as string).format('DD/MM/YY HH:mm'),
    },
    {
      field: 'cni_complete',
      headerName: 'CNI',
      width: 90,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" color="success" label="OK" variant="outlined" />
        ) : (
          <Chip size="small" color="warning" label="!" variant="outlined" />
        ),
    },
  ]

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', mb: 2 }}
      >
        <GroupsRoundedIcon color="primary" />
        <Typography variant="h6">Participants</Typography>
        <Chip
          size="small"
          color="primary"
          label={stats?.total ?? participants.length}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Actualisé toutes les 30 s
        </Typography>
      </Stack>

      {/* Statistiques */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="h4">{stats?.total ?? '—'}</Typography>
              <Typography variant="body2" color="text.secondary">
                Inscrits
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h4" color="success.main">
                {stats?.cni_completes ?? '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CNI complètes
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <BadgeRoundedIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">Répartition par structure</Typography>
          </Stack>
          <Stack spacing={1}>
            {(stats?.par_structure ?? []).slice(0, 4).map((s) => {
              const pct = stats?.total ? (s.count / stats.total) * 100 : 0
              return (
                <Box key={s.structure}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="caption" noWrap sx={{ maxWidth: '75%' }}>
                      {s.structure}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.count}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )
            })}
            {!stats?.par_structure.length && (
              <Typography variant="caption" color="text.secondary">
                Aucune donnée
              </Typography>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* Filtres */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="Rechercher (nom, email, CNI)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
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
          label="Structure"
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
          sx={{ minWidth: { sm: 220 } }}
          fullWidth
        >
          <MenuItem value="">Toutes les structures</MenuItem>
          {(stats?.par_structure ?? []).map((s) => (
            <MenuItem key={s.structure} value={s.structure}>
              {s.structure} ({s.count})
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Liste */}
      <Paper sx={{ overflow: 'hidden' }}>
        {!isDesktop ? (
          <ParticipantCards
            participants={filtered}
            isLoading={isLoading}
            onSelect={setSelected}
          />
        ) : (
          <DataGrid
            rows={filtered}
            columns={columns}
            loading={isLoading}
            getRowId={(r) => r.id}
            onRowClick={(p) => setSelected(p.row)}
            disableRowSelectionOnClick
            disableColumnMenu
            rowHeight={56}
            columnHeaderHeight={46}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            pageSizeOptions={[20, 50, 100]}
            sx={{
              border: 0,
              cursor: 'pointer',
              height: 460,
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
              '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
            }}
            localeText={{
              ...frFR.components.MuiDataGrid.defaultProps.localeText,
              noRowsLabel: 'Aucun participant',
            }}
          />
        )}
      </Paper>

      <ParticipantDetailDialog
        activiteId={activiteId}
        participant={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </Box>
  )
}

function ParticipantCards({
  participants,
  isLoading,
  onSelect,
}: {
  participants: Participant[]
  isLoading: boolean
  onSelect: (p: Participant) => void
}) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!participants.length) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>
        Aucun participant
      </Typography>
    )
  }
  return (
    <Stack divider={<Divider />}>
      {participants.map((p) => (
        <Stack
          key={p.id}
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
          onClick={() => onSelect(p)}
        >
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
            {p.prenom.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {p.prenom} {p.nom}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {p.structure} · {p.telephone_wave}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={p.cni_complete ? 'success' : 'warning'}
            label={p.cni_complete ? 'CNI' : '!'}
            variant="outlined"
          />
        </Stack>
      ))}
    </Stack>
  )
}
