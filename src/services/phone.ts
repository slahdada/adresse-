/**
 * Utility functions for telephony and messaging (WhatsApp, Tel, SMS)
 */

/**
 * Generate a direct WhatsApp universal link (wa.me) for web, mobile and tablet.
 * @param phone Raw phone number string (e.g. "+33 6 45 78 92 10" or "06 12 34 56 78")
 * @param message Optional predefined text message
 */
export function getWhatsAppUrl(phone: string, message?: string): string {
  if (!phone) return 'https://wa.me/';

  // Clean out common formatting characters: spaces, hyphens, periods, parentheses
  let cleaned = phone.trim().replace(/[\s.\-()]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Standard French mobile number: 06 XX XX XX XX or 07 XX XX XX XX -> 336... or 337...
    cleaned = '33' + cleaned.substring(1);
  }

  // Remove any non-digit character remaining
  cleaned = cleaned.replace(/\D/g, '');

  const baseUrl = `https://wa.me/${cleaned}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

/**
 * Format phone number for tel: protocol
 */
export function getTelUrl(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

/**
 * Format phone number for sms: protocol
 */
export function getSmsUrl(phone: string): string {
  return `sms:${phone.replace(/\s+/g, '')}`;
}
