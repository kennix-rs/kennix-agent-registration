import { z } from 'zod'

/** Shared with the Land Sourcing Agent Pool (replaces Plots / Lands / Houses, decided 2026-11-15). */
export const LAND_TYPES = ['Open Plots', 'Commercial Plots', 'Independent Houses', 'Commercial Lands'] as const
export type LandType = typeof LAND_TYPES[number]

/** KENNIX relationship managers: the Land Sourcing team (preview names, as in the Land Sourcing portal). */
export const KENNIX_MANAGERS = ['Neha Sharma', 'Vikram Bedi', 'Meera Kapoor'] as const

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const

/** Indian mobile number: optional +91 / 0 prefix, then 10 digits starting 6–9. Returns the 10 digits or null. */
export function normaliseMobile(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

const required = (label: string) => z.string().trim().min(1, `${label} is required`)
const mobile = (label: string) => required(label).refine(value => normaliseMobile(value) !== null, 'Enter a 10-digit Indian mobile number')

/** The agent form. Fields marked mandatory (bold) in the requirement sheet are required here. */
export const agentSchema = z.object({
  agentName: required('Agent name').max(80, 'Keep it under 80 characters'),
  agencyName: required('Agency name').max(120, 'Keep it under 120 characters'),
  mobile: mobile('Mobile number'),
  alternateMobile: z.string().trim().refine(value => !value || normaliseMobile(value) !== null, 'Enter a 10-digit Indian mobile number'),
  address: required('Address').min(5, 'Add the full address'),
  location: required('Location'),
  city: required('City'),
  state: z.enum(STATES, { error: 'Choose the state' }),
  pincode: required('Pincode').regex(/^[1-9]\d{5}$/, 'Enter a 6-digit pincode'),
  primaryWorkArea: required('Primary work area'),
  otherAreas: z.array(z.string().trim().min(1)).max(15, 'Up to 15 other areas'),
  landTypes: z.array(z.enum(LAND_TYPES)),
  brokeragePercent: required('Brokerage %')
    .refine(value => /^\d{1,2}(\.\d{1,2})?$/.test(value), 'Enter a percentage like 1 or 1.5')
    .refine(value => Number(value) > 0 && Number(value) <= 10, 'Brokerage must be more than 0% and at most 10%'),
  kennixManager: z.union([z.literal(''), z.enum(KENNIX_MANAGERS)]),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(0),
})

export type AgentForm = z.input<typeof agentSchema>

export const emptyAgentForm: AgentForm = {
  agentName: '', agencyName: '', mobile: '', alternateMobile: '', address: '', location: '', city: '',
  state: '' as AgentForm['state'], pincode: '', primaryWorkArea: '', otherAreas: [], landTypes: [], brokeragePercent: '',
  kennixManager: '', website: '',
}
