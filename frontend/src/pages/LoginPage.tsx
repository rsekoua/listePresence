import { useNavigate } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconQrcode } from '@tabler/icons-react'
import { loginRequest } from '../api/activites'
import { useAuth } from '../auth/AuthContext'
import { notify } from '../lib/notify'

const schema = z.object({
  username: z.string().min(1, "L'identifiant est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type LoginForm = z.infer<typeof schema>

/** Page de connexion de l'organisateur (AUTH-01) — carte verticale sans bordure. */
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

  const errorMessage = (() => {
    if (!mutation.isError) return null
    const status = isAxiosError(mutation.error) ? mutation.error.response?.status : undefined
    if (status === 401) return 'Identifiant ou mot de passe incorrect.'
    if (status === 429)
      return 'Trop de tentatives de connexion. Réessayez dans quelques minutes.'
    return 'Une erreur est survenue. Réessayez.'
  })()

  // Éléments décoratifs (sans backend) : informent l'utilisateur au clic.
  const soon = (feature: string) => notify.info(`${feature} n'est pas disponible pour le moment.`)

  return (
    <Center mih="100vh" p="md">
      <Stack gap="lg" w="100%" maw={400} align="center">
        {/* Marque au-dessus de la carte */}
        <Group gap="xs" align="center">
          <ThemeIcon size={30} radius="md" color="brand">
            <IconQrcode size={18} />
          </ThemeIcon>
          <Text fw={800} size="md">
            Gestion de liste de Présence
          </Text>
        </Group>

        {/* Carte sans bordure */}
        <Paper w="100%" radius="lg" p="xl" withBorder={false} shadow="sm">
          
          <Box ta="center" mb="lg">
            <Title order={3} fw={800}>
              Bienvenue !
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Connectez-vous à votre espace organisateur
            </Text>
          </Box>
            <Divider label="Connectez vous" labelPosition="center" my="lg" />
          {/* <Stack gap="sm">
            <Button
              type="button"
              variant="default"
              fullWidth
              size="md"
              leftSection={<IconBrandApple size={18} />}
              onClick={() => soon('La connexion avec Apple')}
            >
              Continuer avec Apple
            </Button>
            <Button
              type="button"
              variant="default"
              fullWidth
              size="md"
              leftSection={<IconBrandGoogle size={18} />}
              onClick={() => soon('La connexion avec Google')}
            >
              Continuer avec Google
            </Button>
          </Stack> */}

          {/* <Divider label="Ou continuer avec" labelPosition="center" my="lg" /> */}

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
                size="md"
                key={form.key('username')}
                {...form.getInputProps('username')}
              />

              <Box>
                <Group justify="space-between" mb={6} wrap="nowrap">
                  <Text component="label" size="sm" fw={600}>
                    Mot de passe
                  </Text>
                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    c="dark"
                    onClick={() =>
                      notify.info('Contactez votre administrateur pour obtenir un lien de réinitialisation.')
                    }
                  >
                    Mot de passe oublié ?
                  </Anchor>
                </Group>
                <PasswordInput
                  placeholder="••••••••"
                  autoComplete="current-password"
                  size="md"
                  key={form.key('password')}
                  {...form.getInputProps('password')}
                />
              </Box>

              <Button type="submit" size="md" fullWidth mt="xs" loading={mutation.isPending}>
                Se connecter
              </Button>
            </Stack>
          </form>

          <Text size="sm" ta="center" mt="lg">
            Pas encore de compte ?{' '}
            <Anchor component="button" type="button" fw={600} onClick={() => soon('La création de compte')}>
              Demander un accès
            </Anchor>
          </Text>
        </Paper>

        <Text size="xs" c="dimmed" ta="center" maw={340}>
          En continuant, vous acceptez nos{' '}
          <Anchor component="button" type="button" size="xs" c="dimmed" td="underline" onClick={() => soon('Ce document')}>
            Conditions d'utilisation
          </Anchor>{' '}
          et notre{' '}
          <Anchor component="button" type="button" size="xs" c="dimmed" td="underline" onClick={() => soon('Ce document')}>
            Politique de confidentialité
          </Anchor>
          .
        </Text>
      </Stack>
    </Center>
  )
}
