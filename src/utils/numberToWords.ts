// Utility to convert numbers to Spanish currency words for Peruvian invoices & quotations
// Example: 1540.50 -> "UN MIL QUINIENTOS CUARENTA CON 50/100 SOLES"

export function numberToWords(amount: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertGroup(n: number): string {
    let output = '';

    if (n === 100) return 'CIEN';

    // Centenas
    if (n >= 100) {
      output += hundreds[Math.floor(n / 100)] + ' ';
      n %= 100;
    }

    // Decenas y Unidades
    if (n >= 10 && n <= 19) {
      output += teens[n - 10] + ' ';
    } else if (n >= 20 && n <= 29) {
      if (n === 20) output += 'VEINTE ';
      else output += 'VEINTI' + units[n - 20] + ' ';
    } else if (n >= 30) {
      output += tens[Math.floor(n / 10)];
      if (n % 10 > 0) output += ' Y ' + units[n % 10];
      output += ' ';
    } else if (n > 0) {
      output += units[n] + ' ';
    }

    return output.trim();
  }

  const rounded = Math.round(amount * 100) / 100;
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100);
  const cents = decimalPart.toString().padStart(2, '0');

  if (integerPart === 0) {
    return `CERO CON ${cents}/100 SOLES`;
  }

  let words = '';

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    if (millions === 1) words += 'UN MILLÓN ';
    else words += convertGroup(millions) + ' MILLONES ';
  }

  if (thousands > 0) {
    if (thousands === 1) words += 'MIL ';
    else words += convertGroup(thousands) + ' MIL ';
  }

  if (remainder > 0) {
    words += convertGroup(remainder) + ' ';
  }

  return `SON: ${words.trim()} CON ${cents}/100 SOLES`;
}
