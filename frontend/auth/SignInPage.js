'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

      // Fetch profile and set in context
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
    <div className="signin-wrapper">
      <div className="signin-card">
        <div className="signin-header">
          <h1 className="signin-title">Firm Name</h1>
          <p className="signin-subtitle">Sign in to your account</p>
        </div>

        <form className="signin-form" onSubmit={handleSignIn}>
          {error && <div className="signin-error">{error}</div>}

          <div className="signin-field">
            <label className="signin-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="signin-input"
              type="text"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="signin-field">
            <label className="signin-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="signin-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
