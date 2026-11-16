import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ScrollText, Send, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { agentSchema, emptyAgentForm, KENNIX_MANAGERS, LAND_TYPES, STATES, type AgentForm } from '../lib/schema'
import { RegistrationError, registrationService, type RegisteredAgent, type Session } from '../services/registrationService'
import { Alert, Button, Field } from './ui'

export const GUIDELINES = [
  'Whoever registers the property details first in the KENNIX portal is the Channel Partner (CP) KENNIX proceeds with, unless the manager approves a change for a specific reason.',
  'To claim the commission, the Channel Partner must accompany the KENNIX Land Sourcing team to the property.',
]

export function AgentFormStep({ session, onDone, onExpired }: { session: Session; onDone: (agent: RegisteredAgent) => void; onExpired: () => void }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, submitCount } } = useForm<AgentForm>({
    resolver: zodResolver(agentSchema), defaultValues: emptyAgentForm, mode: 'onTouched',
  })
  const [area, setArea] = useState('')
  const [error, setError] = useState('')
  const otherAreas = watch('otherAreas')

  const addArea = () => {
    const value = area.trim()
    if (value && !otherAreas.some(item => item.toLowerCase() === value.toLowerCase())) setValue('otherAreas', [...otherAreas, value], { shouldValidate: true })
    setArea('')
  }
  const onAreaKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addArea() }
  }
  const submit = async (form: AgentForm) => {
    setError('')
    try {
      onDone(await registrationService.submit(form))
    } catch (failure) {
      if (failure instanceof RegistrationError && failure.code === 'session_expired') { onExpired(); return }
      setError(failure instanceof RegistrationError ? failure.message : 'Could not submit the form. Try again.')
    }
  }
  const err = (name: keyof AgentForm) => errors[name]?.message as string | undefined
  const invalid = (name: keyof AgentForm) => (errors[name] ? true : undefined)
  const errorCount = Object.keys(errors).length

  return <form onSubmit={handleSubmit(submit)} className="space-y-7" noValidate>
    <div>
      <h2 className="text-xl font-bold text-slate-950">Your details</h2>
      <p className="mt-1 text-sm text-slate-600">Fields marked <b className="text-red-600">*</b> are required. Verified email: <strong className="text-slate-900">{session.email}</strong></p>
    </div>

    <fieldset className="space-y-4">
      <legend className="section-label mb-3">Agent and agency</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agent name" required error={err('agentName')} htmlFor="agentName"><input id="agentName" autoComplete="name" aria-invalid={invalid('agentName')} {...register('agentName')}/></Field>
        <Field label="Agency name" required error={err('agencyName')} htmlFor="agencyName"><input id="agencyName" autoComplete="organization" aria-invalid={invalid('agencyName')} {...register('agencyName')}/></Field>
        <Field label="Mobile no" required error={err('mobile')} htmlFor="mobile"><input id="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={invalid('mobile')} {...register('mobile')}/></Field>
        <Field label="Alternate / WhatsApp no" error={err('alternateMobile')} htmlFor="alternateMobile"><input id="alternateMobile" type="tel" inputMode="tel" aria-invalid={invalid('alternateMobile')} {...register('alternateMobile')}/></Field>
        <Field label="Email id" hint="Verified with the code" htmlFor="emailShown"><input id="emailShown" value={session.email} readOnly className="!bg-slate-50 !text-slate-600"/></Field>
      </div>
    </fieldset>

    <fieldset className="space-y-4">
      <legend className="section-label mb-3">Address</legend>
      <Field label="Address" required error={err('address')} htmlFor="address"><textarea id="address" autoComplete="street-address" aria-invalid={invalid('address')} {...register('address')}/></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" required error={err('location')} hint="Locality, e.g. Aerocity" htmlFor="location"><input id="location" aria-invalid={invalid('location')} {...register('location')}/></Field>
        <Field label="City" required error={err('city')} htmlFor="city"><input id="city" autoComplete="address-level2" aria-invalid={invalid('city')} {...register('city')}/></Field>
        <Field label="State" required error={err('state')} htmlFor="state"><select id="state" aria-invalid={invalid('state')} {...register('state')}><option value="">Choose state…</option>{STATES.map(state => <option key={state}>{state}</option>)}</select></Field>
        <Field label="Pincode" required error={err('pincode')} htmlFor="pincode"><input id="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} aria-invalid={invalid('pincode')} {...register('pincode')}/></Field>
      </div>
    </fieldset>

    <fieldset className="space-y-4">
      <legend className="section-label mb-3">Where and what you deal in</legend>
      <Field label="Primary work area" required error={err('primaryWorkArea')} hint="The area you know best, e.g. New Chandigarh" htmlFor="primaryWorkArea"><input id="primaryWorkArea" aria-invalid={invalid('primaryWorkArea')} {...register('primaryWorkArea')}/></Field>
      <Field label="Other areas" error={err('otherAreas')} hint="Press Enter or Add after each area" htmlFor="otherArea">
        <div className="flex gap-2"><input id="otherArea" value={area} onChange={event => setArea(event.target.value)} onKeyDown={onAreaKey} placeholder="e.g. Kharar"/><Button type="button" variant="secondary" onClick={addArea} aria-label="Add area"><Plus size={16}/>Add</Button></div>
        {otherAreas.length > 0 && <ul className="mt-1 flex flex-wrap gap-2" aria-label="Other areas">{otherAreas.map(item => <li key={item} className="chip">{item}<button type="button" onClick={() => setValue('otherAreas', otherAreas.filter(value => value !== item))} aria-label={`Remove ${item}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-teal-100"><X size={12}/></button></li>)}</ul>}
      </Field>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-slate-700">Land type</legend>
        <div className="grid gap-2 sm:grid-cols-2">{LAND_TYPES.map(type => <label key={type} className="choice"><input type="checkbox" value={type} {...register('landTypes')}/>{type}</label>)}</div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brokerage %" required error={err('brokeragePercent')} hint="Your usual commission, e.g. 1 or 1.5" htmlFor="brokeragePercent"><input id="brokeragePercent" inputMode="decimal" aria-invalid={invalid('brokeragePercent')} {...register('brokeragePercent')}/></Field>
        <Field label="KENNIX manager name" hint="The KENNIX person you work with, if any" htmlFor="kennixManager"><select id="kennixManager" {...register('kennixManager')}><option value="">Not sure / none yet</option>{KENNIX_MANAGERS.map(name => <option key={name}>{name}</option>)}</select></Field>
      </div>
    </fieldset>

    {/* Honeypot: invisible to people, tempting to bots. */}
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register('website')}/></label></div>

    <section aria-labelledby="guidelines" className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <h3 id="guidelines" className="flex items-center gap-2 text-sm font-bold text-amber-900"><ScrollText size={16}/> Guidelines for Channel Partners</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-amber-950">
        {GUIDELINES.map(text => <li key={text}>{text}</li>)}
      </ol>
    </section>

    {submitCount > 0 && errorCount > 0 && <Alert>Please fix the {errorCount} highlighted {errorCount === 1 ? 'field' : 'fields'}.</Alert>}
    {error && <Alert>{error}</Alert>}
    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : <><Send size={16}/> Join the KENNIX agent network</>}</Button>
  </form>
}
