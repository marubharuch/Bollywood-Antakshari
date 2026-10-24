import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { buildMobileBuzzerUrl } from '../../features/buzzer/buzzerModel.js'

export function ProjectorBuzzerQr({ buzzerSystem, tournament }) {
  const show = Boolean(buzzerSystem?.showQrOnProjector) && Boolean(buzzerSystem?.enabled)
  const serverUrl = buzzerSystem?.serverUrl ?? ''
  const [qrDataUrl, setQrDataUrl] = useState(null)

  const mobileUrl = useMemo(() => {
    if (!show || !serverUrl) return ''
    try {
      return buildMobileBuzzerUrl(serverUrl, {
        tournamentId: tournament?.id,
        tournamentName: tournament?.name,
      })
    } catch {
      return ''
    }
  }, [show, serverUrl, tournament?.id, tournament?.name])

  useEffect(() => {
    if (!mobileUrl) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(mobileUrl, { margin: 2, width: 280 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [mobileUrl])

  if (!show || !qrDataUrl) return null

  return (
    <section
      className="mb-1 min-h-0 shrink overflow-hidden rounded-xl border border-amber-500/40 bg-black/60 px-4 py-2 text-center"
      aria-label="Phone buzzer QR code"
    >
      <p className="text-sm uppercase tracking-widest text-amber-200">Scan to buzz</p>
      <p className="mt-1 text-xs text-slate-400">
        {tournament?.name ? `${tournament.name} · ` : ''}
        Same Wi‑Fi as this laptop
      </p>
      <img
        src={qrDataUrl}
        alt="QR code for team buzzer"
        className="mx-auto mt-2 max-h-[min(28vh,12rem)] w-auto rounded-lg bg-white p-2"
      />
      <p className="mt-2 text-[11px] text-slate-500">
        One buzzer server per laptop — only one live quiz should use this server at a time.
      </p>
    </section>
  )
}
