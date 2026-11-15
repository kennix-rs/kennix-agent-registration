import { beforeEach, describe, expect, it } from 'vitest'
import { agentSchema, emptyAgentForm, normaliseMobile, type AgentForm } from '../lib/schema'
import { LocalRegistrationService, MAX_TRIES, OTP_TTL_MS, RESEND_AFTER_MS, SEND_WINDOW_MS, SESSION_TTL_MS } from '../services/registrationService'

const validForm: AgentForm = {
  ...emptyAgentForm,
  agentName: 'Aman Khurana', agencyName: 'Northfield Realty', mobile: '+91 98150 12001', alternateMobile: '',
  address: 'SCO 12, Sector 82', location: 'Aerocity', city: 'Mohali', state: 'Punjab', pincode: '160055',
  primaryWorkArea: 'Aerocity', otherAreas: ['Kharar'], landTypes: ['Open Plots', 'Commercial Lands'], brokeragePercent: '1.5',
}

let now = Date.UTC(2026, 10, 16, 5, 0)
const service = new LocalRegistrationService(() => now)
const signIn = async (email = 'aman@northfield.example.com') => {
  const challenge = await service.requestOtp(email)
  return service.verifyOtp(email, challenge.previewCode!)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  now = Date.UTC(2026, 10, 16, 5, 0)
})

describe('form rules', () => {
  it('accepts a complete form and requires every bold field', () => {
    expect(agentSchema.safeParse(validForm).success).toBe(true)
    const result = agentSchema.safeParse(emptyAgentForm)
    expect(result.success).toBe(false)
    const fields = new Set(result.error!.issues.map(issue => issue.path[0]))
    expect(fields).toEqual(new Set(['agentName', 'agencyName', 'mobile', 'address', 'location', 'city', 'state', 'pincode', 'primaryWorkArea', 'brokeragePercent']))
  })

  it('normalises Indian mobile numbers and rejects others', () => {
    expect(normaliseMobile('+91 98150 12001')).toBe('9815012001')
    expect(normaliseMobile('09815012001')).toBe('9815012001')
    expect(normaliseMobile('12345 67890')).toBeNull()
    expect(normaliseMobile('98150')).toBeNull()
  })

  it('checks pincode and brokerage ranges', () => {
    expect(agentSchema.safeParse({ ...validForm, pincode: '060055' }).success).toBe(false)
    expect(agentSchema.safeParse({ ...validForm, brokeragePercent: '0' }).success).toBe(false)
    expect(agentSchema.safeParse({ ...validForm, brokeragePercent: '12' }).success).toBe(false)
    expect(agentSchema.safeParse({ ...validForm, brokeragePercent: '2.25' }).success).toBe(true)
  })
})

describe('email OTP', () => {
  it('signs in with the right code, case-insensitively', async () => {
    const challenge = await service.requestOtp('  Aman@Northfield.example.com ')
    expect(challenge.email).toBe('aman@northfield.example.com')
    expect(challenge.previewCode).toMatch(/^\d{6}$/)
    const session = await service.verifyOtp(challenge.email, challenge.previewCode!)
    expect(service.currentSession()).toEqual(session)
  })

  it('counts wrong tries and voids the code after the limit', async () => {
    const challenge = await service.requestOtp('a@b.co')
    const wrong = challenge.previewCode === '000000' ? '111111' : '000000'
    await expect(service.verifyOtp('a@b.co', wrong)).rejects.toThrow(`${MAX_TRIES - 1} tries left`)
    for (let i = 1; i < MAX_TRIES; i += 1) await service.verifyOtp('a@b.co', wrong).catch(() => undefined)
    await expect(service.verifyOtp('a@b.co', challenge.previewCode!)).rejects.toThrow('Too many wrong tries')
  })

  it('expires codes, limits resends and caps codes per window', async () => {
    const first = await service.requestOtp('a@b.co')
    await expect(service.requestOtp('a@b.co')).rejects.toThrow('Wait 30 seconds')
    now += RESEND_AFTER_MS
    await service.requestOtp('a@b.co')
    now += RESEND_AFTER_MS
    const third = await service.requestOtp('a@b.co')
    now += RESEND_AFTER_MS
    await expect(service.requestOtp('a@b.co')).rejects.toThrow('Too many codes')
    await expect(service.verifyOtp('a@b.co', first.previewCode!)).rejects.toThrow()
    now += OTP_TTL_MS
    await expect(service.verifyOtp('a@b.co', third.previewCode!)).rejects.toThrow('expired')
    now += SEND_WINDOW_MS
    await expect(service.requestOtp('a@b.co')).resolves.toBeTruthy()
  })

  it('keeps the verified email for 30 minutes', async () => {
    await signIn()
    now += SESSION_TTL_MS + 1
    expect(service.currentSession()).toBeNull()
    await expect(service.submit(validForm)).rejects.toThrow('verification has expired')
  })
})

describe('submission', () => {
  it('adds the agent to the pool as Active with the verified email', async () => {
    await signIn()
    const agent = await service.submit(validForm)
    expect(agent).toMatchObject({
      id: 'AG-1001', email: 'aman@northfield.example.com', mobile: '9815012001', status: 'Active', source: 'Self-registration',
      landTypes: ['Open Plots', 'Commercial Lands'], brokeragePercent: 1.5, state: 'Punjab',
    })
    expect(service.listAgents()).toHaveLength(1)
    expect(service.currentSession()).toBeNull()
  })

  it('refuses a second agent with the same email or mobile', async () => {
    await signIn()
    await service.submit(validForm)
    await signIn()
    await expect(service.submit({ ...validForm, mobile: '9815012999' })).rejects.toThrow('already registered with this email')
    await signIn('other@agency.example.com')
    await expect(service.submit(validForm)).rejects.toThrow('already registered with this mobile')
  })

  it('drops submissions that fill the hidden honeypot field', async () => {
    await signIn()
    await expect(service.submit({ ...validForm, website: 'http://spam.example' })).rejects.toThrow()
    expect(service.listAgents()).toHaveLength(0)
  })
})
