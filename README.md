# RSVP React App

A mobile-friendly RSVP web app built with React + Vite.

## Included MVP features

- Public event landing page with date/time, schedule, venue, parking and map embed
- RSVP form with:
  - Name, phone, email
  - Adults/children counts
  - Attending / not attending
  - Meal preference and dietary restrictions
  - Arrival time and optional message
  - Optional host notes and honeypot spam field
- RSVP deadline + max guest capacity checks
- Duplicate RSVP detection (email/phone)
- Confirmation message + guest edit link
- WhatsApp share link + calendar add button + invitation QR code
- Admin dashboard (password-gated) with:
  - Search/filter
  - RSVP status tracking
  - Total/adult/children counts
  - Meal summary
  - Submission timestamps
  - CSV export
  - Data deletion action
- Language toggle for English / Hindi / Gujarati headings
- FAQ and privacy notice sections

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm run build
```
