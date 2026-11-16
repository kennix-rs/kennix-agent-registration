import { BadgeCheck, CheckCircle2, Handshake, MapPinned, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AgentFormStep } from './components/AgentFormStep'
import { EmailStep } from './components/EmailStep'
import { Alert, Button } from './components/ui'
import { cn } from './lib/utils'
import { registrationService, type RegisteredAgent, type Session } from './services/registrationService'

type Step = 'email' | 'details' | 'done'

const GUIDELINES = [
  'Whoever registers the property details first in the KENNIX portal is the Channel Partner (CP) KENNIX proceeds with, unless the manager approves a change for a specific reason.',
  'To claim the commission, the Channel Partner must accompany the KENNIX Land Sourcing team to the property.',
]


export default function App() {
  const [session, setSession] = useState<Session | null>(() => registrationService.currentSession())
  const [agent, setAgent] = useState<RegisteredAgent | null>(null)
  const [expired, setExpired] = useState(false)
  const step: Step = agent ? 'done' : session ? 'details' : 'email'

  const steps = <ol className="mb-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Registration steps">
    <StepLabel number={1} label="Verify email" state={step === 'email' ? 'active' : 'done'}/>
    <StepLabel number={2} label="Your details" state={step === 'details' ? 'active' : step === 'done' ? 'done' : 'todo'}/>
    <StepLabel number={3} label="Done" state={step === 'done' ? 'active' : 'todo'}/>
  </ol>
  const privacy = <p className="mt-4 text-center text-xs text-slate-500">Your details are used only by the KENNIX Land Sourcing team to contact you about land requirements.</p>

  // After the email is verified, the form gets the whole page: logo on top, no side panel.
  if (step !== 'email') return <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
    <header className="mx-auto mb-8 flex w-full max-w-4xl justify-center border-b border-slate-200 pb-6">
      <img src="/kennix-logo.png" alt="KENNIX Real Estate" className="h-20 w-auto sm:h-28"/>
    </header>
    <main className="mx-auto w-full max-w-4xl">
      {steps}
      <div className="card p-5 sm:p-8">
        {step === 'details' && session && <AgentFormStep session={session} onDone={setAgent} onExpired={() => { setSession(null); setExpired(true) }}/>}
        {step === 'done' && agent && <Done agent={agent} onAgain={() => { setAgent(null); setSession(null) }}/>}
      </div>
      {step === 'details' && <section aria-labelledby="guidelines" className="mt-8 px-1 text-sm leading-6 text-slate-700">
        <h2 id="guidelines" className="font-semibold text-slate-900">Guidelines:</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-6">
          {GUIDELINES.map(text => <li key={text}>{text}</li>)}
        </ol>
      </section>}
      {privacy}
    </main>
  </div>

  return <div className="min-h-screen lg:grid lg:grid-cols-[.85fr_1.15fr]">
    <aside className="relative hidden overflow-hidden bg-[#10243e] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-36 top-24 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl"/>
      <div className="relative flex items-center gap-3"><span className="brand-mark">K</span><div><strong className="block tracking-[.2em]">KENNIX</strong><span className="text-xs text-slate-400">Real Estate</span></div></div>
      <div className="relative max-w-md">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-300">Agent network</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">Bring us land.<br/><span className="text-teal-300">We bring the buyers.</span></h1>
        <p className="mt-5 text-base leading-7 text-slate-300">KENNIX sources plots and land for families and communities who build with us. Register once and our Land Sourcing team will contact you when a requirement matches your area.</p>
        <ul className="mt-9 space-y-4 text-sm">
          <Benefit icon={<MapPinned size={18}/>} text="Requirements matched to your work areas"/>
          <Benefit icon={<Handshake size={18}/>} text="Your brokerage agreed upfront"/>
          <Benefit icon={<ShieldCheck size={18}/>} text="Email-verified sign-up, no password to remember"/>
        </ul>
      </div>
      <p className="relative text-xs text-slate-500">KENNIX Real Estate · Land Sourcing</p>
    </aside>

    <main className="flex min-h-screen flex-col items-center px-4 py-6 sm:px-8 sm:py-10">
      <div className="mb-6 flex w-full max-w-2xl justify-center lg:hidden"><img src="/kennix-logo.png" alt="KENNIX Real Estate" className="h-14 w-auto"/></div>
      <div className="w-full max-w-2xl">
        {steps}
        <div className="card p-5 sm:p-8">
          <div className="space-y-5">
            {expired && <Alert tone="info">Your verification expired after 30 minutes. Verify your email again to continue.</Alert>}
            <EmailStep onVerified={next => { setExpired(false); setSession(next) }}/>
          </div>
        </div>
        {privacy}
      </div>
    </main>
  </div>
}

function Done({ agent, onAgain }: { agent: RegisteredAgent; onAgain: () => void }) {
  return <div className="text-center">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><CheckCircle2 size={30}/></span>
    <h2 className="mt-5 text-2xl font-bold text-slate-950">You’re in the KENNIX agent network</h2>
    <p className="mt-2 text-sm text-slate-600">Thank you, {agent.agentName}. Our Land Sourcing team will contact you when a requirement matches {agent.primaryWorkArea}.</p>
    <dl className="mx-auto mt-6 grid max-w-md gap-3 rounded-xl bg-slate-50 p-4 text-left text-sm">
      <Row label="Agent ID" value={agent.id}/>
      <Row label="Agency" value={agent.agencyName}/>
      <Row label="Areas" value={[agent.primaryWorkArea, ...agent.otherAreas].join(', ')}/>
      <Row label="Land types" value={agent.landTypes.join(', ') || 'Not specified'}/>
      <Row label="Brokerage" value={`${agent.brokeragePercent}%`}/>
    </dl>
    <Button variant="secondary" className="mt-6" onClick={onAgain}><BadgeCheck size={16}/> Register another agent</Button>
  </div>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-800">{value}</dd></div>
}

function Benefit({ icon, text }: { icon: ReactNode; text: string }) {
  return <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-teal-300">{icon}</span>{text}</li>
}

function StepLabel({ number, label, state }: { number: number; label: string; state: 'todo' | 'active' | 'done' }) {
  return <li className={cn('step', state)} aria-current={state === 'active' ? 'step' : undefined}><span>{state === 'done' ? '✓' : number}</span>{label}</li>
}
