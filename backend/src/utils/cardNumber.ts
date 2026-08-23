/**
 * AgroudAn Kisan Card number generator.
 *
 * Format: AGK-XXXX-XXXX  (e.g. AGK-LUFA-MERI)
 *
 * Each 4-char block is Consonant-Vowel-Consonant-Vowel, which makes the card
 * number easy to read, pronounce and communicate verbally while remaining
 * non-sequential and not derived from any PII.
 *
 * Character sets deliberately exclude visually-ambiguous characters
 * (no 0/O/1/I confusion; digits are not used at all) so the number is
 * case-insensitive-friendly and typo-resistant.
 */

const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const VOWELS = 'AEIOU';
const BLOCK_SIZE = 4;

function pick(set: string): string {
  return set[Math.floor(Math.random() * set.length)];
}

function pronounceableGroup(): string {
  let block = '';
  for (let i = 0; i < BLOCK_SIZE; i++) {
    block += i % 2 === 0 ? pick(CONSONANTS) : pick(VOWELS);
  }
  return block;
}

export function generateCardNumber(): string {
  return `AGK-${pronounceableGroup()}-${pronounceableGroup()}`;
}

export function normalizeCardNumber(cardNumber: string): string {
  return (cardNumber || '').toString().toUpperCase().replace(/\s+/g, '');
}
