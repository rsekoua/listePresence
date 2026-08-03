import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Center,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { IconBell, IconUserPlus } from '@tabler/icons-react'
import { useNotifications, type AppNotification } from '../context/NotificationContext'
import { nomComplet } from '../lib/participantName'

dayjs.extend(relativeTime)
dayjs.locale('fr')

const shakeKeyframes = `
@keyframes bell-shake {
  0%,100% { transform: rotate(0deg); }
  15%      { transform: rotate(18deg); }
  30%      { transform: rotate(-16deg); }
  45%      { transform: rotate(12deg); }
  60%      { transform: rotate(-8deg); }
  75%      { transform: rotate(4deg); }
}
`

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [opened, setOpened] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [filterActiviteId, setFilterActiviteId] = useState<string | null>(null)
  const prevUnread = useRef(unreadCount)
  const navigate = useNavigate()

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 700)
      return () => clearTimeout(t)
    }
    prevUnread.current = unreadCount
  }, [unreadCount])

  function handleClose() {
    setOpened(false)
    setFilterActiviteId(null)
    if (unreadCount > 0) markAllRead()
  }

  function handleToggle() {
    if (opened) {
      handleClose()
    } else {
      setOpened(true)
    }
  }

  function handleNavigate(activiteId: string) {
    handleClose()
    navigate(`/activites/${activiteId}`)
  }

  const activites = Array.from(
    new Map(notifications.map((n) => [n.activiteId, n.activiteNom])).entries(),
  )

  const filtered = filterActiviteId
    ? notifications.filter((n) => n.activiteId === filterActiviteId)
    : notifications

  const today = dayjs().startOf('day')
  const todayNotifs = notifications.filter((n) => dayjs(n.timestamp).isAfter(today))
  const todayInscrits = todayNotifs.reduce((acc, n) => acc + n.participants.length, 0)
  const todayActivites = new Set(todayNotifs.map((n) => n.activiteId)).size

  return (
    <>
      <style>{shakeKeyframes}</style>
      <Popover
        opened={opened}
        onClose={handleClose}
        width={320}
        position="bottom-end"
        shadow="md"
        withArrow
        arrowPosition="side"
      >
        <Popover.Target>
          <Indicator
            color="red"
            label={unreadCount > 99 ? '99+' : String(unreadCount)}
            size={16}
            disabled={unreadCount === 0}
            processing={unreadCount > 0}
          >
            <ActionIcon
              variant="default"
              size="md"
              aria-label="Notifications"
              onClick={handleToggle}
            >
              <IconBell
                size={16}
                stroke={1.7}
                style={shaking ? { animation: 'bell-shake 0.7s ease' } : undefined}
              />
            </ActionIcon>
          </Indicator>
        </Popover.Target>

        <Popover.Dropdown p={0}>
          {/* En-tête */}
          <Group
            justify="space-between"
            px="md"
            py="sm"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
          >
            <Text fw={700} size="sm">Notifications</Text>
            {notifications.length > 0 && (
              <Text
                size="xs"
                c="dimmed"
                style={{ cursor: 'pointer' }}
                onClick={clearAll}
              >
                Effacer tout
              </Text>
            )}
          </Group>

          {/* Résumé journalier */}
          {todayInscrits > 0 && (
            <Group
              px="md"
              py={6}
              gap={6}
              style={{
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                background: 'var(--mantine-color-brand-0)',
              }}
            >
              <IconUserPlus size={14} color="var(--mantine-color-brand-6)" />
              <Text size="xs" fw={600} c="brand">Aujourd'hui :</Text>
              <Text size="xs" c="dimmed">
                {todayInscrits} inscrit{todayInscrits > 1 ? 's' : ''} sur{' '}
                {todayActivites} activité{todayActivites > 1 ? 's' : ''}
              </Text>
            </Group>
          )}

          {/* Filtre par activité */}
          {activites.length >= 2 && (
            <Box
              px="md"
              py={6}
              style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
            >
              <Select
                size="xs"
                placeholder="Toutes les activités"
                clearable
                value={filterActiviteId}
                onChange={setFilterActiviteId}
                data={activites.map(([id, nom]) => ({ value: id, label: nom }))}
              />
            </Box>
          )}

          {/* Liste */}
          {filtered.length === 0 ? (
            <Center py={40}>
              <Stack align="center" gap={8}>
                <IconBell size={32} color="var(--mantine-color-gray-4)" />
                <Text size="sm" c="dimmed">Aucune notification</Text>
              </Stack>
            </Center>
          ) : (
            <ScrollArea.Autosize mah={400}>
              {filtered.map((n) => (
                <NotificationItem key={n.id} n={n} onNavigate={handleNavigate} />
              ))}
            </ScrollArea.Autosize>
          )}
        </Popover.Dropdown>
      </Popover>
    </>
  )
}

function NotificationItem({
  n,
  onNavigate,
}: {
  n: AppNotification
  onNavigate: (activiteId: string) => void
}) {
  const MAX_SHOWN = 2
  const shown = n.participants.slice(0, MAX_SHOWN)
  const rest = n.participants.length - MAX_SHOWN

  return (
    <UnstyledButton
      w="100%"
      onClick={() => onNavigate(n.activiteId)}
      style={{
        padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
        background: n.read ? 'transparent' : 'var(--mantine-color-gray-0)',
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--mantine-color-gray-1)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--mantine-color-gray-0)' }}
    >
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <Avatar color="brand" variant="light" size={34} radius="xl">
          <IconUserPlus size={16} />
        </Avatar>
        <Box style={{ minWidth: 0, flexGrow: 1 }}>
          <Group gap={6} align="center" mb={2}>
            <Text size="sm" fw={600} lh={1.3}>
              {n.participants.length === 1
                ? '1 nouveau participant'
                : `${n.participants.length} nouveaux participants`}
            </Text>
            {!n.read && (
              <Box
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--mantine-color-red-6)', flexShrink: 0,
                }}
              />
            )}
          </Group>

          <Text size="xs" c="dimmed" truncate mb={6}>{n.activiteNom}</Text>

          <Stack gap={4}>
            {shown.map((p) => (
              <Group key={p.id} gap={6} wrap="nowrap">
                <Avatar size={20} radius="xl" color="gray" variant="light" style={{ fontSize: 9 }}>
                  {p.nom.charAt(0).toUpperCase()}
                </Avatar>
                <Text size="xs" fw={600} truncate>{nomComplet(p)}</Text>
                <Badge size="xs" variant="outline" color="gray">{p.structure}</Badge>
              </Group>
            ))}
            {rest > 0 && (
              <Text size="xs" c="dimmed">+ {rest} autre{rest > 1 ? 's' : ''}</Text>
            )}
          </Stack>

          <Tooltip label={dayjs(n.timestamp).format('DD/MM/YYYY HH:mm:ss')} position="bottom-start">
            <Text size="xs" c="dimmed" mt={4} display="inline-block">
              {dayjs(n.timestamp).fromNow()}
            </Text>
          </Tooltip>
        </Box>
      </Group>
    </UnstyledButton>
  )
}
