'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Button, Card, Center, PasswordInput, Stack, Text, TextInput, Alert, Title
} from '@mantine/core'
import { authService } from '../../backend'
import { useAuth } from '../shared/auth'

export default function SignInPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user, session, error: authError } = await authService.signIn(email, password)

      if (authError || !user) {
        setError(authError?.message || 'Sign in failed')
        return
      }

      const profile = await authService.fetchProfile(user.id)
      setUser({ ...user, access_token: session?.access_token, profile })

      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center mih="100vh" p="md">
      <Card shadow="lg" radius="lg" w="100%" maw={420} withBorder p={0} style={{ overflow: 'hidden' }}>
        <Box
          p="xl"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textAlign: 'center',
          }}
        >
          <Title order={2} c="white" fw={300} style={{ letterSpacing: 1 }}>
            {process.env.NEXT_PUBLIC_FIRM_NAME || 'Firm Name'}
          </Title>
          <Text c="white" size="md" mt={8} opacity={0.9}>Sign in to your account</Text>
        </Box>

        <Box p="xl">
          <form onSubmit={handleSignIn}>
            <Stack gap="md">
              {error && <Alert color="red" variant="light">{error}</Alert>}

              <TextInput
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.currentTarget.value)}
                autoComplete="username"
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.currentTarget.value)}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="md"
                mt="xs"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Sign In
              </Button>
            </Stack>
          </form>
        </Box>
      </Card>
    </Center>
  )
}
