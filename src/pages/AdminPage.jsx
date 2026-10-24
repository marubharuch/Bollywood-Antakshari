import { PlayingScreenPage } from './admin/PlayingScreenPage.jsx'

/** Embedded admin surface (split-screen test). */
export function AdminPage({ embedded = false }) {
  return <PlayingScreenPage embedded={embedded} />
}
