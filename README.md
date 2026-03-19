# Market Partners — Client Intake v2

A secure, multi-user investment program intake platform with:
- Per-user password login (client vs adviser roles)
- Client fills steps 1–3 (personal details, financials, investment profile)
- Adviser receives email with all client data + a magic link
- Adviser completes step 4 (proposal scope) and generates the Word doc

---

## Deploy to Vercel — Step by step

### 1. Create a GitHub repo and upload files

1. Go to https://github.com/new — create a **private** repo named `mp-intake`
2. On the new repo page click **"uploading an existing file"**
3. Unzip this file and drag ALL contents (package.json, src/, etc.) into GitHub
4. Confirm `package.json` is visible at the root (not inside a folder)
5. Commit changes

### 2. Set up Resend (free email service)

1. Go to https://resend.com and create a free account
2. Go to **API Keys** → Create API Key → copy it
3. (Optional) Add and verify your domain so emails come from your address

### 3. Deploy on Vercel

1. Go to https://vercel.com → sign up with GitHub
2. Click **Add New Project** → import your `mp-intake` repo
3. Before deploying, click **Environment Variables** and add ALL of these:

---

## Environment Variables (add in Vercel dashboard)

| Variable | Example value | Description |
|---|---|---|
| `JWT_SECRET` | `a-long-random-string-here` | Session encryption key — use any long random string |
| `USERS` | `alice:pass123,bob:securepass,james:adviser99` | Comma-separated username:password pairs |
| `ADVISER_USERS` | `james` | Which usernames get adviser access (comma-separated) |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | From your Resend account |
| `NEXT_PUBLIC_BASE_URL` | `https://mp-intake.vercel.app` | Your Vercel URL (set after first deploy, then redeploy) |

### Example setup for 3 clients + 1 adviser:

```
JWT_SECRET      = xK9mP2qR7vL4nT8wY3aB6cF1jH5eU0
USERS           = alice:clientpass1,bob:clientpass2,carol:clientpass3,james:adviserpass
ADVISER_USERS   = james
RESEND_API_KEY  = re_your_actual_key_here
NEXT_PUBLIC_BASE_URL = https://mp-intake.vercel.app
```

---

## How it works

### Client flow
1. Client visits your URL and logs in with their username + password
2. They fill in 3 steps: Client Details, Financial Position, Investment Profile
3. They click **Submit details**
4. An email fires to portfolio@marketpartners.com.au with a summary + magic link

### Adviser flow
1. Adviser receives the email
2. Clicks **Complete Proposal →** link
3. Logs in (if not already) — redirected to the adviser page with client data pre-loaded
4. Completes Step 4: Proposal Scope
5. Clicks **Generate Investment Program** — Word doc downloads instantly

---

## Adding or changing users

Edit the `USERS` environment variable in Vercel:
- Go to your Vercel project → Settings → Environment Variables
- Update `USERS` with new username:password pairs
- Click **Redeploy** (or push any change to GitHub)

No code changes needed.

## Changing the adviser email recipient

Search for `portfolio@marketpartners.com.au` in `src/pages/api/submit.ts` and update it.

## Changing default allocation ranges

Edit the `ADVISER_DEFAULTS` object in `src/lib/types.ts`.

## Changing fee structure

Search for `feeData` in `src/lib/docGenerator.ts`.

## Changing the logo

Replace `Market_partners_high_res_V2.jpg` with your new image, then run:
```bash
node scripts/update-logo.js
```
(Or come back to Claude to regenerate the logo.ts file.)

---

## Local development

```bash
npm install
# Create .env.local with your variables
npm run dev
```

Open http://localhost:3000
