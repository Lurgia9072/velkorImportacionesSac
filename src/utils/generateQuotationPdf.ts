import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types';
import { numberToWords } from './numberToWords';

export interface CompanyInfo {
  businessName: string;
  ruc: string;
  subtitle: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string | null;
}

export const VELKOR_COMPANY: CompanyInfo = {
  businessName: 'VELKOR IMPORTACIONES S.A.C.',
  ruc: '20616309146',
  subtitle: 'Mayorista de repuestos y accesorios para motos',
  phone: '+51 970 329 450',
  email: 'velkoryauramiza@gmail.com',
  address: 'Lima, Perú'
};

/**
 * Loads an image from URL and returns base64 or HTMLImageElement for jsPDF
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export async function generateQuotationPdf(
  quotation: Quotation, 
  customLogoUrl?: string | null
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;

  // Background is pure white (per request: "colores la hoja blanca y letras negras")
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Try loading company logo if provided
  let logoData: string | null = null;
  if (customLogoUrl) {
    logoData = await loadImageAsBase64(customLogoUrl);
  }

  let y = margin;

  // 1. HEADER SECTION
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, y, 22, 22);
    } catch {
      // fallback if format doesn't match
    }
  }

  const headerTextX = logoData ? margin + 25 : margin;

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Deep black/slate
  doc.text(VELKOR_COMPANY.businessName, headerTextX, y + 5);

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(VELKOR_COMPANY.subtitle.toUpperCase(), headerTextX, y + 10);

  // Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`R.U.C.: ${VELKOR_COMPANY.ruc}`, headerTextX, y + 14.5);
  doc.text(`Contacto / WhatsApp: ${VELKOR_COMPANY.phone} | Lima, Perú`, headerTextX, y + 18.5);
  doc.text(`Email: ${VELKOR_COMPANY.email}`, headerTextX, y + 22.5);

  // Right Side: Quotation Official Box (standard Peruvian proforma / cotización box)
  const boxWidth = 65;
  const boxHeight = 26;
  const boxX = pageWidth - margin - boxWidth;
  const boxY = y;

  doc.setDrawColor(30, 41, 59); // Crisp dark border
  doc.setLineWidth(0.6);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`R.U.C. N° ${VELKOR_COMPANY.ruc}`, boxX + boxWidth / 2, boxY + 6.5, { align: 'center' });

  // Cotización Highlight Ribbon
  doc.setFillColor(241, 245, 249);
  doc.rect(boxX + 0.3, boxY + 9, boxWidth - 0.6, 7.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('COTIZACIÓN', boxX + boxWidth / 2, boxY + 14.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199); // Blue or Black
  doc.text(quotation.quoteNumber || 'COT-0001', boxX + boxWidth / 2, boxY + 22, { align: 'center' });

  y += 30;

  // 2. CLIENT INFORMATION BOX
  const clientBoxHeight = 22;
  doc.setDrawColor(203, 213, 225); // Subtle border
  doc.setLineWidth(0.3);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), clientBoxHeight, 1.5, 1.5, 'FD');

  const col1X = margin + 4;
  const col2X = margin + 115;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('SEÑOR(ES):', col1X, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  const clientNameTruncated = doc.splitTextToSize(quotation.customerName || 'Cliente General', 100);
  doc.text(clientNameTruncated, col1X + 22, y + 5.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text(`${quotation.customerDocType || 'RUC/DNI'}:`, col1X, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(quotation.customerDocNumber || '-', col1X + 22, y + 11);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN:', col1X, y + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const addrText = quotation.customerAddress ? `${quotation.customerAddress} ${quotation.customerCity ? `(${quotation.customerCity})` : ''}` : 'Lima / Provincias';
  doc.text(doc.splitTextToSize(addrText, 95)[0], col1X + 22, y + 16.5);

  // Column 2: Date & Status
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA EMISIÓN:', col2X, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const formattedDate = quotation.date ? new Date(quotation.date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('es-PE');
  doc.text(formattedDate, col2X + 26, y + 5.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('VALIDEZ:', col2X, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${quotation.validityDays || 7} días calendario`, col2X + 26, y + 11);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TELÉFONO:', col2X, y + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(quotation.customerPhone || 'No especificado', col2X + 26, y + 16.5);

  y += clientBoxHeight + 5;

  // 3. ITEMS TABLE
  // Requirement: "nombre del producto , numero del orden del producto, codigo del producto, cantidad del procutos, precion unidad y precio x cantidad y finalemnte precio total de l acotizacion mas igv"
  const tableRows = quotation.items.map((item, index) => {
    const itemNumber = (index + 1).toString();
    const code = item.productCode || '-';
    const description = item.brand ? `${item.productName} [Marca: ${item.brand}]` : item.productName;
    const qtyText = `${item.quantity} ${item.unitType === 'cajas' ? 'cajas' : 'und.'}`;
    const unitPrice = `S/. ${item.unitPrice.toFixed(2)}`;
    const totalPrice = `S/. ${item.totalPrice.toFixed(2)}`;

    return [itemNumber, code, description, qtyText, unitPrice, totalPrice];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'CÓDIGO', 'DESCRIPCIÓN DEL REPUESTO / ACCESORIO', 'CANTIDAD', 'P. UNITARIO', 'IMPORTE']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8,
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    styles: {
      cellPadding: 2.2,
      overflow: 'linebreak'
    },
    didDrawPage: () => {
      // Footer page numbering
      const totalPages = doc.getNumberOfPages();
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${currentPage} de ${totalPages} — Velkor Importaciones S.A.C.`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }
  });

  // Get position where table ended
  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Check if we need to add a new page if too close to bottom
  if (finalY > pageHeight - 55) {
    doc.addPage();
    y = margin;
  } else {
    y = finalY;
  }

  // 4. TOTALS SUMMARY & AMOUNT IN WORDS
  const summaryBoxWidth = 72;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  // Amount in words (Son: ...)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const wordsText = numberToWords(quotation.total);
  doc.text(wordsText, margin, y + 4);

  // Commercial Terms & Banking info on left side
  const notesY = y + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CONDICIONES COMERCIALES Y PAGO:', margin, notesY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('• Cuentas Corrientes BCP / BBVA / Interbank a nombre de VELKOR IMPORTACIONES S.A.C.', margin, notesY + 4.5);
  doc.text('• Yape / Plin Corporativo disponible para confirmación rápida de pedidos.', margin, notesY + 8.5);
  doc.text('• Despachos diarios a agencias de transporte terrestre (Marvisur, Shalom, Flores) para provincias.', margin, notesY + 12.5);
  doc.text('• Precios sujetos a stock en almacén central Lima.', margin, notesY + 16.5);

  // Totals Box (Right Side)
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.rect(summaryBoxX, y, summaryBoxWidth, 24, 'D');

  const labelX = summaryBoxX + 3;
  const valX = summaryBoxX + summaryBoxWidth - 3;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('SUBTOTAL (Valor Venta):', labelX, y + 5.5);
  doc.text(`S/. ${quotation.subtotal.toFixed(2)}`, valX, y + 5.5, { align: 'right' });

  // IGV
  doc.text(`I.G.V. (18%):`, labelX, y + 11.5);
  doc.text(`S/. ${quotation.igvAmount.toFixed(2)}`, valX, y + 11.5, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX, y + 15, summaryBoxX + summaryBoxWidth, y + 15);

  // Total General
  doc.setFillColor(248, 250, 252);
  doc.rect(summaryBoxX + 0.3, y + 15.3, summaryBoxWidth - 0.6, 8.4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GENERAL:', labelX, y + 21);
  doc.text(`S/. ${quotation.total.toFixed(2)}`, valX, y + 21, { align: 'right' });

  // 5. SIGNATURE & STAMP BOX
  const sigY = y + 30;
  if (sigY < pageHeight - 20) {
    const sigLineX = pageWidth / 2 - 35;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(sigLineX, sigY + 12, sigLineX + 70, sigY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('VELKOR IMPORTACIONES S.A.C.', pageWidth / 2, sigY + 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Departamento de Cotizaciones & Ventas Mayoristas', pageWidth / 2, sigY + 20, { align: 'center' });
  }

  return doc;
}
