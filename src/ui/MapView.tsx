import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'preact/hooks'
import { db } from '../data/db'
import { t } from '../i18n'
import { selfInfo } from '../session'
import { contactTypeLabel } from './format'
import { useLive } from './hooks'

export function MapView() {
  const contacts = useLive(() => db.contacts.toArray(), [], [])!
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | undefined>(undefined)
  const layer = useRef<L.LayerGroup | undefined>(undefined)
  const located = contacts.filter(c => c.lat || c.lon)
  const me = selfInfo.value

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current).setView([46.7, 14.0], 9) // Kärnten
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => { m.remove(); map.current = undefined }
  }, [])

  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    const pts: L.LatLngTuple[] = []
    for (const c of located) {
      const p: L.LatLngTuple = [c.lat, c.lon]
      pts.push(p)
      const mk = L.circleMarker(p, { radius: c.type === 2 ? 9 : 6, color: c.type === 2 ? '#b3261e' : '#1479b8', fillOpacity: 0.8 }).addTo(g)
      const box = document.createElement('div')
      const strong = document.createElement('strong'); strong.textContent = c.name; box.append(strong, document.createElement('br'), contactTypeLabel(c.type))
      mk.bindPopup(box) // textContent statt HTML: Kontaktnamen kommen aus dem Funknetz und sind nicht vertrauenswürdig
    }
    if (me && (me.lat || me.lon)) { pts.push([me.lat, me.lon]); L.marker([me.lat, me.lon]).addTo(g) }
    if (pts.length) map.current?.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 13 })
  }, [contacts, me])

  return <>
    <h2>{t('map_title')}</h2>
    {located.length === 0 && <p class="muted">{t('map_empty')}</p>}
    <div id="map" ref={el} />
  </>
}
