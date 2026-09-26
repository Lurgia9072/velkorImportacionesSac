import React, { useState, useEffect, useMemo } from 'react';
import { Product, Quotation, QuotationStatus } from '../types';
import { 
  getQuotations, 
  createQuotation, 
  updateQuotation, 
  deleteQuotation 
} from '../firebase';
import { QuotationModal } from './QuotationModal';
import { generateQuotationPdf, VELKOR_COMPANY } from '../utils/generateQuotationPdf';
import { 
  FileText, 
  Plus, 
  Search, 
  FileDown, 
  Send, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  Trash2, 
  Edit3, 
  Eye, 
  AlertCircle,
  RefreshCw,
  Boxes,
  DollarSign,
  ArrowRight,
  Printer,
  X
} from 'lucide-react';

interface QuotationsManagerProps {
  products: Product[];
  logoUrl?: string | null;
}

export const QuotationsManager: React.FC<QuotationsManagerProps> = ({ products, logoUrl }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todas');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Preview Modal
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // PDF Generation Tracker
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const data = await getQuotations();
      setQuotations(data);
    } catch (err) {
      console.error('Error loading quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // Status filter
      if (filterStatus !== 'Todas' && q.status !== filterStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesClient = (q.customerName || '').toLowerCase().includes(query);
        const matchesDoc = (q.customerDocNumber || '').toLowerCase().includes(query);
        const matchesQuoteNum = (q.quoteNumber || '').toLowerCase().includes(query);
        const matchesItems = q.items.some(it => 
          (it.productName || '').toLowerCase().includes(query) || 
          (it.productCode || '').toLowerCase().includes(query)
        );
        return matchesClient || matchesDoc || matchesQuoteNum || matchesItems;
      }
      return true;
    });
  }, [quotations, filterStatus, searchQuery]);

  // Status counts for pipeline metrics
  const stats = useMemo(() => {
    const total = quotations.length;
    const pending = quotations.filter(q => q.status === 'Pendiente').length;
    const sent = quotations.filter(q => q.status === 'Enviada (Falta pagar)').length;
    const paid = quotations.filter(q => q.status === 'Pagada').length;
    const packing = quotations.filter(q => q.status === 'Empacar pedido').length;
    const dispatched = quotations.filter(q => q.status === 'Despachado').length;

    const totalQuotedAmount = quotations.reduce((sum, q) => sum + (q.total || 0), 0);
    const paidAmount = quotations
      .filter(q => q.status === 'Pagada' || q.status === 'Empacar pedido' || q.status === 'Despachado')
      .reduce((sum, q) => sum + (q.total || 0), 0);

    return { total, pending, sent, paid, packing, dispatched, totalQuotedAmount, paidAmount };
  }, [quotations]);

  // Handle Save (Create or Update)
  const handleSaveQuotation = async (quoteData: Omit<Quotation, 'id'>, id?: string) => {
    if (id) {
      await updateQuotation(id, quoteData);
    } else {
      await createQuotation(quoteData);
    }
    await loadQuotations();
  };

  // Quick 1-click status change according to requested workflow
  // "bede el admin seleccionar cotizacion pagada o prendiente
  // cotizacion enviaa al cliente y falta pagar o pagada
  // y esa cotizacion debe pasar a empacar predido despues de pagado
  // asi se debe trabajar en orden"
  const handleStatusChange = async (quotation: Quotation, nextStatus: QuotationStatus) => {
    if (!quotation.id) return;
    try {
      const updateData: Partial<Quotation> = { status: nextStatus };
      if (nextStatus === 'Pagada') {
        updateData.paidAt = new Date().toISOString();
      } else if (nextStatus === 'Empacar pedido') {
        updateData.packedAt = new Date().toISOString();
      } else if (nextStatus === 'Despachado') {
        updateData.dispatchedAt = new Date().toISOString();
      }

      await updateQuotation(quotation.id, updateData);
      setQuotations(prev => prev.map(q => q.id === quotation.id ? { ...q, ...updateData } : q));
    } catch (err) {
      console.error('Error changing status:', err);
      alert('Error al actualizar el estado de la cotización');
    }
  };

  // Handle Delete
  const handleDeleteQuotation = async (id: string, quoteNumber: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la cotización ${quoteNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteQuotation(id);
      setQuotations(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting quotation:', err);
      alert('Error al eliminar la cotización');
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async (quotation: Quotation) => {
    setGeneratingPdfId(quotation.id || 'current');
    try {
      const doc = await generateQuotationPdf(quotation, logoUrl);
      const cleanCustomerName = (quotation.customerName || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Cotizacion_VELKOR_${quotation.quoteNumber}_${cleanCustomerName}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Error al generar el PDF de la cotización');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Handle WhatsApp
  const handleShareWhatsApp = (quotation: Quotation) => {
    const cleanPhone = (quotation.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;

    let itemsList = '';
    quotation.items.forEach((item, idx) => {
      const codeStr = item.productCode ? ` (Cód: ${item.productCode})` : '';
      itemsList += `${idx + 1}. *${item.productName}*${codeStr}\n   Cant: ${item.quantity} ${item.unitType || 'und.'} x S/. ${item.unitPrice.toFixed(2)} = *S/. ${item.totalPrice.toFixed(2)}*\n\n`;
    });

    const msg = `*COTIZACIÓN OFICIAL — VELKOR IMPORTACIONES S.A.C.*\n` +
      `*RUC:* 20616309146 | Mayorista de Repuestos y Accesorios para Motos\n\n` +
      `Estimado(a) *${quotation.customerName}* (${quotation.customerDocType}: ${quotation.customerDocNumber}), le adjuntamos su cotización:\n\n` +
      `*N° Cotización:* ${quotation.quoteNumber}\n` +
      `*Fecha:* ${quotation.date}\n` +
      `*Validez:* ${quotation.validityDays} días\n\n` +
      `*DETALLE DE PRODUCTOS:*\n${itemsList}` +
      `*SUBTOTAL:* S/. ${quotation.subtotal.toFixed(2)}\n` +
      `*I.G.V. (18%):* S/. ${quotation.igvAmount.toFixed(2)}\n` +
      `*TOTAL GENERAL:* S/. ${quotation.total.toFixed(2)}\n\n` +
      `_Precios y disponibilidad garantizados por el tiempo de validez. Cuentas BCP / BBVA / Interbank a nombre de VELKOR IMPORTACIONES S.A.C._\n` +
      `Para coordinar el pago o despacho, responda a este mensaje.`;

    const url = waPhone 
      ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  // Render Status Badge
  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Pendiente':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-500" />
            Pendiente
          </span>
        );
      case 'Enviada (Falta pagar)':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            <Send className="w-3 h-3 text-blue-500" />
            Enviada (Falta pagar)
          </span>
        );
      case 'Pagada':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Pagada
          </span>
        );
      case 'Empacar pedido':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            <Package className="w-3 h-3 text-purple-500" />
            En Empaque
          </span>
        );
      case 'Despachado':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            <Truck className="w-3 h-3 text-emerald-400" />
            Despachado
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP PIPELINE METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Quotes */}
        <div 
          onClick={() => setFilterStatus('Todas')}
          className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Todas' ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Total Cotizadas</span>
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xl font-display font-black text-slate-900 mt-1">{stats.total}</p>
          <p className="text-[10px] font-mono text-slate-500 truncate">S/. {stats.totalQuotedAmount.toFixed(2)}</p>
        </div>

        {/* 1. Pendientes */}
        <div 
          onClick={() => setFilterStatus('Pendiente')}
          className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Pendiente' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-700 font-bold">1. Pendientes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-display font-black text-amber-600 mt-1">{stats.pending}</p>
          <p className="text-[10px] font-mono text-slate-400">Borradores por enviar</p>
        </div>

        {/* 2. Enviadas (Falta pagar) */}
        <div 
          onClick={() => setFilterStatus('Enviada (Falta pagar)')}
          className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Enviada (Falta pagar)' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-blue-700 font-bold">2. Enviadas</span>
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-display font-black text-blue-600 mt-1">{stats.sent}</p>
          <p className="text-[10px] font-mono text-slate-400">Falta pagar</p>
        </div>

        {/* 3. Pagadas */}
        <div 
          onClick={() => setFilterStatus('Pagada')}
          className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Pagada' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold">3. Pagadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-display font-black text-emerald-600 mt-1">{stats.paid}</p>
          <p className="text-[10px] font-mono text-emerald-700 truncate font-bold">Abono verificado</p>
        </div>

        {/* 4. Empacar Pedido */}
        <div 
          onClick={() => setFilterStatus('Empacar pedido')}
          className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Empacar pedido' ? 'border-purple-500 ring-2 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-purple-700 font-bold">4. Empacar</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-display font-black text-purple-600 mt-1">{stats.packing}</p>
          <p className="text-[10px] font-mono text-slate-400">En almacén</p>
        </div>

        {/* 5. Despachado */}
        <div 
          onClick={() => setFilterStatus('Despachado')}
          className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Despachado' ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-800 font-bold">5. Despachado</span>
            <Truck className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-xl font-display font-black text-slate-900 mt-1">{stats.dispatched}</p>
          <p className="text-[10px] font-mono text-slate-400">Enviado por agencia</p>
        </div>
      </div>

      {/* 2. ACTION CONTROLS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cotización por cliente, RUC, DNI, N° de cotización o repuesto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Dropdown / Tabs */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="Todas">Filtrar: Todas ({stats.total})</option>
            <option value="Pendiente">🟡 1. Pendientes ({stats.pending})</option>
            <option value="Enviada (Falta pagar)">🔵 2. Enviadas (Falta pagar) ({stats.sent})</option>
            <option value="Pagada">🟢 3. Pagadas ({stats.paid})</option>
            <option value="Empacar pedido">📦 4. Empacar Pedido ({stats.packing})</option>
            <option value="Despachado">🚚 5. Despachado ({stats.dispatched})</option>
          </select>

          <button
            onClick={loadQuotations}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* New Quotation Button */}
          <button
            id="btn-new-quotation"
            onClick={() => {
              setEditingQuotation(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-450 active:scale-95 text-slate-950 font-display font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Cotización</span>
          </button>
        </div>
      </div>

      {/* 3. WORKFLOW ORDER BANNER (Guía de trabajo ordenado) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px]">
            FLUJO DE TRABAJO VELKOR
          </span>
          <span className="text-slate-300">
            Trabajo en orden: <b>1. Cotizar</b> ➡️ <b>2. Enviar</b> ➡️ <b>3. Pagada</b> ➡️ <b>4. Empacar Almacén</b> ➡️ <b>5. Despachar</b>
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          RUC Empresa: <span className="text-white font-bold">{VELKOR_COMPANY.ruc}</span>
        </span>
      </div>

      {/* 4. QUOTATIONS LIST / CARDS */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-xs font-mono">Cargando cotizaciones desde Firestore...</p>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3 shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="font-display font-black text-slate-700 text-base">No se encontraron cotizaciones</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? 'No hay cotizaciones que coincidan con la búsqueda ingresada.' 
              : 'Aún no se han registrado cotizaciones en este estado. Crea una nueva proforma para iniciar el flujo de ventas.'}
          </p>
          <button
            onClick={() => {
              setEditingQuotation(null);
              setIsModalOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-2 bg-emerald-500 text-slate-950 font-mono font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-400 transition-all"
          >
            <Plus className="w-4 h-4" />
            Crear Primera Cotización
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuotations.map((q) => {
            const isGeneratingThisPdf = generatingPdfId === q.id;

            return (
              <div 
                key={q.id} 
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                {/* Upper line: Quote ID, date, customer, status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {q.quoteNumber}
                    </span>
                    {getStatusBadge(q.status)}
                    <span className="text-[11px] font-mono text-slate-400">
                      Emisión: {q.date || new Date(q.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs text-slate-500 font-mono">Total Cotizado:</span>
                    <span className="text-base font-display font-black text-emerald-600 font-mono">
                      S/. {q.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Middle info: Customer & Summary of products */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Customer details */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Cliente / Razón Social</p>
                    <p className="font-bold text-slate-900 text-sm truncate">{q.customerName}</p>
                    <p className="font-mono text-slate-600">
                      <span className="font-bold">{q.customerDocType}:</span> {q.customerDocNumber}
                    </p>
                    {q.customerPhone && (
                      <p className="font-mono text-slate-500">
                        📞 Cel: {q.customerPhone}
                      </p>
                    )}
                    {q.customerAddress && (
                      <p className="text-slate-500 truncate">
                        📍 {q.customerAddress} {q.customerCity ? `(${q.customerCity})` : ''}
                      </p>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Repuestos Cotizados ({q.items.length})
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        Subtotal: S/. {q.subtotal.toFixed(2)} | IGV: S/. {q.igvAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 max-h-24 overflow-y-auto divide-y divide-slate-200/50">
                      {q.items.map((it, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between text-[11px] gap-2">
                          <span className="truncate font-medium text-slate-700">
                            <b>{it.itemNumber}.</b> {it.productCode ? `[${it.productCode}] ` : ''}{it.productName}
                          </span>
                          <span className="font-mono font-bold text-slate-800 shrink-0">
                            {it.quantity} {it.unitType === 'cajas' ? 'cajas' : 'und.'} x S/. {it.unitPrice.toFixed(2)} = S/. {it.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom line: WORKFLOW PROGRESSION BUTTONS + ACTIONS */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  
                  {/* WORKFLOW ADVANCEMENT BUTTONS (Orderly progression as required) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* If Pendiente -> Next is 'Enviada (Falta pagar)' */}
                    {q.status === 'Pendiente' && (
                      <button
                        onClick={() => handleStatusChange(q, 'Enviada (Falta pagar)')}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Marcar como Enviada al Cliente</span>
                      </button>
                    )}

                    {/* If Enviada (Falta pagar) -> Next is 'Pagada' */}
                    {q.status === 'Enviada (Falta pagar)' && (
                      <button
                        onClick={() => handleStatusChange(q, 'Pagada')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar como Pagada (Abono Recibido)</span>
                      </button>
                    )}

                    {/* If Pagada -> Next is 'Empacar pedido' (As requested: "y esa cotizacion debe pasar a empacar predido despues de pagado") */}
                    {q.status === 'Pagada' && (
                      <button
                        onClick={() => handleStatusChange(q, 'Empacar pedido')}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Pasar a Empacar Pedido (Almacén)</span>
                      </button>
                    )}

                    {/* If Empacar pedido -> Next is 'Despachado' */}
                    {q.status === 'Empacar pedido' && (
                      <button
                        onClick={() => handleStatusChange(q, 'Despachado')}
                        className="bg-slate-900 hover:bg-black text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Marcar como Despachado / Enviado</span>
                      </button>
                    )}

                    {/* Completed indicator */}
                    {q.status === 'Despachado' && (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Pedido Completado y Despachado
                      </span>
                    )}

                    {/* Quick status selector dropdown if admin wants to force any state */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <span>Cambiar:</span>
                      <select
                        value={q.status}
                        onChange={(e) => handleStatusChange(q, e.target.value as QuotationStatus)}
                        className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[11px] font-mono font-bold focus:outline-hidden"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Enviada (Falta pagar)">Enviada (Falta pagar)</option>
                        <option value="Pagada">Pagada</option>
                        <option value="Empacar pedido">Empacar pedido</option>
                        <option value="Despachado">Despachado</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>

                  {/* ACTION ICONS: PDF, WhatsApp, Edit, Delete */}
                  <div className="flex items-center gap-2">
                    {/* Download PDF button (As requested: "y descarcar en pdf la lista de products cotiazados") */}
                    <button
                      id={`btn-download-pdf-${q.id}`}
                      onClick={() => handleDownloadPdf(q)}
                      disabled={isGeneratingThisPdf}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-mono font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                      title="Descargar PDF en hoja blanca y letras negras con logo"
                    >
                      <FileDown className={`w-3.5 h-3.5 ${isGeneratingThisPdf ? 'animate-bounce' : ''}`} />
                      <span>{isGeneratingThisPdf ? 'Generando...' : 'Descargar PDF'}</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      id={`btn-wa-${q.id}`}
                      onClick={() => handleShareWhatsApp(q)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                      title="Enviar resumen por WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    {/* Preview in Modal */}
                    <button
                      onClick={() => setPreviewQuotation(q)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors border border-slate-200"
                      title="Vista previa e imprimir"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      id={`btn-edit-quote-${q.id}`}
                      onClick={() => {
                        setEditingQuotation(q);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors border border-slate-200"
                      title="Editar cotización"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      id={`btn-delete-quote-${q.id}`}
                      onClick={() => handleDeleteQuotation(q.id!, q.quoteNumber)}
                      className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-slate-200"
                      title="Eliminar cotización"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CREATE / EDIT QUOTATION MODAL */}
      {isModalOpen && (
        <QuotationModal
          products={products}
          initialQuotation={editingQuotation}
          logoUrl={logoUrl}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuotation(null);
          }}
          onSave={handleSaveQuotation}
        />
      )}

      {/* 6. CLEAN PRINT / PREVIEW MODAL */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-display font-black text-sm">Vista Previa — {previewQuotation.quoteNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(previewQuotation)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Descargar PDF
                </button>
                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable White Sheet Document with Crisp Black Letters */}
            <div className="p-6 md:p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
                  )}
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 leading-none">
                      {VELKOR_COMPANY.businessName}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 uppercase mt-1">
                      {VELKOR_COMPANY.subtitle}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      R.U.C. {VELKOR_COMPANY.ruc} | WhatsApp: {VELKOR_COMPANY.phone}
                    </p>
                  </div>
                </div>

                <div className="border-2 border-slate-900 rounded-lg p-3 text-center min-w-[180px]">
                  <p className="text-xs font-bold font-mono">R.U.C. N° {VELKOR_COMPANY.ruc}</p>
                  <p className="text-sm font-black bg-slate-100 py-1 my-1">COTIZACIÓN</p>
                  <p className="text-xs font-bold font-mono text-emerald-700">{previewQuotation.quoteNumber}</p>
                </div>
              </div>

              {/* Customer Box */}
              <div className="border border-slate-300 rounded-lg p-3 text-xs grid grid-cols-2 gap-2 bg-slate-50/50">
                <div>
                  <span className="font-bold text-slate-500">SEÑOR(ES): </span>
                  <span className="font-bold text-slate-900">{previewQuotation.customerName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">FECHA: </span>
                  <span className="font-mono">{previewQuotation.date}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">{previewQuotation.customerDocType}: </span>
                  <span className="font-mono">{previewQuotation.customerDocNumber}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">VALIDEZ: </span>
                  <span className="font-mono">{previewQuotation.validityDays} días</span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-center">
                    <tr>
                      <th className="p-2 w-10">#</th>
                      <th className="p-2 w-28">Código</th>
                      <th className="p-2 text-left">Descripción del Repuesto</th>
                      <th className="p-2 w-24">Cantidad</th>
                      <th className="p-2 w-24 text-right">P. Unitario</th>
                      <th className="p-2 w-24 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewQuotation.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-center font-mono text-slate-500">{it.itemNumber}</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700">{it.productCode || '-'}</td>
                        <td className="p-2 text-slate-900">{it.productName}</td>
                        <td className="p-2 text-center font-mono font-bold">{it.quantity} {it.unitType || 'und.'}</td>
                        <td className="p-2 text-right font-mono">S/. {it.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">S/. {it.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-bold">S/. {previewQuotation.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">I.G.V. (18%):</span>
                    <span className="font-bold">S/. {previewQuotation.igvAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-sm text-slate-900">
                    <span>TOTAL GENERAL:</span>
                    <span className="text-emerald-700">S/. {previewQuotation.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
