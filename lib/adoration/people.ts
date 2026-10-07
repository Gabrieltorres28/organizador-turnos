export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function matchesPhone(left: string, right: string): boolean {
  const leftDigits = normalizePhone(left)
  const rightDigits = normalizePhone(right)
  return leftDigits.length > 0 && leftDigits === rightDigits
}
