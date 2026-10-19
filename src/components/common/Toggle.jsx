export function Toggle({ checked, onChange, label, description, id }) {
  const inputId = id ?? label?.replace(/\s+/g, '-').toLowerCase()

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3"
    >
      <input
        id={inputId}
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-500 text-rose-500 focus:ring-rose-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block font-medium text-slate-100">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-400">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
