export function formatCurrency(amount: number, lang: 'ar' | 'en'): string {
  if (lang === 'ar') {
    const arNum = amount.toLocaleString('ar-SA')
    return `${arNum} ر.س`
  }
  return `SAR ${amount.toLocaleString('en-US')}`
}
