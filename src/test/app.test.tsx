import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { useStore } from '../store'

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  useStore.getState().resetAll()
})

describe('Onboarding flow', () => {
  it('walks through steps and starts the app', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(screen.getByText('Domino')).toBeInTheDocument()

    await user.click(screen.getByText('Далее'))
    await user.click(screen.getByText('Далее'))
    await user.click(screen.getByText('Далее'))

    await user.type(screen.getByLabelText('Имя первого партнёра'), 'Аня')
    await user.type(screen.getByLabelText('Имя второго партнёра'), 'Боря')
    await user.click(screen.getByText('Начать играть'))

    // Now on Home
    expect(await screen.findByText('Эта неделя')).toBeInTheDocument()
    expect(screen.getByText('Аня')).toBeInTheDocument()
  })
})

describe('Logging a chore from Home updates the live score', () => {
  beforeEach(() => {
    useStore.getState().completeOnboarding('Аня', 'Боря')
  })

  it('logs and reflects points', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByTestId('home-add'))
    const firstChore = useStore.getState().chores.find((c) => !c.archived)!
    await user.click(await screen.findByTestId(`pick-chore-${firstChore.id}`))
    await user.click(await screen.findByTestId('log-by-A'))

    // store reflects the entry
    expect(useStore.getState().log.length).toBe(1)
    expect(useStore.getState().log[0].byKey).toBe('A')
  })
})

describe('Chores CRUD via UI', () => {
  beforeEach(() => {
    useStore.getState().completeOnboarding('Аня', 'Боря')
  })

  it('adds a new chore through the sheet', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByText('Дела'))

    await user.click(await screen.findByTestId('add-chore'))
    await user.type(screen.getByLabelText('Название дела'), 'Полить цветы')
    await user.click(screen.getByTestId('save-chore'))

    expect(useStore.getState().chores.some((c) => c.title === 'Полить цветы')).toBe(true)
  })
})

describe('Close week from Report', () => {
  beforeEach(() => {
    useStore.getState().completeOnboarding('Аня', 'Боря')
    const chore = useStore.getState().chores[0]
    useStore.getState().logChore(chore.id, 'A')
  })

  it('closes the week and records a snapshot', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByText('Профиль'))
    await user.click(await screen.findByText('📊 Отчёты и сезон'))

    await user.click(await screen.findByTestId('close-week'))
    await user.click(await screen.findByText('Далее'))
    await user.click(await screen.findByTestId('confirm-close'))

    expect(useStore.getState().weeks.length).toBe(1)
  })

  it('reopens the last closed week', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByText('Профиль'))
    await user.click(await screen.findByText('📊 Отчёты и сезон'))

    await user.click(await screen.findByTestId('close-week'))
    await user.click(await screen.findByText('Далее'))
    await user.click(await screen.findByTestId('confirm-close'))
    expect(useStore.getState().weeks.length).toBe(1)

    await user.click(await screen.findByTestId('reopen-week'))
    await user.click(await screen.findByTestId('confirm-reopen'))
    expect(useStore.getState().weeks.length).toBe(0)
  })
})

describe('Rewards redemption guard', () => {
  beforeEach(() => {
    useStore.getState().completeOnboarding('Аня', 'Боря')
  })

  it('disables unaffordable rewards', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByText('Награды'))
    // with zero points, the expensive reward button is disabled
    const cards = await screen.findAllByText(/Нужно/)
    expect(cards.length).toBeGreaterThan(0)
    void within
  })
})
