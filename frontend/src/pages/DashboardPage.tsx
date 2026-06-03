import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Toolbar,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { frFR } from '@mui/x-data-grid/locales'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import { fetchActivites } from '../api/activites'
import type { Activite, StatutActivite } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { CreateActiviteDialog } from '../components/CreateActiviteDialog'

const STATUT_LABEL: Record<StatutActivite, { label: string; color: 'success' | 'default' | 'warning' }> = {
  ouvert: { label: 'Ouverte', color: 'success' },
  ferme: { label: 'Fermée', color: 'warning' },
  archive: { label: 'Archivée', color: 'default' },
}

export function DashboardPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['activites'],
    queryFn: fetchActivites,
  })

  const columns: GridColDef<Activite>[] = [
    { field: 'nom', headerName: 'Nom', flex: 1, minWidth: 160 },
    { field: 'lieu', headerName: 'Lieu', flex: 1, minWidth: 130 },
    {
      field: 'date_debut',
      headerName: 'Début',
      width: 160,
      valueFormatter: (value) => dayjs(value as string).format('DD/MM/YYYY HH:mm'),
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 120,
      renderCell: (params) => {
        const s = STATUT_LABEL[params.value as StatutActivite]
        return <Chip size="small" label={s.label} color={s.color} />
      },
    },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <QrCode2RoundedIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gestion de Présence
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
          >
            Déconnexion
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Mes activités
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Nouvelle activité
          </Button>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          <DataGrid
            rows={data ?? []}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            onRowClick={(params) => navigate(`/activites/${params.id}`)}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 20, 50]}
            sx={{ border: 0, cursor: 'pointer', minHeight: 400 }}
            localeText={{
              ...frFR.components.MuiDataGrid.defaultProps.localeText,
              noRowsLabel: 'Aucune activité pour le moment',
            }}
          />
        </Box>
      </Container>

      <CreateActiviteDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  )
}
