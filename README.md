# KENNIX Agent Registration

A public, mobile-first form where real-estate agents join the KENNIX Land Sourcing **Agent Pool**. Agents sign in without a password: a 6-digit code to their email proves the address is theirs and keeps bots out. A submitted agent joins the pool as **Active**; KENNIX can deactivate them later in the Land Sourcing portal.

This is a **preview**: everything stays in the browser and the code is shown on screen instead of being emailed. `LocalRegistrationService` (`src/services/registrationService.ts`) is the seam an API-backed service will replace (kennix-backend endpoints, emails through AWS SES, writing to the Agent Pool).

## The form

Required fields (bold in the requirement sheet) are marked `*`.

| Field | Rules |
|---|---|
| **Agent name**, **Agency name** | required |
| **Mobile no** | required; Indian mobile, `+91`/`0` prefixes accepted, stored as 10 digits |
| Alternate / WhatsApp no | optional; same format |
| E-mail id | the verified email (set by the OTP step) |
| **Address**, **Location**, **City** | required |
| **State** | required; Indian states and union territories |
| **Pincode** | required; 6 digits |
| **Primary work area** | required |
| Other areas | optional; up to 15 |
| Land type | optional; any of Open Plots, Commercial Plots, Independent Houses, Commercial Lands |
| **Brokerage %** | required; more than 0 and at most 10, up to 2 decimals |
| KENNIX manager name | optional; the Land Sourcing team (relationship managers) |
| Agent status | not on the public form: new agents are Active |

## Anti-spam

- A code expires after **10 minutes**; a new one can be sent after **30 seconds**; at most **3 codes per email per 15 minutes**; **5 wrong tries** void a code.
- A verified email stays valid for **30 minutes** to fill the form, then the agent verifies again.
- One agent per email and per mobile number.
- A hidden honeypot field rejects bot submissions.

The backend will enforce the same limits (plus per-IP throttling) and store codes hashed.

## Run and check

```bash
npm install
npm run dev -- --port 5177
npm run lint && npm run typecheck && npm test && npm run build
```
