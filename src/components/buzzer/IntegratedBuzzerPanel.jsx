import { CompactBuzzerCard } from './CompactBuzzerCard.jsx'

/** Full panel alias — playing screen uses CompactBuzzerCard directly. */
export function IntegratedBuzzerPanel(props) {
  return <CompactBuzzerCard {...props} />
}
