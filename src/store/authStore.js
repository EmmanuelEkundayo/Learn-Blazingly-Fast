import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      loading: true,
      userEmail: null,
      userName: '',

      async init() {
        try {
          const res = await fetch('/api/v1/auth/me')
          if (res.ok) {
            const { user } = await res.json()
            set({ user, userEmail: user.email, userName: user.name, loading: false })
          } else {
            set({ user: null, userEmail: null, userName: '', loading: false })
          }
        } catch {
          set({ user: null, userEmail: null, userName: '', loading: false })
        }
      },

      async register(name, email, password) {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Registration failed')
        }
        const { user } = await res.json()
        set({ user, userEmail: user.email, userName: user.name })
        return user
      },

      async login(email, password) {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Login failed')
        }
        const { user } = await res.json()
        set({ user, userEmail: user.email, userName: user.name })
        return user
      },

      async logout() {
        await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
        set({ user: null, userEmail: null, userName: '' })
      },

      setUserEmail() {},

      setUserName() {}
    }),
    {
      name: 'learnblazinglyfast-auth',
      partialize: (state) => ({
        user: state.user,
        userEmail: state.userEmail,
        userName: state.userName,
      }),
    }
  )
)
