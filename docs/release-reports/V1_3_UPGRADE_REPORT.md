# AttendanceTracker v1.3 Upgrade Report

## Added
- SMTP-backed email alert pipeline for low attendance and monthly reports.
- Manual WhatsApp click-to-send alert flow using student/parent phone numbers.
- Low attendance communication dashboard with 75%, 65%, and 50% risk bands.
- Editable email and WhatsApp templates with dynamic variables.
- Alert history using NotificationLog with Delivered, Failed, Skipped, and Manual statuses.
- Monthly report sending action from the communication dashboard.
- Notification settings remain PNPM/PostgreSQL/Prisma compatible.

## PNPM commands
```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm build
pnpm dev
```

## Environment
Copy `backend/.env.example` to `backend/.env` and configure SMTP before real email delivery.
WhatsApp is manual-first: the app generates a `wa.me` link and stores manual alert history.
