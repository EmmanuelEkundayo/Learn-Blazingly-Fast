import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import Layout from './Layout.jsx'
import AdminReviewModal from './AdminReviewModal.jsx'

describe('AdminReview Shortcut & Modal', () => {
  it('opens admin modal on macOS Ctrl+Option+O (where e.key is ø and e.code is KeyO)', async () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    // Initially modal is closed
    expect(screen.queryByText('Review Manager')).toBeNull()

    // Trigger macOS Ctrl+Option+O
    fireEvent.keyDown(window, {
      ctrlKey: true,
      altKey: true,
      key: 'ø',
      code: 'KeyO',
    })

    await waitFor(() => {
      expect(screen.getByText('Review Manager')).toBeDefined()
    })
  })

  it('opens admin modal on macOS Cmd+Option+O (where e.metaKey and e.altKey are true)', async () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    // Trigger macOS Cmd+Option+O
    fireEvent.keyDown(window, {
      metaKey: true,
      altKey: true,
      key: 'ø',
      code: 'KeyO',
    })

    await waitFor(() => {
      expect(screen.getByText('Review Manager')).toBeDefined()
    })
  })

  it('opens admin modal on Windows/Linux Ctrl+Alt+O', async () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    fireEvent.keyDown(window, {
      ctrlKey: true,
      altKey: true,
      key: 'o',
      code: 'KeyO',
    })

    await waitFor(() => {
      expect(screen.getByText('Review Manager')).toBeDefined()
    })
  })

  it('opens admin modal via open-admin-reviews custom event', async () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    )

    act(() => {
      window.dispatchEvent(new CustomEvent('open-admin-reviews'))
    })

    await waitFor(() => {
      expect(screen.getByText('Review Manager')).toBeDefined()
    })
  })

  it('closes AdminReviewModal when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<AdminReviewModal isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
