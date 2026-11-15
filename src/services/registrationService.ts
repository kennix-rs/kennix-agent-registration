/**
 * Email OTP sign-in and agent submission. This preview keeps everything in the browser and shows
 * the code on screen instead of emailing it; an API-backed service with the same methods will send
 * real emails (kennix-backend, AWS SES) and write to the Land Sourcing Agent Pool.
 *
 * The anti-spam limits are the ones the backend will enforce: a code expires after 10 minutes,
 * a new one can be sent after 30 seconds, at most 3 codes per email in 15 minutes, and 5 wrong
 * tries void a code. A verified email stays signed in for 30 minutes, long enough to fill the form.
 */
import { agentSchema, emailSchema, normaliseMobile, type AgentForm, type LandType } from '../lib/schema'

export const OTP_TTL_MS = 10 * 60_000
export const RESEND_AFTER_MS = 30_000
export const SEND_WINDOW_MS = 15 * 60_000
export const MAX_SENDS = 3
export const MAX_TRIES = 5
export const SESSION_TTL_MS = 30 * 60_000

const OTP_KEY = 'kennix.agent-registration.otp.v1'
const SESSION_KEY = 'kennix.agent-registration.session.v1'
const AGENTS_KEY = 'kennix.agent-registration.agents.v1'

export class RegistrationError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

export interface OtpChallenge { email: string; expiresAt: number; resendAt: number; previewCode?: string }
export interface Session { email: string; verifiedAt: number; expiresAt: number }

export interface RegisteredAgent {
  id: string
  agentName: string
  agencyName: string
  mobile: string
  alternateMobile: string
  email: string
  address: string
  location: string
  city: string
  state: string
  pincode: string
  primaryWorkArea: string
  otherAreas: string[]
  landTypes: LandType[]
  brokeragePercent: number
  kennixManager: string
  /** Self-registered agents join the pool as Active (decided 2026-11-15); KENNIX can deactivate them. */
  status: 'Active' | 'Inactive'
  source: 'Self-registration'
  emailVerifiedAt: string
  submittedAt: string
}

interface OtpRecord { code: string; expiresAt: number; tries: number; sentAt: number[] }

function read<T>(storage: Storage, key: string, fallback: T): T {
  try { return (JSON.parse(storage.getItem(key) || 'null') as T | null) ?? fallback } catch { return fallback }
}

function randomCode() {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return String(value[0] % 1_000_000).padStart(6, '0')
}

export class LocalRegistrationService {
  private readonly clock: () => number
  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock
  }

  async requestOtp(rawEmail: string): Promise<OtpChallenge> {
    const parsed = emailSchema.safeParse(rawEmail)
    if (!parsed.success) throw new RegistrationError('Enter a valid email address', 'invalid_email')
    const email = parsed.data
    const now = this.clock()
    const all = read<Record<string, OtpRecord>>(localStorage, OTP_KEY, {})
    const previous = all[email]
    const recent = (previous?.sentAt ?? []).filter(at => now - at < SEND_WINDOW_MS)
    if (recent.length && now - recent[recent.length - 1] < RESEND_AFTER_MS) {
      const wait = Math.ceil((RESEND_AFTER_MS - (now - recent[recent.length - 1])) / 1000)
      throw new RegistrationError(`Wait ${wait} seconds before asking for a new code`, 'too_soon')
    }
    if (recent.length >= MAX_SENDS) throw new RegistrationError('Too many codes requested for this email. Try again in 15 minutes.', 'rate_limited')
    const code = randomCode()
    all[email] = { code, expiresAt: now + OTP_TTL_MS, tries: 0, sentAt: [...recent, now] }
    localStorage.setItem(OTP_KEY, JSON.stringify(all))
    return { email, expiresAt: now + OTP_TTL_MS, resendAt: now + RESEND_AFTER_MS, previewCode: code }
  }

  async verifyOtp(rawEmail: string, rawCode: string): Promise<Session> {
    const email = rawEmail.trim().toLowerCase()
    const code = rawCode.replace(/\D/g, '')
    const now = this.clock()
    const all = read<Record<string, OtpRecord>>(localStorage, OTP_KEY, {})
    const record = all[email]
    if (!record || record.expiresAt < now) throw new RegistrationError('This code has expired. Ask for a new one.', 'expired')
    if (record.tries >= MAX_TRIES) throw new RegistrationError('Too many wrong tries. Ask for a new code.', 'locked')
    if (code !== record.code) {
      record.tries += 1
      localStorage.setItem(OTP_KEY, JSON.stringify(all))
      const left = MAX_TRIES - record.tries
      throw new RegistrationError(left ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Ask for a new code.', left ? 'wrong_code' : 'locked')
    }
    delete all[email]
    localStorage.setItem(OTP_KEY, JSON.stringify(all))
    const session: Session = { email, verifiedAt: now, expiresAt: now + SESSION_TTL_MS }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  currentSession(): Session | null {
    const session = read<Session | null>(sessionStorage, SESSION_KEY, null)
    return session && session.expiresAt > this.clock() ? session : null
  }

  signOut() { sessionStorage.removeItem(SESSION_KEY) }

  listAgents(): RegisteredAgent[] { return read<RegisteredAgent[]>(localStorage, AGENTS_KEY, []) }

  async submit(form: AgentForm): Promise<RegisteredAgent> {
    const session = this.currentSession()
    if (!session) throw new RegistrationError('Your verification has expired. Verify your email again.', 'session_expired')
    const parsed = agentSchema.safeParse(form)
    if (!parsed.success) throw new RegistrationError(parsed.error.issues[0]?.message ?? 'Check the form', 'invalid')
    const data = parsed.data
    if (data.website) throw new RegistrationError('Could not submit the form', 'rejected')
    const agents = this.listAgents()
    const mobile = normaliseMobile(data.mobile)!
    if (agents.some(agent => agent.email === session.email)) throw new RegistrationError('An agent is already registered with this email', 'duplicate_email')
    if (agents.some(agent => agent.mobile === mobile)) throw new RegistrationError('An agent is already registered with this mobile number', 'duplicate_mobile')
    const agent: RegisteredAgent = {
      id: `AG-${String(1001 + agents.length).padStart(4, '0')}`,
      agentName: data.agentName, agencyName: data.agencyName, mobile,
      alternateMobile: data.alternateMobile ? normaliseMobile(data.alternateMobile)! : '', email: session.email,
      address: data.address, location: data.location, city: data.city, state: data.state, pincode: data.pincode,
      primaryWorkArea: data.primaryWorkArea, otherAreas: [...new Set(data.otherAreas)], landTypes: data.landTypes,
      brokeragePercent: Number(data.brokeragePercent), kennixManager: data.kennixManager,
      status: 'Active', source: 'Self-registration',
      emailVerifiedAt: new Date(session.verifiedAt).toISOString(), submittedAt: new Date(this.clock()).toISOString(),
    }
    localStorage.setItem(AGENTS_KEY, JSON.stringify([...agents, agent]))
    this.signOut()
    return agent
  }
}

export const registrationService = new LocalRegistrationService()
