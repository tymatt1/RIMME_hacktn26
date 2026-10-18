export function formatPhone(value) {
  const original = String(value ?? '').trim()
  const match = original.match(/^(.*?)(?:\s*(?:ext\.?|x|#)\s*(\d+))?$/i)
  const digits = match[1].replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return original
  return `${digits.length === 11 ? '+1 ' : ''}${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}${match[2] ? ` ext. ${match[2]}` : ''}`
}
