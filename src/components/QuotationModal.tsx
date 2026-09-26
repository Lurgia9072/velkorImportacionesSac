import React, { useState, useEffect, useMemo } from 'react';
import { Product, Quotation, QuotationItem, QuotationStatus } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  FileDown, 
  Send, 
  Check, 
  Calculator, 
  User, 
  CreditCard, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertCircle,
  FileText,
  Boxes,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { generateQuotationPdf, VELKOR_COMPANY } from '../utils/generateQuotationPdf';

interface QuotationModalProps {
  products: Product[];
  initialQuotation?: Quotation | null;
  logoUrl?: string | null;
  onClose: () => void;
  onSave: (quote: Omit<Quotation, 'id'>, id?: string) => Promise<void>;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  products,
  initialQuotation,
  logoUrl,
  onClose,
  onSave
}) => {
  // Client Info
  const [customerName, setCustomerName] = useState(initialQuotation?.customerName || '');
  const [customerDocType, setCustomerDocType] = useState<'RUC' | 'DNI' | 'CE'>(initialQuotation?.customerDocType || 'RUC');
  const [customerDocNumber, setCustomerDocNumber] = useState(initialQuotation?.customerDocNumber || '');
  const [customerPhone, setCustomerPhone] = useState(initialQuotation?.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(initialQuotation?.customerAddress || '');
  const [customerCity, setCustomerCity] = useState(initialQuotation?.customerCity || 'Lima');
  
  // Quote Meta
  const [quoteNumber, setQuoteNumber] = useState(initialQuotation?.quoteNumber || '');
  const [date, setDate] = useState(initialQuotation?.date || new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(initialQuotation?.validityDays || 7);
  const [status, setStatus] = useState<QuotationStatus>(initialQuotation?.status || 'Pendiente');
  const [notes, setNotes] = useState(initialQuotation?.notes || '');
  const [includeIgv, setIncludeIgv] = useState<boolean>(initialQuotation?.includeIgv ?? true);

  // Items
  const [items, setItems] = useState<QuotationItem[]>(initialQuotation?.items || []);

  // Catalog Search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);

  // Loading/saving state
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-generate Quote Number if new
  useEffect(() => {
    if (!initialQuotation && !quoteNumber) {
      const year = new Date().getFullYear();
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      setQuoteNumber(`VK-COT-${year}-${randomSeq}`);
    }
  }, [initialQuotation, quoteNumber]);

  // Catalog filtered products
  const matchingProducts = useMemo(() => {
    if (!catalogSearch.trim()) return [];
    const q = catalogSearch.toLowerCase().trim();
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, catalogSearch]);

  // Recalculate totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }, [items]);

  const igvRate = 0.18;
  const igvAmount = useMemo(() => {
    return includeIgv ? subtotal * igvRate : 0;
  }, [subtotal, includeIgv]);

  const total = useMemo(() => {
    return subtotal + igvAmount;
  }, [subtotal, igvAmount]);

  // Add product from catalog
  const handleAddProductFromCatalog = (product: Product) => {
    const unitPrice = product.wholesalePrice || product.price || 0;
    const defaultQty = product.unitsPerBox ? 1 : 1;
    const newItem: QuotationItem = {
      itemNumber: items.length + 1,
      productId: product.id,
      productCode: product.code || `VK-${items.length + 1}`,
      productName: product.name,
      brand: product.brand || '',
      quantity: defaultQty,
      unitType: product.unitsPerBox ? 'cajas' : 'unidades',
      unitsPerBox: product.unitsPerBox,
      unitPrice: unitPrice,
      totalPrice: defaultQty * unitPrice
    };

    setItems(prev => [...prev, newItem]);
    setCatalogSearch('');
    setShowCatalogDropdown(false);
  };

  // Add custom manual item
  const handleAddCustomItem = () => {
    const newItem: QuotationItem = {
      itemNumber: items.length + 1,
      productCode: `VK-REP-${items.length + 1}`,
      productName: 'Repuesto / Accesorio de Moto',
      brand: 'Generico',
      quantity: 1,
      unitType: 'unidades',
      unitPrice: 0,
      totalPrice: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Math.max(1, Number(value) || 1) : item.quantity;
        const price = field === 'unitPrice' ? Math.max(0, Number(value) || 0) : item.unitPrice;
        updated.quantity = qty;
        updated.unitPrice = price;
        updated.totalPrice = qty * price;
      }
      return updated;
    }));
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-index itemNumber
      return filtered.map((item, i) => ({ ...item, itemNumber: i + 1 }));
    });
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      setErrorMessage('Por favor ingrese el Nombre o Razón Social del cliente.');
      return false;
    }
    if (!customerDocNumber.trim()) {
      setErrorMessage(`Por favor ingrese el número de ${customerDocType} del cliente.`);
      return false;
    }
    if (items.length === 0) {
      setErrorMessage('Debe agregar al menos un producto a la cotización.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const buildQuotationData = (): Omit<Quotation, 'id'> => {
    return {
      quoteNumber: quoteNumber || `VK-COT-${Date.now()}`,
      date,
      validityDays: Number(validityDays) || 7,
      customerName: customerName.trim(),
      customerDocType,
      customerDocNumber: customerDocNumber.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerCity: customerCity.trim(),
      items,
      subtotal,
      includeIgv,
      igvRate,
      igvAmount,
      total,
      status,
      notes: notes.trim(),
      createdAt: initialQuotation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const handleSaveQuotation = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const data = buildQuotationData();
      await onSave(data, initialQuotation?.id);
      onClose();
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      setErrorMessage('Error al guardar la cotización en Firestore: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!validateForm()) return;
    setIsGeneratingPdf(true);
    try {
      const data = buildQuotationData();
      const currentQuotation: Quotation = {
        ...data,
        id: initialQuotation?.id || 'temp'
      };
      const doc = await generateQuotationPdf(currentQuotation, logoUrl);
      const fileName = `Cotizacion_VELKOR_${currentQuotation.quoteNumber}_${currentQuotation.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el PDF: ' + (err.message || ''));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!validateForm()) return;
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;

    let itemsList = '';
    items.forEach((item, idx) => {
      const codeStr = item.productCode ? ` (Cód: ${item.productCode})` : '';
      itemsList += `${idx + 1}. *${item.productName}*${codeStr}\n   Cant: ${item.quantity} ${item.unitType || 'und.'} x S/. ${item.unitPrice.toFixed(2)} = *S/. ${item.totalPrice.toFixed(2)}*\n\n`;
    });

    const msg = `*COTIZACIÓN OFICIAL — VELKOR IMPORTACIONES S.A.C.*\n` +
      `*RUC:* 20616309146 | Mayorista de Repuestos de Motos\n\n` +
      `Estimado(a) *${customerName}* (${customerDocType}: ${customerDocNumber}), le compartimos el detalle de su cotización:\n\n` +
      `*N° Cotización:* ${quoteNumber}\n` +
      `*Fecha:* ${date}\n` +
      `*Validez:* ${validityDays} días\n\n` +
      `*DETALLE DE REPUESTOS:*\n${itemsList}` +
      `*SUBTOTAL:* S/. ${subtotal.toFixed(2)}\n` +
      `*I.G.V. (18%):* S/. ${igvAmount.toFixed(2)}\n` +
      `*TOTAL GENERAL:* S/. ${total.toFixed(2)}\n\n` +
      `_Precios y disponibilidad sujetos a confirmación. Cuentas a nombre de VELKOR IMPORTACIONES S.A.C._\n` +
      `Para coordinar el pago o despacho, responda a este mensaje.`;

    const url = waPhone 
      ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  return (
    <div id="quotation-modal-overlay" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div 
        id="quotation-modal-card" 
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base tracking-tight text-white flex items-center gap-2">
                {initialQuotation ? 'Editar Cotización' : 'Nueva Cotización Formal'}
                <span className="text-emerald-400 font-mono text-xs bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {quoteNumber || 'VK-COT'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                VELKOR IMPORTACIONES S.A.C. — RUC: 20616309146
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800 flex-1">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. CLIENT & QUOTE HEADER DATA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-xs font-mono font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Datos del Cliente & Proforma
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Campos marcados con (*) son obligatorios
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Customer Name */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cliente o Razón Social *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Moto Repuestos Los Andes E.I.R.L. / Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Doc Type & Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tipo Doc. *
                </label>
                <div className="flex gap-1">
                  <select
                    value={customerDocType}
                    onChange={(e) => setCustomerDocType(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                  </select>
                  <input
                    type="text"
                    placeholder={customerDocType === 'RUC' ? '20XXXXXXXXX (11 dígitos)' : '8 dígitos'}
                    value={customerDocNumber}
                    onChange={(e) => setCustomerDocNumber(e.target.value)}
                    className="flex-1 min-w-0 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Celular / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="970329450"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Address / City */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Dirección / Destino
                </label>
                <input
                  type="text"
                  placeholder="Ej: Av. Aviación 1234, La Victoria"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Region / City */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ciudad / Región
                </label>
                <input
                  type="text"
                  placeholder="Lima, Cusco, Arequipa..."
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Validity Days */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Validez (Días)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Workflow status indicator */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-xs">Estado de la Cotización:</span>
                <select
                  value={status === 'Pagada' ? 'Pagado' : status === 'Empacar pedido' ? 'Empacando Pedido' : status}
                  onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                  className="bg-white border border-slate-300 font-mono font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-hidden focus:border-emerald-500 text-slate-800"
                >
                  <option value="Pendiente">🟡 Pendiente</option>
                  <option value="Pagado">🟢 Pagado</option>
                  <option value="Empacando Pedido">📦 Empacando Pedido</option>
                  <option value="Despachado">🚚 Despachado</option>
                  <option value="Cancelada">⚪ Cancelada</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeIgv}
                    onChange={(e) => setIncludeIgv(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Aplicar I.G.V. (18%)</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. CATALOG PRODUCT SEARCH & PICKER */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                Productos / Repuestos Cotizados ({items.length})
              </span>

              <button
                type="button"
                onClick={handleAddCustomItem}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-300 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Item Manual
              </button>
            </div>

            {/* Quick Catalog Search Bar */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en el catálogo de Velkor por código (ej: VK-...) o nombre de repuesto..."
                  value={catalogSearch}
                  onFocus={() => setShowCatalogDropdown(true)}
                  onChange={(e) => {
                    setCatalogSearch(e.target.value);
                    setShowCatalogDropdown(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showCatalogDropdown && matchingProducts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {matchingProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddProductFromCatalog(p)}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-8 h-8 object-cover rounded bg-slate-100 shrink-0 border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 shrink-0 flex items-center justify-center font-mono text-[9px] text-slate-400">VK</div>
                        )}
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Cód: <span className="font-bold text-slate-700">{p.code || 'N/A'}</span> | Marca: {p.brand || 'Velkor'} {p.unitsPerBox ? `| ${p.unitsPerBox} u/caja` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-black text-emerald-600 block">
                          S/. {(p.wholesalePrice || p.price || 0).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Click para añadir</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. ITEMS TABLE (EXACTLY AS SPECIFIED BY USER) */}
            {/* "un pdf que se vea: nombre del producto, numero del orden del producto, codigo del producto, cantidad del procutos, precion unidad y precio x cantidad y finalemnte precio total de l acotizacion mas igv" */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No hay productos agregados a la cotización</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Busca repuestos en la barra superior o presiona "Agregar Item Manual" para armar la lista solicitada por el cliente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono font-bold text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3 w-28">Código</th>
                        <th className="py-2.5 px-3">Nombre del Producto / Repuesto</th>
                        <th className="py-2.5 px-3 w-24">Unidad</th>
                        <th className="py-2.5 px-3 w-24 text-center">Cantidad</th>
                        <th className="py-2.5 px-3 w-28 text-right">Precio Unit. (S/.)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Precio x Cant. (S/.)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                          {/* Order Number */}
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">
                            {item.itemNumber}
                          </td>

                          {/* Product Code */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.productCode}
                              onChange={(e) => handleUpdateItem(index, 'productCode', e.target.value)}
                              placeholder="VK-..."
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:bg-white focus:border-emerald-500"
                            />
                          </td>

                          {/* Product Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleUpdateItem(index, 'productName', e.target.value)}
                              placeholder="Descripción del repuesto"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:bg-white focus:border-emerald-500"
                            />
                          </td>

                          {/* Unit Type */}
                          <td className="py-2 px-3">
                            <select
                              value={item.unitType || 'unidades'}
                              onChange={(e) => handleUpdateItem(index, 'unitType', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-mono focus:bg-white focus:border-emerald-500"
                            >
                              <option value="unidades">Unidades</option>
                              <option value="cajas">Cajas</option>
                            </select>
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                                className="w-16 text-center bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:bg-white focus:border-emerald-500"
                              />
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-400 font-mono">S/.</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:bg-white focus:border-emerald-500"
                              />
                            </div>
                          </td>

                          {/* Total Price */}
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                            S/. {item.totalPrice.toFixed(2)}
                          </td>

                          {/* Delete Item */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Quitar repuesto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 4. TOTALS SUMMARY & NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-2">
            {/* Notes & Commercial Terms */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Observaciones / Condiciones Comerciales para el PDF
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Entrega inmediata en almacén central Lima. Despacho a provincia vía Agencia Shalom / Marvisur por cuenta del cliente."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 font-mono">
                * En el PDF se detallan automáticamente los datos de Velkor Importaciones S.A.C., RUC 20616309146 y cuentas bancarias.
              </p>
            </div>

            {/* Calculations Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>SUBTOTAL (Valor Venta):</span>
                <span className="font-bold text-slate-800">S/. {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  I.G.V. (18%):
                  {!includeIgv && <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 rounded">(No aplicado)</span>}
                </span>
                <span className="font-bold text-slate-800">S/. {igvAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                <span>TOTAL GENERAL:</span>
                <span className="text-emerald-700 text-base">S/. {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Download PDF button */}
            <button
              type="button"
              id="btn-download-quote-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || items.length === 0}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-mono font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-2xs hover:border-slate-400 disabled:opacity-50"
            >
              <FileDown className={`w-4 h-4 text-rose-600 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
              <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              id="btn-share-quote-wa"
              onClick={handleShareWhatsApp}
              disabled={items.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              id="btn-save-quote"
              onClick={handleSaveQuotation}
              disabled={isSaving || items.length === 0}
              className="bg-slate-900 hover:bg-black text-white font-mono font-black text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cotización'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
