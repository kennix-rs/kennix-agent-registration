import { ArrowRight, MailCheck, RotateCcw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { RegistrationError, registrationService, type OtpChallenge, type Session } from '../services/registrationService'
import { Alert, Button, Field } from './ui'

const message = (error: unknown) => (error instanceof RegistrationError ? error.message : 'Something went wrong. Try again.')

/** Passwordless sign-in: a 6-digit code to the agent's email proves it's theirs and keeps bots out. */
export function EmailStep({ onVerified }: { onVerified: (session: Session) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!challenge) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [challenge])

  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    setBusy(true)
    setError('')
    try {
      setChallenge(await registrationService.requestOtp(email))
      setCode('')
      setNow(Date.now())
    } catch (failure) {
      setError(message(failure))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!challenge) return
    setBusy(true)
    setError('')
    try {
      onVerified(await registrationService.verifyOtp(challenge.email, code))
    } catch (failure) {
      setError(message(failure))
    } finally {
      setBusy(false)
    }
  }

  if (!challenge) return <form onSubmit={send} className="space-y-5" noValidate>
    <div>
      <h2 className="text-xl font-bold text-slate-950">Verify your email</h2>
      <p className="mt-1 text-sm text-slate-600">We’ll send a 6-digit code. No password needed.</p>
    </div>
    <Field label="Email address" required htmlFor="email">
      <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@agency.com" autoFocus/>
    </Field>
    {error && <Alert>{error}</Alert>}
    <Button type="submit" className="w-full" disabled={busy || !email.trim()}>{busy ? 'Sending…' : <>Send code <ArrowRight size={16}/></>}</Button>
  </form>

  const secondsToResend = Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
  const minutesLeft = Math.max(0, Math.ceil((challenge.expiresAt - now) / 60_000))
  return <form onSubmit={verify} className="space-y-5" noValidate>
    <div>
      <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><MailCheck size={22}/></span>
      <h2 className="text-xl font-bold text-slate-950">Enter the code</h2>
      <p className="mt-1 text-sm text-slate-600">Sent to <strong className="text-slate-900">{challenge.email}</strong>. It expires in {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}.</p>
    </div>
    {challenge.previewCode && <Alert tone="preview"><strong>Preview:</strong> emails aren’t sent yet, so here is the code: <strong className="font-mono tracking-widest">{challenge.previewCode}</strong></Alert>}
    <Field label="6-digit code" required htmlFor="code">
      <input id="code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus/>
    </Field>
    {error && <Alert>{error}</Alert>}
    <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify and continue'}</Button>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <Button type="button" variant="link" onClick={() => { setChallenge(null); setError('') }}>Use a different email</Button>
      <Button type="button" variant="link" disabled={busy || secondsToResend > 0} onClick={() => send()}>
        <RotateCcw size={14}/>{secondsToResend > 0 ? `Resend in ${secondsToResend}s` : 'Resend code'}
      </Button>
    </div>
  </form>
}
