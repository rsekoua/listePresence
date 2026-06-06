import { useNavigate } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Alert,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconLock, IconQrcode, IconUser } from '@tabler/icons-react'
import { loginRequest } from '../api/activites'
import { useAuth } from '../auth/AuthContext'

const schema = z.object({
  username: z.string().min(1, "L'identifiant est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type LoginForm = z.infer<typeof schema>

/** Page de connexion de l'organisateur (AUTH-01) — formulaire centré. */
export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const form = useForm<LoginForm>({
    mode: 'uncontrolled',
    initialValues: { username: '', password: '' },
    validate: zod4Resolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: LoginForm) => loginRequest(data.username, data.password),
    onSuccess: (tokens) => {
      login(tokens.access, tokens.refresh)
      navigate('/dashboard', { replace: true })
    },
  })

  const errorMessage = mutation.isError
    ? isAxiosError(mutation.error) && mutation.error.response?.status === 401
      ? 'Identifiant ou mot de passe incorrect.'
      : 'Une erreur est survenue. Réessayez.'
    : null

  return (
    <Center mih="100vh" p="md">
      <Paper w="100%" maw={400} p="xl" radius="sm">
        {/* Marque */}
        <Stack align="center" gap="sm" mb="xl">
          <ThemeIcon size={48} radius="sm" color="brand">
            <IconQrcode size={26} />
          </ThemeIcon>
          <Box ta="center">
            <Title order={3} fw={800}>
              Connexion
            </Title>
            <Text size="sm" c="dimmed">
              Espace organisateur
            </Text>
          </Box>
        </Stack>

        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack gap="md">
            {errorMessage && (
              <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
                {errorMessage}
              </Alert>
            )}

            <TextInput
              label="Identifiant"
              placeholder="votre identifiant"
              autoComplete="username"
              data-autofocus
              leftSection={<IconUser size={16} />}
              key={form.key('username')}
              {...form.getInputProps('username')}
            />
            <PasswordInput
              label="Mot de passe"
              placeholder="••••••••"
              autoComplete="current-password"
              leftSection={<IconLock size={16} />}
              key={form.key('password')}
              {...form.getInputProps('password')}
            />

            <Button type="submit" size="md" fullWidth loading={mutation.isPending}>
              Se connecter
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
