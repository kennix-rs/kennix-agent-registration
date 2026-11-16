import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('agent registration', () => {
  it('verifies the email with a code, then registers the agent', async () => {
    const user = userEvent.setup()
    render(<App/>)
    await user.type(screen.getByLabelText(/Email address/), 'aman@northfield.example.com')
    await user.click(screen.getByRole('button', { name: /Send code/ }))
    const code = (await screen.findByText(/here is the code/)).querySelector('strong.font-mono')!.textContent!
    await user.type(screen.getByLabelText(/6-digit code/), code)
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }))

    expect(await screen.findByRole('heading', { name: 'Your details' })).toBeInTheDocument()
    // The details page is the form alone: logo on top, guidelines at the bottom, no side panel.
    expect(screen.getByRole('img', { name: 'KENNIX Real Estate' })).toBeInTheDocument()
    expect(screen.queryByText(/Bring us land/)).not.toBeInTheDocument()
    const guidelines = screen.getByRole('region', { name: /Guidelines for Channel Partners/ })
    expect(guidelines).toHaveTextContent(/registers the property details first/)
    expect(guidelines).toHaveTextContent(/must accompany the KENNIX Land Sourcing team/)
    await user.click(screen.getByRole('button', { name: /Join the KENNIX agent network/ }))
    expect(await screen.findByText('Please fix the 10 highlighted fields.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Agent name/), 'Aman Khurana')
    await user.type(screen.getByLabelText(/Agency name/), 'Northfield Realty')
    await user.type(screen.getByLabelText(/^Mobile no/), '9815012001')
    await user.type(screen.getByLabelText(/^Address/), 'SCO 12, Sector 82')
    await user.type(screen.getByLabelText(/^Location/), 'Aerocity')
    await user.type(screen.getByLabelText(/^City/), 'Mohali')
    await user.selectOptions(screen.getByLabelText(/^State/), 'Punjab')
    await user.type(screen.getByLabelText(/^Pincode/), '160055')
    await user.type(screen.getByLabelText(/Primary work area/), 'Aerocity')
    await user.type(screen.getByLabelText(/^Other areas/), 'Kharar{Enter}')
    await user.click(screen.getByLabelText('Open Plots'))
    await user.type(screen.getByLabelText(/Brokerage %/), '1.5')
    await user.selectOptions(screen.getByLabelText(/KENNIX manager name/), 'Vikram Bedi')
    await user.click(screen.getByRole('button', { name: /Join the KENNIX agent network/ }))

    expect(await screen.findByText('You’re in the KENNIX agent network')).toBeInTheDocument()
    expect(screen.getByText('AG-1001')).toBeInTheDocument()
    expect(screen.getByText('Aerocity, Kharar')).toBeInTheDocument()
    expect(screen.getByText('Open Plots')).toBeInTheDocument()
  })

  it('explains a wrong code', async () => {
    const user = userEvent.setup()
    render(<App/>)
    await user.type(screen.getByLabelText(/Email address/), 'a@b.co')
    await user.click(screen.getByRole('button', { name: /Send code/ }))
    const code = (await screen.findByText(/here is the code/)).querySelector('strong.font-mono')!.textContent!
    await user.type(screen.getByLabelText(/6-digit code/), code === '123456' ? '654321' : '123456')
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }))
    expect(await screen.findByText(/That code is not right\. 4 tries left\./)).toBeInTheDocument()
  })
})
