import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom'
import '@fontsource/libre-baskerville/700.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material'

const STORAGE_KEY = 'rsvp_submissions_v1'
const SETTINGS_KEY = 'rsvp_settings_v1'
const LAST_SUBMIT_KEY = 'rsvp_last_submit'
const SUBMIT_COOLDOWN_MS = 10000
const ADMIN_PASSWORD = 'host123'
const DEFAULT_SETTINGS = {
  event: {
    title: 'Family Wedding RSVP',
    dateTime: '2026-12-25T11:00:00',
    schedule: ['10:00 AM Puja', '12:00 PM Lunch', '2:00 PM Blessings & Photos'],
    venue: '22 Duncairn Ave, Kitchener ON N2M 4S4',
    mapsEmbed:
      'https://www.google.com/maps/place/22+duncairn+ave+kitchener+ontario+n2m+4s4/@43.4240644,-80.505863,3a,75y,153.73h,90t/data=!3m4!1e1!3m2!1setfSPXOh2dtB5ios5pMkCA!2e0!4m2!3m1!1s0x882bf5a5e8eb6b05:0x6d777697648c373f?sa=X&ved=1t:3780&ictx=111',
    parking: 'You may park on street.',
    dressCode: 'Traditional',
    contact: '+1 226 507 7565',
    hostEmail: 'theroshanchaudhari@gmail.com',
  },
  rsvpOpen: true,
  rsvpDeadline: '2026-12-10T23:59:59',
  maxCapacity: 200,
  inviteOnly: false,
  invitedTokens: ['FAMILY-001', 'FAMILY-002', 'FAMILY-003'],
  confirmationMessage: 'Thank you! Your RSVP has been recorded.',
}

const TEXT = {
  en: {
    heading: 'Please RSVP',
    subheading: 'Let us know if you can join us.',
    submit: 'Submit RSVP',
    dashboard: 'Admin Dashboard',
    eventInfo: 'Event Information',
  }
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

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f766e' },
    secondary: { main: '#b45309' },
    background: { default: '#f9f6ee', paper: '#fffdf8' },
    text: { primary: '#1f2937', secondary: '#4b5563' },
  },
  shape: { borderRadius: 18 },
  typography: {
    fontFamily: 'Manrope, Segoe UI, sans-serif',
    h1: {
      fontFamily: 'Libre Baskerville, Georgia, serif',
      fontWeight: 700,
      letterSpacing: 0.3,
    },
    h2: {
      fontFamily: 'Libre Baskerville, Georgia, serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Libre Baskerville, Georgia, serif',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      defaultProps: { variant: 'contained' },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 14,
          fontWeight: 700,
          paddingInline: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e7e0d1',
          boxShadow: '0 10px 30px rgba(30, 41, 59, 0.07)',
        },
      },
    },
  },
})

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

function loadSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS

  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return DEFAULT_SETTINGS

  try {
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      event: {
        ...DEFAULT_SETTINGS.event,
        ...(parsed?.event || {}),
        schedule: Array.isArray(parsed?.event?.schedule) ? parsed.event.schedule : DEFAULT_SETTINGS.event.schedule,
      },
      invitedTokens: Array.isArray(parsed?.invitedTokens) ? parsed.invitedTokens : DEFAULT_SETTINGS.invitedTokens,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function toDateTimeLocal(value) {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const y = dt.getFullYear()
  const m = pad(dt.getMonth() + 1)
  const d = pad(dt.getDate())
  const h = pad(dt.getHours())
  const min = pad(dt.getMinutes())
  return `${y}-${m}-${d}T${h}:${min}`
}

function fromDateTimeLocal(value, fallback) {
  if (!value) return fallback
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return fallback
  return dt.toISOString()
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

function buildMapEmbedUrl(mapUrl, fallbackAddress) {
  const fallback = `https://www.google.com/maps?q=${encodeURIComponent(fallbackAddress)}&output=embed`

  if (!mapUrl) return fallback

  try {
    const parsed = new URL(mapUrl)
    const host = parsed.hostname.toLowerCase()
    const isGoogleMaps = host.includes('google.')

    if (isGoogleMaps) {
      if (parsed.pathname.includes('/maps/embed') || parsed.searchParams.get('output') === 'embed') {
        return parsed.toString()
      }

      const placeSegment = parsed.pathname.match(/\/maps\/place\/([^/]+)/)
      if (placeSegment?.[1]) {
        const placeText = decodeURIComponent(placeSegment[1]).replaceAll('+', ' ')
        return `https://www.google.com/maps?q=${encodeURIComponent(placeText)}&output=embed`
      }

      const query = parsed.searchParams.get('q') || parsed.searchParams.get('query')
      if (query) {
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
      }
    }
  } catch {
    // Fall back to direct address embed URL when parsing fails.
  }

  return fallback
}

function DecorativeShell({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 20% 10%, rgba(15,118,110,0.15) 0%, rgba(15,118,110,0) 28%), radial-gradient(circle at 85% 20%, rgba(180,83,9,0.17) 0%, rgba(180,83,9,0) 32%), linear-gradient(180deg, #fffaf0 0%, #f8f4e8 100%)',
        pb: 6,
      }}
    >
      {children}
    </Box>
  )
}

function RsvpPage({
  lang,
  settings,
  form,
  error,
  confirmation,
  editLink,
  rsvpClosed,
  deadlinePassed,
  countdown,
  appUrl,
  updateField,
  handleSubmit,
}) {
  const appText = TEXT[lang]
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`Please RSVP here: ${appUrl}`)}`
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(settings.event.title)}&details=${encodeURIComponent('RSVP Event')}&location=${encodeURIComponent(settings.event.venue)}`
  const mapEmbedUrl = buildMapEmbedUrl(settings.event.mapsEmbed, settings.event.venue)

  return (
    <DecorativeShell>
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 } }}>
        <Card sx={{ mb: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h1" sx={{ fontSize: { xs: '2.1rem', md: '3rem' }, lineHeight: 1.05 }}>
                  {appText.heading}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {appText.subheading}
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <Button component="a" href={whatsappShare} target="_blank" rel="noreferrer">Share on WhatsApp</Button>
                <Button component="a" href={calendarLink} target="_blank" rel="noreferrer" variant="outlined">Add to Calendar</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.3rem' }, mb: 1.5 }}>
                  {appText.eventInfo}
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}><Chip label={`Date & Time: ${new Date(settings.event.dateTime).toLocaleString()}`} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><Chip label={`Venue: ${settings.event.venue}`} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><Chip label={`Dress Code: ${settings.event.dressCode}`} /></Grid>
                  <Grid size={{ xs: 12, sm: 6 }}><Chip label={`RSVP Deadline: ${new Date(settings.rsvpDeadline).toLocaleString()}`} /></Grid>
                </Grid>
                <Typography sx={{ mt: 2 }}><strong>Schedule:</strong> {settings.event.schedule.join(' | ')}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}><strong>Parking:</strong> {settings.event.parking}</Typography>
                <Alert severity="info" sx={{ mt: 2 }}>Countdown: {countdown}</Alert>
                {!settings.rsvpOpen && <Alert severity="warning" sx={{ mt: 1.2 }}>RSVP is currently closed by host.</Alert>}
                {deadlinePassed && <Alert severity="warning" sx={{ mt: 1.2 }}>RSVP deadline has passed.</Alert>}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h3" sx={{ fontSize: '1.7rem', mb: 1.5 }}>
                  Venue Map
                </Typography>
                <Box
                  component="iframe"
                  title="Venue map"
                  src={mapEmbedUrl}
                  loading="lazy"
                  sx={{ width: '100%', minHeight: 220, border: 0, borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.3rem' }, mb: 2 }}>
              RSVP Form
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
            {confirmation && <Alert severity="success" sx={{ mb: 1.5 }}>{confirmation}</Alert>}
            {editLink && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Edit your RSVP later: <Link href={editLink}>{editLink}</Link>
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={1.5}>
                {settings.inviteOnly && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Invite token"
                      value={form.token}
                      onChange={(e) => updateField('token', e.target.value)}
                      required
                      fullWidth
                    />
                  </Grid>
                )}

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Guest name" value={form.name} onChange={(e) => updateField('name', e.target.value)} required fullWidth />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required fullWidth />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField type="email" label="Email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required fullWidth />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField type="number" label="Adults" inputProps={{ min: 0, max: 20 }} value={form.adults} onChange={(e) => updateField('adults', e.target.value)} required fullWidth />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField type="number" label="Children" inputProps={{ min: 0, max: 20 }} value={form.children} onChange={(e) => updateField('children', e.target.value)} required fullWidth />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Attending</InputLabel>
                    <Select
                      value={form.attending}
                      label="Attending"
                      onChange={(e) => updateField('attending', e.target.value)}
                    >
                      <MenuItem value="yes">Attending</MenuItem>
                      <MenuItem value="no">Not attending</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Meal preference</InputLabel>
                    <Select value={form.meal} label="Meal preference" onChange={(e) => updateField('meal', e.target.value)}>
                      <MenuItem value="veg">Vegetarian</MenuItem>
                      <MenuItem value="non-veg">Non-vegetarian</MenuItem>
                      <MenuItem value="jain">Jain</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField label="Dietary restrictions" value={form.dietary} onChange={(e) => updateField('dietary', e.target.value)} fullWidth />
                </Grid>

                <Box sx={{ position: 'absolute', left: -9999 }} aria-hidden="true">
                  <TextField
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.honeypot}
                    onChange={(e) => updateField('honeypot', e.target.value)}
                  />
                </Box>

                <Grid size={{ xs: 12 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                    <Button type="submit" disabled={rsvpClosed}>{appText.submit}</Button>
                    <Button component={Link} href={`mailto:${settings.event.hostEmail}`} variant="outlined">Contact Host</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        <Paper sx={{ p: { xs: 2, md: 3 }, border: '1px solid #e5ddcf' }}>
          <Typography variant="h3" sx={{ fontSize: '1.7rem', mb: 1.2 }}>FAQ</Typography>
          <Typography><strong>Can I edit my RSVP later?</strong> Yes, use your edit link after submission.</Typography>
          <Typography sx={{ mt: 0.8 }}><strong>Can I contact host directly?</strong> Yes: {settings.event.contact}</Typography>
          <Typography sx={{ mt: 0.8 }} color="text.secondary"><strong>Privacy notice:</strong> RSVP data is stored for event management and can be deleted after event day.</Typography>
        </Paper>
      </Container>
    </DecorativeShell>
  )
}

function AdminPage({ submissions, setSubmissions, settings, setSettings }) {
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [settingsDraft, setSettingsDraft] = useState(settings)

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

  function openAdmin() {
    if (adminPass === ADMIN_PASSWORD) {
      setAdminOpen(true)
      setAdminError('')
      return
    }
    setAdminError('Invalid admin password.')
  }

  function updateDraftEvent(field, value) {
    setSettingsDraft((prev) => ({
      ...prev,
      event: {
        ...prev.event,
        [field]: value,
      },
    }))
  }

  function saveSettings() {
    const normalizedCapacity = Math.max(1, Number(settingsDraft.maxCapacity) || 1)
    const normalizedSchedule = settingsDraft.event.schedule.filter((item) => item.trim())
    const normalizedTokens = settingsDraft.invitedTokens.filter((item) => item.trim())

    setSettings({
      ...settingsDraft,
      maxCapacity: normalizedCapacity,
      invitedTokens: normalizedTokens,
      event: {
        ...settingsDraft.event,
        schedule: normalizedSchedule.length ? normalizedSchedule : DEFAULT_SETTINGS.event.schedule,
      },
    })
    setSaveStatus('Settings saved successfully.')
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

  return (
    <DecorativeShell>
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 } }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.4rem' } }}>Admin Access</Typography>
                <Typography color="text.secondary">Separate route secured with password prompt.</Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/"
                variant="outlined"
                sx={{
                  whiteSpace: 'nowrap',
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  px: { sm: 2 },
                  py: { sm: 0.75 },
                  fontSize: { sm: '0.9rem' },
                }}
              >
                Back to RSVP page
              </Button>
            </Stack>

            {adminError && <Alert severity="error" sx={{ mb: 2 }}>{adminError}</Alert>}

            {!adminOpen ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems="flex-start">
                <TextField
                  type="password"
                  label="Admin password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                />
                <Button onClick={openAdmin}>Open Dashboard</Button>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Divider />
                <Typography variant="h3" sx={{ fontSize: '1.9rem' }}>Dashboard</Typography>

                {saveStatus && <Alert severity="success">{saveStatus}</Alert>}

                <Card variant="outlined" sx={{ borderColor: '#dacfb8' }}>
                  <CardContent>
                    <Typography variant="h3" sx={{ fontSize: '1.5rem', mb: 1.2 }}>Event & RSVP Settings</Typography>
                    <Grid container spacing={1.3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Event title"
                          value={settingsDraft.event.title}
                          onChange={(e) => updateDraftEvent('title', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Venue address"
                          value={settingsDraft.event.venue}
                          onChange={(e) => updateDraftEvent('venue', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          type="datetime-local"
                          label="Event date & time"
                          value={toDateTimeLocal(settingsDraft.event.dateTime)}
                          onChange={(e) => updateDraftEvent('dateTime', fromDateTimeLocal(e.target.value, settingsDraft.event.dateTime))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          type="datetime-local"
                          label="RSVP deadline"
                          value={toDateTimeLocal(settingsDraft.rsvpDeadline)}
                          onChange={(e) => setSettingsDraft((prev) => ({
                            ...prev,
                            rsvpDeadline: fromDateTimeLocal(e.target.value, prev.rsvpDeadline),
                          }))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Max guest capacity"
                          inputProps={{ min: 1 }}
                          value={settingsDraft.maxCapacity}
                          onChange={(e) => setSettingsDraft((prev) => ({ ...prev, maxCapacity: e.target.value }))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Google Maps link"
                          value={settingsDraft.event.mapsEmbed}
                          onChange={(e) => updateDraftEvent('mapsEmbed', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Parking instructions"
                          value={settingsDraft.event.parking}
                          onChange={(e) => updateDraftEvent('parking', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Dress code"
                          value={settingsDraft.event.dressCode}
                          onChange={(e) => updateDraftEvent('dressCode', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Host contact number"
                          value={settingsDraft.event.contact}
                          onChange={(e) => updateDraftEvent('contact', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Host email"
                          value={settingsDraft.event.hostEmail}
                          onChange={(e) => updateDraftEvent('hostEmail', e.target.value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          label="Schedule (one line per item)"
                          value={settingsDraft.event.schedule.join('\n')}
                          onChange={(e) => updateDraftEvent('schedule', e.target.value.split('\n').map((item) => item.trim()))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          label="Custom confirmation message"
                          value={settingsDraft.confirmationMessage}
                          onChange={(e) => setSettingsDraft((prev) => ({ ...prev, confirmationMessage: e.target.value }))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="Invite-only tokens (comma separated)"
                          value={settingsDraft.invitedTokens.join(', ')}
                          onChange={(e) => setSettingsDraft((prev) => ({
                            ...prev,
                            invitedTokens: e.target.value.split(',').map((item) => item.trim()),
                          }))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settingsDraft.rsvpOpen}
                              onChange={(e) => setSettingsDraft((prev) => ({ ...prev, rsvpOpen: e.target.checked }))}
                            />
                          }
                          label="RSVP open"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settingsDraft.inviteOnly}
                              onChange={(e) => setSettingsDraft((prev) => ({ ...prev, inviteOnly: e.target.checked }))}
                            />
                          }
                          label="Invite-only mode"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                          <Button onClick={saveSettings}>Save Settings</Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setSettingsDraft(DEFAULT_SETTINGS)
                              setSaveStatus('')
                            }}
                          >
                            Reset Draft
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6, md: 3 }}><Chip sx={{ width: '100%', py: 2.5 }} label={`Total RSVPs: ${summary.totalRsvps}`} /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Chip sx={{ width: '100%', py: 2.5 }} label={`Attending: ${summary.attendingCount}`} /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Chip sx={{ width: '100%', py: 2.5 }} label={`Adults: ${summary.adults}`} /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Chip sx={{ width: '100%', py: 2.5 }} label={`Children: ${summary.children}`} /></Grid>
                </Grid>

                <Alert severity="info">
                  Meal summary:{' '}
                  {Object.entries(summary.byMeal)
                    .map(([meal, count]) => `${meal} (${count})`)
                    .join(', ') || 'No meal selections yet.'}
                </Alert>

                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      fullWidth
                      label="Search guests"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Name / Email / Phone"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Filter by RSVP status</InputLabel>
                      <Select value={statusFilter} label="Filter by RSVP status" onChange={(e) => setStatusFilter(e.target.value)}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="yes">Attending</MenuItem>
                        <MenuItem value="no">Not attending</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                  <Button onClick={exportCsv}>Export CSV</Button>
                  <Button color="secondary" onClick={clearData}>Delete all data</Button>
                </Stack>

                <Grid container spacing={1.4}>
                  {filteredSubmissions.map((guest) => (
                    <Grid key={guest.id} size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 1.6, border: '1px solid #e7e0d1', height: '100%' }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {guest.name} ({guest.attending === 'yes' ? 'Attending' : 'Not attending'})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                          {guest.email} | {guest.phone}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.4 }}>
                          Adults: {guest.adults}, Children: {guest.children}, Meal: {guest.meal}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.4 }}>
                          Dietary: {guest.dietary || 'None'}, Arrival: {guest.arrival || '-'}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.4 }}>
                          Submitted: {new Date(guest.submittedAt).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.4 }}>
                          Token: {guest.token}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.4 }}>
                          Notes: {guest.notes || '-'}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    </DecorativeShell>
  )
}

function App() {
  const lang = 'en'
  const [settings, setSettings] = useState(loadSettings)
  const [form, setForm] = useState(buildInitialForm)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submissions, setSubmissions] = useState(loadSubmissions)
  const [editLink, setEditLink] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const deadlinePassed = now > new Date(settings.rsvpDeadline).getTime()
  const rsvpClosed = !settings.rsvpOpen || deadlinePassed
  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : ''

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
  }, [submissions])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const countdown = useMemo(() => {
    const ms = new Date(settings.event.dateTime).getTime() - now
    if (ms <= 0) return 'Event has started.'
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${days} days ${hours} hours left`
  }, [now, settings.event.dateTime])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!settings.rsvpOpen) return 'RSVP is currently closed by host.'
    if (deadlinePassed) return 'RSVP is closed. Deadline has passed.'
    if (!form.name.trim()) return 'Please provide guest name.'
    if (!phoneRegex.test(form.phone)) return 'Please provide a valid phone number.'
    if (!emailRegex.test(form.email)) return 'Please provide a valid email address.'
    if (form.honeypot) return 'Spam check failed.'
    if (settings.inviteOnly && !settings.invitedTokens.includes(form.token.trim())) {
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
    if (currentAttending + incoming > Number(settings.maxCapacity)) {
      return `Capacity reached. Max allowed guests: ${settings.maxCapacity}.`
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
    setConfirmation(settings.confirmationMessage || DEFAULT_SETTINGS.confirmationMessage)
    setForm((prev) => ({ ...INITIAL_FORM, token: prev.token || token }))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route
          path="/"
          element={
            <RsvpPage
              lang={lang}
              settings={settings}
              form={form}
              error={error}
              confirmation={confirmation}
              editLink={editLink}
              rsvpClosed={rsvpClosed}
              deadlinePassed={deadlinePassed}
              countdown={countdown}
              appUrl={appUrl}
              updateField={updateField}
              handleSubmit={handleSubmit}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPage
              submissions={submissions}
              setSubmissions={setSubmissions}
              settings={settings}
              setSettings={setSettings}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
