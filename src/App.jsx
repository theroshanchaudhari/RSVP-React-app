import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'rsvp_submissions_v1'
const LAST_SUBMIT_KEY = 'rsvp_last_submit'
const SUBMIT_COOLDOWN_MS = 10000
const ADMIN_PASSWORD = 'host123'
const RSVP_DEADLINE = '2026-12-10T23:59:59'
const MAX_CAPACITY = 200
const INVITE_ONLY = false
const INVITED_TOKENS = ['FAMILY-001', 'FAMILY-002', 'FAMILY-003']

const EVENT = {
  title: 'Family Wedding RSVP',
  dateTime: '2026-12-25T11:00:00',
  schedule: ['10:00 AM Puja', '12:00 PM Lunch', '2:00 PM Blessings & Photos'],
  venue: 'Shree Hall, Ahmedabad',
  mapsEmbed:
    'https://www.google.com/maps?q=Ahmedabad&output=embed',
  parking: 'Free parking is available behind the venue gate.',
  dressCode: 'Traditional festive attire',
  contact: '+91 99999 99999',
  hostEmail: 'host@example.com',
}

const TEXT = {
  en: {
    heading: 'Please RSVP',
    subheading: 'Let us know if you can join us.',
    submit: 'Submit RSVP',
    dashboard: 'Admin Dashboard',
    eventInfo: 'Event Information',
  },
  hi: {
    heading: 'कृपया RSVP करें',
    subheading: 'कृपया बताएं कि आप आ पाएंगे या नहीं।',
    submit: 'RSVP भेजें',
    dashboard: 'एडमिन डैशबोर्ड',
    eventInfo: 'कार्यक्रम जानकारी',
  },
  gu: {
    heading: 'કૃપા કરીને RSVP કરો',
    subheading: 'તમે હાજર રહી શકશો કે નહીં તે જણાવો.',
    submit: 'RSVP મોકલો',
    dashboard: 'એડમિન ડેશબોર્ડ',
    eventInfo: 'ઈવેન્ટ માહિતી',
  },
}

const INITIAL_FORM = {
  id: '',
  token: '',
  name: '',
  phone: '',
  email: '',
  adults: 1,
  children: 0,
  attending: 'yes',
  meal: 'veg',
  dietary: '',
  arrival: '',
  message: '',
  notes: '',
  honeypot: '',
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^[0-9+\-()\s]{7,20}$/

function toCsv(rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const header = [
    'Name',
    'Phone',
    'Email',
    'Adults',
    'Children',
    'Attending',
    'Meal',
    'Dietary Restrictions',
    'Arrival',
    'Message',
    'Private Notes',
    'Token',
    'Submitted At',
  ]
  const body = rows.map((row) =>
    [
      row.name,
      row.phone,
      row.email,
      row.adults,
      row.children,
      row.attending,
      row.meal,
      row.dietary,
      row.arrival,
      row.message,
      row.notes,
      row.token,
      row.submittedAt,
    ]
      .map(escape)
      .join(','),
  )

  return [header.map(escape).join(','), ...body].join('\n')
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadSubmissions() {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return []
  try {
    return JSON.parse(saved)
  } catch {
    return []
  }
}

function buildInitialForm() {
  if (typeof window === 'undefined') return INITIAL_FORM

  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const editId = params.get('edit')
  const submissions = loadSubmissions()
  const existing = editId ? submissions.find((item) => item.id === editId) : null

  if (existing) {
    return { ...INITIAL_FORM, ...existing, token: existing.token || token, honeypot: '' }
  }

  return { ...INITIAL_FORM, token }
}

function App() {
  const [lang, setLang] = useState('en')
  const [form, setForm] = useState(buildInitialForm)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submissions, setSubmissions] = useState(loadSubmissions)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editLink, setEditLink] = useState('')

  const appText = TEXT[lang]
  const [now, setNow] = useState(() => Date.now())
  const deadlinePassed = now > new Date(RSVP_DEADLINE).getTime()
  const appUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
  }, [submissions])

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const countdown = useMemo(() => {
    const ms = new Date(EVENT.dateTime).getTime() - now
    if (ms <= 0) return 'Event has started.'
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${days} days ${hours} hours left`
  }, [now])

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((guest) => {
      const matchesStatus = statusFilter === 'all' || guest.attending === statusFilter
      const q = search.toLowerCase()
      const matchesSearch =
        guest.name.toLowerCase().includes(q) ||
        guest.email.toLowerCase().includes(q) ||
        guest.phone.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, submissions])

  const summary = useMemo(() => {
    const attending = submissions.filter((s) => s.attending === 'yes')
    const adults = attending.reduce((sum, row) => sum + Number(row.adults || 0), 0)
    const children = attending.reduce((sum, row) => sum + Number(row.children || 0), 0)
    const byMeal = attending.reduce(
      (acc, row) => ({ ...acc, [row.meal]: (acc[row.meal] || 0) + Number(row.adults) + Number(row.children) }),
      {},
    )

    return {
      totalRsvps: submissions.length,
      attendingCount: attending.length,
      adults,
      children,
      byMeal,
    }
  }, [submissions])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (deadlinePassed) return 'RSVP is closed. Deadline has passed.'
    if (!form.name.trim()) return 'Please provide guest name.'
    if (!phoneRegex.test(form.phone)) return 'Please provide a valid phone number.'
    if (!emailRegex.test(form.email)) return 'Please provide a valid email address.'
    if (form.honeypot) return 'Spam check failed.'
    if (INVITE_ONLY && !INVITED_TOKENS.includes(form.token.trim())) {
      return 'Invite token is required for this event.'
    }

    const duplicate = submissions.find(
      (entry) =>
        entry.id !== form.id && (entry.email.toLowerCase() === form.email.toLowerCase() || entry.phone === form.phone),
    )
    if (duplicate) {
      return 'Duplicate RSVP detected for this email or phone.'
    }

    const currentAttending = submissions
      .filter((entry) => entry.attending === 'yes' && entry.id !== form.id)
      .reduce((sum, entry) => sum + Number(entry.adults) + Number(entry.children), 0)
    const incoming = form.attending === 'yes' ? Number(form.adults) + Number(form.children) : 0
    if (currentAttending + incoming > MAX_CAPACITY) {
      return `Capacity reached. Max allowed guests: ${MAX_CAPACITY}.`
    }

    const lastSubmit = Number(localStorage.getItem(LAST_SUBMIT_KEY) || '0')
    if (Date.now() - lastSubmit < SUBMIT_COOLDOWN_MS) {
      return 'Please wait a few seconds before submitting again.'
    }

    return ''
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setConfirmation('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const entryId = form.id || uid()
    const token = form.token || `FAMILY-${entryId.slice(-4).toUpperCase()}`
    const submission = {
      ...form,
      id: entryId,
      token,
      adults: Number(form.adults),
      children: Number(form.children),
      submittedAt: new Date().toISOString(),
    }

    setSubmissions((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === entryId)
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = submission
        return next
      }
      return [...prev, submission]
    })

    localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()))
    const link = `${appUrl}?edit=${entryId}&token=${encodeURIComponent(token)}`
    setEditLink(link)
    setConfirmation('Thank you! Your RSVP has been recorded.')
    setForm((prev) => ({ ...INITIAL_FORM, token: prev.token || token }))
  }

  function openAdmin() {
    if (adminPass === ADMIN_PASSWORD) {
      setAdminOpen(true)
      setError('')
      return
    }
    setError('Invalid admin password.')
  }

  function exportCsv() {
    const csv = toCsv(filteredSubmissions)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'rsvp-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function clearData() {
    if (!window.confirm('Delete all RSVP data?')) return
    setSubmissions([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`Please RSVP here: ${appUrl}`)}`
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT.title)}&dates=20261225T053000Z/20261225T083000Z&details=${encodeURIComponent('RSVP Event')}&location=${encodeURIComponent(EVENT.venue)}`

  return (
    <main className="app">
      <header className="hero">
        <h1>{appText.heading}</h1>
        <p>{appText.subheading}</p>
        <div className="cta-row">
          <button type="button" onClick={() => setLang('en')}>English</button>
          <button type="button" onClick={() => setLang('hi')}>हिंदी</button>
          <button type="button" onClick={() => setLang('gu')}>ગુજરાતી</button>
        </div>
      </header>

      <section className="panel">
        <h2>{appText.eventInfo}</h2>
        <p><strong>Date & Time:</strong> {new Date(EVENT.dateTime).toLocaleString()}</p>
        <p><strong>Venue:</strong> {EVENT.venue}</p>
        <p><strong>Dress Code:</strong> {EVENT.dressCode}</p>
        <p><strong>Parking:</strong> {EVENT.parking}</p>
        <p><strong>Schedule:</strong> {EVENT.schedule.join(' | ')}</p>
        <p><strong>RSVP Deadline:</strong> {new Date(RSVP_DEADLINE).toLocaleString()}</p>
        <p><strong>Countdown:</strong> {countdown}</p>
        <div className="cta-row">
          <a href={whatsappShare} target="_blank" rel="noreferrer">Share via WhatsApp</a>
          <a href={calendarLink} target="_blank" rel="noreferrer">Add to Calendar</a>
        </div>
        <img
          alt="Invitation QR Code"
          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(appUrl)}`}
        />
        <iframe title="Venue map" src={EVENT.mapsEmbed} loading="lazy" />
      </section>

      <section className="panel">
        <h2>RSVP Form</h2>
        {error && <p className="error" role="alert">{error}</p>}
        {confirmation && <p className="success">{confirmation}</p>}
        {editLink && <p className="edit-link">Edit your RSVP later: <a href={editLink}>{editLink}</a></p>}

        <form onSubmit={handleSubmit}>
          {INVITE_ONLY && (
            <label>
              Invite token
              <input value={form.token} onChange={(e) => updateField('token', e.target.value)} required />
            </label>
          )}
          <label>
            Guest name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </label>

          <div className="grid-2">
            <label>
              Adults
              <input type="number" min="0" max="20" value={form.adults} onChange={(e) => updateField('adults', e.target.value)} required />
            </label>
            <label>
              Children
              <input type="number" min="0" max="20" value={form.children} onChange={(e) => updateField('children', e.target.value)} required />
            </label>
          </div>

          <label>
            Attending
            <select value={form.attending} onChange={(e) => updateField('attending', e.target.value)}>
              <option value="yes">Attending</option>
              <option value="no">Not attending</option>
            </select>
          </label>

          <label>
            Meal preference
            <select value={form.meal} onChange={(e) => updateField('meal', e.target.value)}>
              <option value="veg">Vegetarian</option>
              <option value="non-veg">Non-vegetarian</option>
              <option value="jain">Jain</option>
            </select>
          </label>

          <label>
            Dietary restrictions
            <input value={form.dietary} onChange={(e) => updateField('dietary', e.target.value)} />
          </label>

          <label>
            Arrival time estimate
            <input type="time" value={form.arrival} onChange={(e) => updateField('arrival', e.target.value)} />
          </label>

          <label>
            Optional message to host
            <textarea rows="3" value={form.message} onChange={(e) => updateField('message', e.target.value)} />
          </label>

          <label>
            Private notes (host use)
            <textarea rows="2" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </label>

          <label className="honeypot" aria-hidden="true">
            Leave this field empty
            <input tabIndex="-1" autoComplete="off" value={form.honeypot} onChange={(e) => updateField('honeypot', e.target.value)} />
          </label>

          <button type="submit" disabled={deadlinePassed}>{appText.submit}</button>
        </form>

        <p>
          Confirmation emails/SMS are typically sent by backend integrations. You can notify host now at{' '}
          <a href={`mailto:${EVENT.hostEmail}`}>{EVENT.hostEmail}</a>.
        </p>
      </section>

      <section className="panel">
        <h2>Admin Access</h2>
        {!adminOpen ? (
          <div className="admin-lock">
            <label>
              Admin password
              <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
            </label>
            <button type="button" onClick={openAdmin}>Open Dashboard</button>
          </div>
        ) : (
          <>
            <h3>{appText.dashboard}</h3>
            <div className="stats">
              <p>Total RSVPs: {summary.totalRsvps}</p>
              <p>Attending RSVPs: {summary.attendingCount}</p>
              <p>Total Adults: {summary.adults}</p>
              <p>Total Children: {summary.children}</p>
            </div>

            <p>
              Meal summary:{' '}
              {Object.entries(summary.byMeal)
                .map(([meal, count]) => `${meal} (${count})`)
                .join(', ') || 'No meal selections yet.'}
            </p>

            <div className="grid-2">
              <label>
                Search guests
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name / Email / Phone" />
              </label>
              <label>
                Filter by RSVP status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="yes">Attending</option>
                  <option value="no">Not attending</option>
                </select>
              </label>
            </div>

            <div className="cta-row">
              <button type="button" onClick={exportCsv}>Export CSV</button>
              <button type="button" onClick={clearData}>Delete all data</button>
            </div>

            <div className="guest-list">
              {filteredSubmissions.map((guest) => (
                <article key={guest.id}>
                  <p><strong>{guest.name}</strong> ({guest.attending === 'yes' ? 'Attending' : 'Not attending'})</p>
                  <p>{guest.email} | {guest.phone}</p>
                  <p>Adults: {guest.adults}, Children: {guest.children}, Meal: {guest.meal}</p>
                  <p>Dietary: {guest.dietary || 'None'}, Arrival: {guest.arrival || '-'}</p>
                  <p>Submitted: {new Date(guest.submittedAt).toLocaleString()}</p>
                  <p>Token: {guest.token}</p>
                  <p>Notes: {guest.notes || '-'}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>FAQ</h2>
        <p><strong>Can I edit my RSVP later?</strong> Yes, use your edit link after submission.</p>
        <p><strong>Can I contact host directly?</strong> Yes: {EVENT.contact}</p>
        <p><strong>Privacy notice:</strong> RSVP data is stored for event management and can be deleted after event day.</p>
      </section>
    </main>
  )
}

export default App
