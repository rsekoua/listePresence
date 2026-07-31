import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import dayjs from 'dayjs'
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  CopyButton,
  Group,
  Menu,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import {
  IconDotsVertical,
  IconLink,
  IconLockCog,
  IconPencil,
  IconToggleLeft,
  IconToggleRight,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react'
import { fetchMe } from '../api/activites'
import {
  createUser,
  deleteUser,
  fetchUsers,
  generateResetLink,
  resetUserPassword,
  updateUser,
  type AppUser,
} from '../api/users'
import type { Role } from '../api/types'
import { RoleSelect } from '../components/RoleSelect'
import { UserDetailDialog } from '../components/UserDetailDialog'
import { PageHeader } from '../components/PageHeader'
import { errorMessage, notify } from '../lib/notify'

const PAGE_SIZES = [10, 25, 50]
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function UsersPage() {
  const queryClient = useQueryClient()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: me?.role === 'admin',
  })

  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [resetFor, setResetFor] = useState<AppUser | null>(null)
  const [linkFor, setLinkFor] = useState<AppUser | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const toggleActive = useMutation({
    mutationFn: (u: AppUser) => updateUser(u.id, { is_active: !u.is_active }),
    onSuccess: (u) => {
      invalidate()
      notify.success(u.is_active ? 'Compte activé.' : 'Compte désactivé.')
    },
    onError: (e) => notify.error(errorMessage(e, 'Action impossible.')),
  })

  const remove = useMutation({
    mutationFn: (u: AppUser) => deleteUser(u.id),
    onSuccess: () => {
      invalidate()
      notify.success('Compte supprimé.')
    },
    onError: (e) => notify.error(errorMessage(e, 'Suppression impossible.')),
  })

  const allUsers = users ?? []
  const paginated = useMemo(() => {
    const all = users ?? []
    const from = (page - 1) * pageSize
    return all.slice(from, from + pageSize)
  }, [users, page, pageSize])

  const confirmDelete = (u: AppUser) =>
    modals.openConfirmModal({
      title: 'Supprimer le compte ?',
      centered: true,
      children: (
        <Text size="sm">
          Le compte « {u.username} » sera définitivement supprimé. Cette action est
          irréversible.
        </Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: () => remove.mutate(u),
    })

  if (me && me.role !== 'admin') {
    return (
      <Box>
        <PageHeader title="Utilisateurs" />
        <Paper p="xl" radius="sm">
          <Center>
            <Text c="dimmed">Accès réservé aux administrateurs.</Text>
          </Center>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gérez les comptes organisateurs et administrateurs"
        actions={
          <Button leftSection={<IconUserPlus size={18} />} onClick={openCreate}>
            Nouvel utilisateur
          </Button>
        }
      />

      <Paper radius="sm" withBorder style={{ overflow: 'hidden' }}>
        <DataTable<AppUser>
          minHeight={180}
          withRowBorders
          highlightOnHover
          fetching={isLoading}
          records={paginated}
          idAccessor="id"
          noRecordsText="Aucun utilisateur"
          onRowClick={({ record }) => setEditUser(record)}
          rowStyle={() => ({ cursor: 'pointer' })}
          totalRecords={allUsers.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={setPage}
          recordsPerPageOptions={PAGE_SIZES}
          onRecordsPerPageChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          columns={[
            {
              accessor: 'username',
              title: 'Utilisateur',
              render: (u) => (
                <Group gap="sm" wrap="nowrap">
                  <Avatar radius="xl" size={32} color="brand" variant="light">
                    {u.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm" fw={600} truncate>
                    {u.username}
                  </Text>
                </Group>
              ),
            },
            { accessor: 'email', title: 'Email' },
            {
              accessor: 'role',
              title: 'Rôle',
              width: 150,
              render: (u) => (
                <Badge
                  variant={u.role === 'admin' ? 'filled' : 'outline'}
                  color="brand"
                  style={{ textTransform: 'none' }}
                >
                  {u.role === 'admin' ? 'Administrateur' : 'Organisateur'}
                </Badge>
              ),
            },
            {
              accessor: 'nb_activites',
              title: 'Activités',
              width: 100,
              textAlign: 'center',
            },
            {
              accessor: 'is_active',
              title: 'Statut',
              width: 110,
              textAlign: 'center',
              render: (u) => (
                <Badge
                  variant={u.is_active ? 'filled' : 'outline'}
                  color={u.is_active ? 'teal' : 'gray'}
                  style={{ textTransform: 'none' }}
                >
                  {u.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              ),
            },
            {
              accessor: 'created_at',
              title: 'Créé le',
              width: 120,
              render: (u) => dayjs(u.created_at).format('DD/MM/YYYY'),
            },
            {
              accessor: 'actions',
              title: '',
              width: 60,
              textAlign: 'right',
              render: (u) => (
                <Box onClick={(e) => e.stopPropagation()}>
                  <Menu position="bottom-end" withinPortal shadow="md">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" aria-label="Actions">
                        <IconDotsVertical size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => setEditUser(u)}>
                        Modifier
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          u.is_active ? <IconToggleLeft size={16} /> : <IconToggleRight size={16} />
                        }
                        disabled={u.id === me?.id}
                        onClick={() => toggleActive.mutate(u)}
                      >
                        {u.is_active ? 'Désactiver' : 'Activer'}
                      </Menu.Item>
                      <Menu.Item leftSection={<IconLockCog size={16} />} onClick={() => setResetFor(u)}>
                        Réinitialiser le mot de passe
                      </Menu.Item>
                      <Menu.Item leftSection={<IconLink size={16} />} onClick={() => setLinkFor(u)}>
                        Générer un lien de réinitialisation
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        disabled={u.id === me?.id}
                        onClick={() => confirmDelete(u)}
                      >
                        Supprimer
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Box>
              ),
            },
          ]}
        />
      </Paper>

      <CreateUserDialog opened={createOpen} onClose={closeCreate} />
      <UserDetailDialog user={editUser} onClose={() => setEditUser(null)} />
      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />
      <GenerateResetLinkDialog user={linkFor} onClose={() => setLinkFor(null)} />
    </Box>
  )
}

// --- Dialogs ---------------------------------------------------------------

function CreateUserDialog({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('organisateur')

  const reset = () => {
    setUsername('')
    setEmail('')
    setPassword('')
    setRole('organisateur')
  }

  const mutation = useMutation({
    mutationFn: () => createUser({ username, email, password, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      notify.success('Utilisateur créé.')
      reset()
      onClose()
    },
    onError: (e) => notify.error(errorMessage(e, 'Création impossible.')),
  })

  const valid = username.trim() && EMAIL_RE.test(email) && password.length >= 8

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Nouvel utilisateur" centered>
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <TextInput
            label="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            data-autofocus
          />
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="Mot de passe initial"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            error={password.length > 0 && password.length < 8 ? 'Au moins 8 caractères.' : undefined}
          />
          <RoleSelect value={role} onChange={setRole} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!valid} loading={mutation.isPending}>
              Créer
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user!.id, password),
    onSuccess: () => {
      notify.success('Mot de passe réinitialisé.')
      setPassword('')
      onClose()
    },
    onError: (e) => notify.error(errorMessage(e, 'Réinitialisation impossible.')),
  })

  return (
    <Modal opened={Boolean(user)} onClose={onClose} title="Réinitialiser le mot de passe" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Nouveau mot de passe pour <strong>{user?.username}</strong> (8 caractères min.).
        </Text>
        <PasswordInput
          label="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          data-autofocus
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={password.length < 8}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Réinitialiser
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function GenerateResetLinkDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const [resetUrl, setResetUrl] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => generateResetLink(user!.id),
    onSuccess: (data) => setResetUrl(data.reset_url),
    onError: (e) => notify.error(errorMessage(e, 'Génération impossible.')),
  })

  const handleClose = () => {
    setResetUrl(null)
    onClose()
  }

  return (
    <Modal opened={Boolean(user)} onClose={handleClose} title="Lien de réinitialisation" centered>
      <Stack gap="md">
        {resetUrl ? (
          <>
            <Text size="sm" c="dimmed">
              Transmettez ce lien à <strong>{user?.username}</strong> (WhatsApp, SMS…). Valable 1
              heure, utilisable une seule fois — {user?.username} choisit son propre mot de passe.
            </Text>
            <Group gap="xs" wrap="nowrap">
              <TextInput value={resetUrl} readOnly style={{ flexGrow: 1 }} />
              <CopyButton value={resetUrl}>
                {({ copied, copy }) => (
                  <Button color={copied ? 'teal' : 'brand'} onClick={copy}>
                    {copied ? 'Copié' : 'Copier'}
                  </Button>
                )}
              </CopyButton>
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={handleClose}>
                Fermer
              </Button>
            </Group>
          </>
        ) : (
          <>
            <Text size="sm" c="dimmed">
              Génère un lien à usage unique permettant à <strong>{user?.username}</strong> de
              choisir lui-même un nouveau mot de passe.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={handleClose}>
                Annuler
              </Button>
              <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
                Générer le lien
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
