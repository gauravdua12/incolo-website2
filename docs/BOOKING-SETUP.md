# Scoping-call booking: setup

Visitors pick a free slot on the website calendar and fill in their details. The site then:

1. Creates the event in the **business@incolosystems.com Google Calendar**, with a **Google Meet** link. Google sends no email.
2. Emails a calendar invitation **from business@incolosystems.com** (your own mailbox, over SMTP) to the customer and every invitee set in `/admin` (default: business@ and theedivesh@gmail.com).
3. Records the booking in a file on the server; you can also see upcoming bookings in `/admin`.

Gmail, Outlook and Apple Mail show the email as a real invitation (Accept / Decline), and it appears in each person's calendar. Google users don't get a duplicate, because the invite and the Google event share the same ID.

Only **free** times in business@'s Google Calendar are offered. Anything you put in that calendar blocks the slot automatically.

Allow about 20 minutes, once. Steps 1–3 are in the browser, step 4 on your Mac, steps 5–6 on the server.

---

## 1. Create the Google account for business@incolosystems.com

Your mailbox stays where it is. This only gives the address a Google Calendar and Meet.

1. In a private browser window, go to **accounts.google.com/signup**.
2. Enter your name, then on the email step choose **"Use your existing email"** and enter `business@incolosystems.com`.
3. Google emails a code to that mailbox. Enter it and finish the sign-up.
4. Open **calendar.google.com** → ⚙ Settings → **Time zone** → choose **(GMT+05:30) India Standard Time**.

> Free Google accounts limit Meet calls with 3+ people to 60 minutes. That's fine for 30–45 minute calls; for longer calls you'd need Google Workspace.

## 2. Create the Google Cloud project and turn on Calendar

Stay signed in as **business@incolosystems.com**.

1. Go to **console.cloud.google.com** and accept the terms if asked.
2. Project picker (top bar) → **New project** → name it `Incolo website` → **Create**, then select it.
3. Search bar → **Google Calendar API** → **Enable**.

## 3. Create the OAuth client

1. Left menu → **APIs & Services → OAuth consent screen** (labelled **Google Auth Platform** in newer consoles) → **Get started**.
   - App name: `Incolo website booking`. User support email: business@incolosystems.com.
   - Audience: **External**. Contact email: business@incolosystems.com. Agree and **Create**.
2. **Data access → Add or remove scopes**, tick these three, then **Update → Save**:
   - `.../auth/calendar.events`: create the booking events (with Meet links)
   - `.../auth/calendar.freebusy`: see busy times only, never event details
   - `.../auth/calendar.calendarlist.readonly`: lets `/admin` test the connection
3. **Audience → Publish app → Confirm** so the status reads **In production**.
   **This matters:** in "Testing" mode Google expires the connection after 7 days and bookings stop working. You don't need Google's verification review, because only your own account uses the app.
4. **Clients → Create client** → Application type **Desktop app** → name `Incolo website` → **Create**. Copy the **Client ID** and **Client secret**.

## 4. Connect the calendar (on your Mac, once)

In the project folder:

```bash
cd /Users/gauravdua/Documents/ClaudeDir/Projects/incolosite2.0
```

Create a local `.env` with the two values from step 3.4. It's ignored by git, so it never reaches GitHub:

```bash
printf 'GOOGLE_CLIENT_ID=paste-client-id\nGOOGLE_CLIENT_SECRET=paste-client-secret\n' >> .env
```

```bash
npm run google-auth
```

Open the link it prints and sign in as **business@incolosystems.com**. Google warns that the app isn't verified (that's expected: it's your own app). Click **Advanced → Go to Incolo website booking**, then **Continue / Allow**.

The terminal prints a line starting `GOOGLE_REFRESH_TOKEN=`. Keep it for step 5 and treat it like a password.

## 5. Create the admin password (on your Mac)

```bash
npm run admin-password
```

Type a password of at least 12 characters (it isn't shown). It prints `ADMIN_PASSWORD_HASH=…` and `ADMIN_SESSION_SECRET=…`. Only the hash is stored, never the password itself.

## 6. Configure and deploy on the server

```bash
cd /home/opc/incolo-site2 && nano .env
```

Add these lines, with your values from steps 3–5:

```
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
GOOGLE_REFRESH_TOKEN=…
ADMIN_PASSWORD_HASH=…
ADMIN_SESSION_SECRET=…
BOOKING_SETTINGS_FILE=/home/opc/incolo-data/booking-settings.json
BOOKINGS_FILE=/home/opc/incolo-data/bookings.jsonl
```

**Check the SMTP login.** Invites are sent *from* business@incolosystems.com, so `SMTP_USER` / `SMTP_PASS` must be the **business@** mailbox (or one allowed to send as it). If `.env` currently logs in as `noreply@`, change it, or GoDaddy/Microsoft may reject the message or mark it as spoofed.

Then deploy:

```bash
git pull && npm run build && sudo systemctl restart incolo && sleep 2 && journalctl -u incolo -n 5 --no-pager
```

The log should include `booking calendar: google · admin: enabled`.

## 7. Test it

1. Open **https://incolo.si/admin**, sign in, and click **Test Google connection**. It should say "Connected to calendar …".
2. Check the invitee list and hours, then **Save settings**.
3. Open **https://incolo.si/contact** and book a slot using an address you can check.
4. Confirm:
   - The invite arrives **from business@incolosystems.com** with a Meet link.
   - The event is in **business@'s Google Calendar** and in **theedivesh@gmail.com's** calendar.
   - The booking appears under **Upcoming bookings** in `/admin`.
5. Delete the test event in Google Calendar to free the slot.

---

## Day-to-day

| Task | Where |
|---|---|
| Change invitees, hours, call length, notice, holidays | `/admin` → Scoping-call settings → Save (applies immediately) |
| Block a time | Add anything to business@'s Google Calendar |
| See upcoming bookings | `/admin`, or business@'s Google Calendar |
| Cancel or reschedule | Edit or delete the event in business@'s Google Calendar and email the customer. Google sends no automatic update, because invites go out from your mailbox. |
| Change the admin password | `npm run admin-password` → replace the two lines in the server `.env` → restart |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Calendar on the site says "Online booking is unavailable" | `.env` is missing a GOOGLE_* value, or the token was revoked. Run **Test Google connection** in `/admin` and check `journalctl -u incolo -n 50`. |
| "Google token refresh failed: invalid_grant" | The app was left in Testing mode (7-day expiry) or access was removed. Publish it (step 3.3) and redo step 4. |
| Booking works, but `/admin` shows "invite email not sent" | The SMTP login or password is wrong, or SMTP_USER isn't allowed to send as business@. The event and Meet link still exist; email the customer manually. |
| Invites land in spam | Add SPF and DKIM DNS records for incolosystems.com at your mail provider. |
| A slot shows that you know is busy | The event is in a different calendar, not business@'s Google Calendar. Add it there, or mark the day as a holiday in `/admin`. |

Local development without Google: put `BOOKING_DRY_RUN=true` in `.env`. Slots and bookings work with fake Meet links, and invite emails are saved to `outbox/` instead of being sent.
