'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../../backend'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Signing in...')
      const { user, error: authError } = await authService.signIn(email, password)
      console.log('Sign in result:', { user: !!user, error: authError })

      if (authError || !user) {
        setError(authError?.message || 'Sign in failed')
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Sign in exception:', err)
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
