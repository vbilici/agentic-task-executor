import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskItem } from './TaskItem'
import type { Task } from '@/types/api'

// Helper to create mock tasks with default values
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    sessionId: 'session-1',
    title: 'Test Task',
    description: null,
    status: 'pending',
    result: null,
    reflection: null,
    order: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TaskItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('card rendering', () => {
    it('renders task title in the card', () => {
      const task = createMockTask({ title: 'My Task Title' })
      render(<TaskItem task={task} />)

      expect(screen.getByText('My Task Title')).toBeInTheDocument()
    })

    it('renders task description when provided', () => {
      const task = createMockTask({ description: 'Task description text' })
      render(<TaskItem task={task} />)

      expect(screen.getByText('Task description text')).toBeInTheDocument()
    })

    it('does not render description when null', () => {
      const task = createMockTask({ description: null })
      render(<TaskItem task={task} />)

      // Only the title should be present
      expect(screen.getByText('Test Task')).toBeInTheDocument()
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument()
    })

    it('card is clickable with cursor-pointer class', () => {
      const task = createMockTask()
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('.cursor-pointer')
      expect(card).toBeInTheDocument()
    })
  })

  describe('status icons in card', () => {
    it('renders circle icon for pending status', () => {
      const task = createMockTask({ status: 'pending' })
      render(<TaskItem task={task} />)

      // The card should contain an SVG icon (Circle for pending)
      const card = screen.getByText('Test Task').closest('div[class*="p-3"]')
      expect(card).toBeInTheDocument()
      const svg = card?.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('text-muted-foreground')
    })

    it('renders spinning loader icon for in_progress status', () => {
      const task = createMockTask({ status: 'in_progress' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="p-3"]')
      const svg = card?.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('animate-spin')
      expect(svg).toHaveClass('text-blue-500')
    })

    it('renders check circle icon for done status', () => {
      const task = createMockTask({ status: 'done' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="p-3"]')
      const svg = card?.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('text-green-500')
    })

    it('renders x circle icon for failed status', () => {
      const task = createMockTask({ status: 'failed' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="p-3"]')
      const svg = card?.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('text-destructive')
    })
  })

  describe('dialog interaction', () => {
    it('opens dialog when card is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ title: 'Clickable Task' })
      render(<TaskItem task={task} />)

      // Dialog should not be visible initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Click the card
      const card = screen.getByText('Clickable Task').closest('div[class*="cursor-pointer"]')
      expect(card).toBeInTheDocument()
      await user.click(card!)

      // Dialog should now be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      render(<TaskItem task={task} />)

      // Open dialog
      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Find and click close button (the X button in dialog header)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes dialog when pressing Escape key', async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      render(<TaskItem task={task} />)

      // Open dialog
      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Press Escape
      await user.keyboard('{Escape}')

      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('dialog content', () => {
    it('displays task order number in dialog header', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ order: 2, title: 'Third Task' })
      render(<TaskItem task={task} />)

      // Open dialog
      const card = screen.getByText('Third Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      // Check for order number (order is 0-indexed, displayed as +1)
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('#3')).toBeInTheDocument()
    })

    it('displays task title in dialog header', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ title: 'Dialog Title Test' })
      render(<TaskItem task={task} />)

      // Open dialog
      const card = screen.getByText('Dialog Title Test').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      // Title should appear in the dialog header
      expect(within(dialog).getByText('Dialog Title Test')).toBeInTheDocument()
    })

    it('displays status badge for pending task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ status: 'pending' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Status:')).toBeInTheDocument()
      expect(within(dialog).getByText('Pending')).toBeInTheDocument()
    })

    it('displays status badge for in_progress task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ status: 'in_progress' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('In Progress')).toBeInTheDocument()
    })

    it('displays status badge for done task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ status: 'done' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Done')).toBeInTheDocument()
    })

    it('displays status badge for failed task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ status: 'failed' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Failed')).toBeInTheDocument()
    })

    it('displays description in dialog when provided', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ description: 'Detailed task description' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Description')).toBeInTheDocument()
      expect(within(dialog).getByText('Detailed task description')).toBeInTheDocument()
    })

    it('does not display description section when description is null', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ description: null })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).queryByText('Description')).not.toBeInTheDocument()
    })

    it('displays result for done task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        status: 'done',
        result: 'Task completed successfully with output data',
      })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Result')).toBeInTheDocument()
      expect(within(dialog).getByText('Task completed successfully with output data')).toBeInTheDocument()
    })

    it('displays error for failed task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        status: 'failed',
        result: 'Connection timeout error',
      })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Error')).toBeInTheDocument()
      expect(within(dialog).getByText('Connection timeout error')).toBeInTheDocument()
    })

    it('does not display result section for pending task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ status: 'pending', result: null })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).queryByText('Result')).not.toBeInTheDocument()
      expect(within(dialog).queryByText('Error')).not.toBeInTheDocument()
    })

    it('does not display result section for in_progress task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ status: 'in_progress', result: null })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).queryByText('Result')).not.toBeInTheDocument()
      expect(within(dialog).queryByText('Error')).not.toBeInTheDocument()
    })

    it('displays reflection when provided', async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        status: 'done',
        result: 'Task result',
        reflection: 'This task helped me understand the problem better',
      })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Reflection')).toBeInTheDocument()
      expect(within(dialog).getByText('This task helped me understand the problem better')).toBeInTheDocument()
    })

    it('does not display reflection section when reflection is null', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ reflection: null })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).queryByText('Reflection')).not.toBeInTheDocument()
    })
  })

  describe('card styling by status', () => {
    it('applies in_progress styling to card', () => {
      const task = createMockTask({ status: 'in_progress' })
      render(<TaskItem task={task} />)

      // The Card component with cursor-pointer has the border styling
      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      expect(card).toHaveClass('border-blue-200')
    })

    it('applies done styling to card', () => {
      const task = createMockTask({ status: 'done' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      expect(card).toHaveClass('border-green-200')
    })

    it('applies failed styling to card', () => {
      const task = createMockTask({ status: 'failed' })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Test Task').closest('div[class*="cursor-pointer"]')
      expect(card).toHaveClass('border-red-200')
    })
  })

  describe('complete task display', () => {
    it('displays all task details in dialog for a complete done task', async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        title: 'Complete Task',
        description: 'Full description here',
        status: 'done',
        result: 'Successfully completed',
        reflection: 'Learned a lot from this',
        order: 4,
      })
      render(<TaskItem task={task} />)

      const card = screen.getByText('Complete Task').closest('div[class*="cursor-pointer"]')
      await user.click(card!)

      const dialog = screen.getByRole('dialog')

      // Order number
      expect(within(dialog).getByText('#5')).toBeInTheDocument()
      // Title
      expect(within(dialog).getByText('Complete Task')).toBeInTheDocument()
      // Status badge
      expect(within(dialog).getByText('Done')).toBeInTheDocument()
      // Description
      expect(within(dialog).getByText('Full description here')).toBeInTheDocument()
      // Result
      expect(within(dialog).getByText('Successfully completed')).toBeInTheDocument()
      // Reflection
      expect(within(dialog).getByText('Learned a lot from this')).toBeInTheDocument()
    })
  })
})
