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
  X,
  ChevronDown,
  Check
} from 'lucide-react';

interface QuotationsManagerProps {
  products: Product[];
  logoUrl?: string | null;
  initialSearchQuery?: string;
  initialFilterStatus?: string;
  onClearInitialSearch?: () => void;
}

// Normalizer to ensure consistent statuses across existing and new data
export const normalizeStatus = (status?: string): QuotationStatus => {
  if (!status) return 'Pendiente';
  if (status === 'Pagada' || status === 'Pagado') return 'Pagado';
  if (status === 'Empacar pedido' || status === 'Empacando Pedido') return 'Empacando Pedido';
  if (status === 'Despachado') return 'Despachado';
  if (status === 'Entregado') return 'Entregado';
  if (status === 'Cancelada' || status === 'No Concretada' || status === 'No compró') return 'No Concretada';
  if (status === 'Enviada (Falta pagar)') return 'Pendiente';
  return status as QuotationStatus;
};

export const QuotationsManager: React.FC<QuotationsManagerProps> = ({ 
  products, 
  logoUrl,
  initialSearchQuery,
  initialFilterStatus,
  onClearInitialSearch
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus || 'Todas');

  // Status tracking states
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusSuccessId, setStatusSuccessId] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Cancellation modal for "No Compró / No Concretada"
  const [cancellingQuotation, setCancellingQuotation] = useState<Quotation | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('Precio elevado (Muy caro)');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Preview Modal
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // PDF Generation Tracker
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Sync initialSearchQuery if passed from registered orders
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      setFilterStatus('Todas');
    }
  }, [initialSearchQuery]);

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

  // Filtered quotations by normalized status & search query
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // Status filter
      if (filterStatus !== 'Todas') {
        if (normalizeStatus(q.status) !== filterStatus) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesClient = (q.customerName || '').toLowerCase().includes(query);
        const matchesDoc = (q.customerDocNumber || '').toLowerCase().includes(query);
        const matchesQuoteNum = (q.quoteNumber || '').toLowerCase().includes(query);
        const matchesReason = (q.noPurchaseReason || '').toLowerCase().includes(query);
        const matchesItems = q.items.some(it => 
          (it.productName || '').toLowerCase().includes(query) || 
          (it.productCode || '').toLowerCase().includes(query)
        );
        return matchesClient || matchesDoc || matchesQuoteNum || matchesReason || matchesItems;
      }
      return true;
    });
  }, [quotations, filterStatus, searchQuery]);

  // Status counts for pipeline metrics: 'Pendiente', 'Pagado', 'Empacando Pedido', 'Despachado', 'Entregado', 'No Concretada'
  const stats = useMemo(() => {
    const total = quotations.length;
    const pending = quotations.filter(q => normalizeStatus(q.status) === 'Pendiente').length;
    const paid = quotations.filter(q => normalizeStatus(q.status) === 'Pagado').length;
    const packing = quotations.filter(q => normalizeStatus(q.status) === 'Empacando Pedido').length;
    const dispatched = quotations.filter(q => normalizeStatus(q.status) === 'Despachado').length;
    const delivered = quotations.filter(q => normalizeStatus(q.status) === 'Entregado').length;
    const unconcluded = quotations.filter(q => normalizeStatus(q.status) === 'No Concretada').length;

    const totalQuotedAmount = quotations.reduce((sum, q) => sum + (q.total || 0), 0);
    const paidAmount = quotations
      .filter(q => {
        const s = normalizeStatus(q.status);
        return s === 'Pagado' || s === 'Empacando Pedido' || s === 'Despachado' || s === 'Entregado';
      })
      .reduce((sum, q) => sum + (q.total || 0), 0);

    return { total, pending, paid, packing, dispatched, delivered, unconcluded, totalQuotedAmount, paidAmount };
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

  // Status Change via Dropdown or Quick Step Buttons
  // Supported flow: 'Pendiente' -> 'Pagado' -> 'Empacando Pedido' -> 'Despachado' -> 'Entregado' (or 'No Concretada')
  const handleStatusChange = async (quotation: Quotation, nextStatus: QuotationStatus, reason?: string) => {
    if (!quotation.id) return;
    
    // If transitioning to No Concretada without a reason, open the cancellation modal
    if (nextStatus === 'No Concretada' && !reason) {
      setCancellingQuotation(quotation);
      setCancelReasonInput('Precio elevado (Muy caro)');
      setCustomCancelReason('');
      return;
    }

    try {
      setUpdatingStatusId(quotation.id);
      const normalizedNext = normalizeStatus(nextStatus);
      const updateData: Partial<Quotation> = { status: normalizedNext };

      if (normalizedNext === 'Pagado') {
        updateData.paidAt = new Date().toISOString();
      } else if (normalizedNext === 'Empacando Pedido') {
        updateData.packedAt = new Date().toISOString();
      } else if (normalizedNext === 'Despachado') {
        updateData.dispatchedAt = new Date().toISOString();
      } else if (normalizedNext === 'Entregado') {
        updateData.deliveredAt = new Date().toISOString();
      } else if (normalizedNext === 'No Concretada') {
        updateData.noPurchaseReason = reason || cancelReasonInput || 'No especificado';
      }

      await updateQuotation(quotation.id, updateData);
      setQuotations(prev => prev.map(q => q.id === quotation.id ? { ...q, ...updateData } : q));
      
      setStatusSuccessId(quotation.id);
      setStatusNotification(`Cotización ${quotation.quoteNumber}: estado cambiado a "${normalizedNext}"`);
      setTimeout(() => {
        setStatusSuccessId(null);
      }, 2500);
      setTimeout(() => {
        setStatusNotification(null);
      }, 4000);
    } catch (err) {
      console.error('Error changing status:', err);
      alert('Error al actualizar el estado de la cotización');
    } finally {
      setUpdatingStatusId(null);
      setCancellingQuotation(null);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingQuotation) return;
    const finalReason = cancelReasonInput === 'Otro motivo' ? (customCancelReason || 'Otro motivo no especificado') : cancelReasonInput;
    await handleStatusChange(cancellingQuotation, 'No Concretada', finalReason);
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

  // Dynamic style for the Status Select Dropdown
  const getStatusSelectStyle = (status: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'Pendiente':
        return 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/80 focus:ring-amber-300 focus:border-amber-500';
      case 'Pagado':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100/80 focus:ring-emerald-300 focus:border-emerald-500 font-black';
      case 'Empacando Pedido':
        return 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100/80 focus:ring-purple-300 focus:border-purple-500 font-black';
      case 'Despachado':
        return 'bg-blue-900 text-white border-blue-900 hover:bg-blue-800 focus:ring-blue-400 font-black';
      case 'Entregado':
        return 'bg-teal-900 text-white border-teal-900 hover:bg-teal-800 focus:ring-teal-400 font-black';
      case 'No Concretada':
        return 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Render Status Badge
  const getStatusBadge = (status: QuotationStatus, reason?: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'Pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            1. Pendiente
          </span>
        );
      case 'Pagado':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            2. Pagado
          </span>
        );
      case 'Empacando Pedido':
        return (
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xs">
            <Package className="w-3.5 h-3.5 text-purple-600" />
            3. Empacando Pedido
          </span>
        );
      case 'Despachado':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-900 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            4. Despachado
          </span>
        );
      case 'Entregado':
        return (
          <span className="inline-flex items-center gap-1.5 bg-teal-900 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
            5. Entregado
          </span>
        );
      case 'No Concretada':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full">
            <X className="w-3 h-3 text-rose-600" />
            No Concretada {reason ? `(${reason})` : ''}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP PIPELINE METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {/* Total Quotes */}
        <div 
          onClick={() => setFilterStatus('Todas')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Todas' ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Total</span>
            <FileText className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <p className="text-lg font-display font-black text-slate-900 mt-0.5">{stats.total}</p>
          <p className="text-[9px] font-mono text-slate-500 truncate">S/. {stats.totalQuotedAmount.toFixed(2)}</p>
        </div>

        {/* 1. Pendientes */}
        <div 
          onClick={() => setFilterStatus('Pendiente')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Pendiente' ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-amber-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-700 font-bold">1. Pendientes</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-lg font-display font-black text-amber-600 mt-0.5">{stats.pending}</p>
          <p className="text-[9px] font-mono text-slate-400 truncate">Por abonar</p>
        </div>

        {/* 2. Pagados */}
        <div 
          onClick={() => setFilterStatus('Pagado')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Pagado' ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold">2. Pagados</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-display font-black text-emerald-600 mt-0.5">{stats.paid}</p>
          <p className="text-[9px] font-mono text-emerald-700 truncate font-bold">Abono OK</p>
        </div>

        {/* 3. Empacando Pedido */}
        <div 
          onClick={() => setFilterStatus('Empacando Pedido')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Empacando Pedido' ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-purple-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-purple-700 font-bold">3. Preparando</span>
            <Package className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-lg font-display font-black text-purple-600 mt-0.5">{stats.packing}</p>
          <p className="text-[9px] font-mono text-slate-400 truncate">En almacén</p>
        </div>

        {/* 4. Despachado */}
        <div 
          onClick={() => setFilterStatus('Despachado')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Despachado' ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20' : 'bg-white border-slate-200 hover:border-blue-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-blue-700 font-bold">4. Despachado</span>
            <Truck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg font-display font-black text-blue-700 mt-0.5">{stats.dispatched}</p>
          <p className="text-[9px] font-mono text-slate-400 truncate">En agencia</p>
        </div>

        {/* 5. Entregado */}
        <div 
          onClick={() => setFilterStatus('Entregado')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'Entregado' ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20' : 'bg-white border-slate-200 hover:border-teal-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-teal-800 font-bold">5. Entregado</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <p className="text-lg font-display font-black text-teal-700 mt-0.5">{stats.delivered}</p>
          <p className="text-[9px] font-mono text-teal-700 truncate font-bold">Conforme</p>
        </div>

        {/* 6. No Concluidas */}
        <div 
          onClick={() => setFilterStatus('No Concretada')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-3xs ${filterStatus === 'No Concretada' ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-rose-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-rose-700 font-bold">6. No Compró</span>
            <X className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-lg font-display font-black text-rose-600 mt-0.5">{stats.unconcluded}</p>
          <p className="text-[9px] font-mono text-slate-400 truncate">No concluida</p>
        </div>
      </div>

      {/* 2. ACTION CONTROLS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cotización por cliente, RUC, DNI, N° cotización, motivo o repuesto..."
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
            <option value="Pagado">🟢 2. Pagados ({stats.paid})</option>
            <option value="Empacando Pedido">📦 3. En Almacén / Empacando ({stats.packing})</option>
            <option value="Despachado">🚚 4. Despachados ({stats.dispatched})</option>
            <option value="Entregado">✅ 5. Entregados al Cliente ({stats.delivered})</option>
            <option value="No Concretada">❌ 6. No Concluidas / No Compró ({stats.unconcluded})</option>
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
            <span>+ Nueva Cotización Manual</span>
          </button>
        </div>
      </div>

      {/* Floating Status Notification Toast */}
      {statusNotification && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{statusNotification}</span>
          </div>
          <button onClick={() => setStatusNotification(null)} className="text-emerald-200 hover:text-white ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. WORKFLOW ORDER BANNER (Guía de trabajo ordenado) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px]">
            FLUJO COMPLETO VELKOR
          </span>
          <span className="text-slate-300">
            <b>1. Cotizar (Pendiente)</b> ➡️ <b>2. Pagado</b> ➡️ <b>3. Empacando (Almacén)</b> ➡️ <b>4. Despachado (Agencia)</b> ➡️ <b>5. Entregado</b>
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
            const currentNorm = normalizeStatus(q.status);
            const isUpdating = updatingStatusId === q.id;
            const isSuccess = statusSuccessId === q.id;

            return (
              <div 
                key={q.id} 
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all space-y-4 ${
                  currentNorm === 'Pendiente' ? 'border-amber-200 hover:border-amber-400/70' :
                  currentNorm === 'Pagado' ? 'border-emerald-200 hover:border-emerald-400/70' :
                  currentNorm === 'Empacando Pedido' ? 'border-purple-200 hover:border-purple-400/70' :
                  'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Upper line: Quote ID, date, STATUS DROPDOWN, total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {q.quoteNumber}
                    </span>

                    {/* STATUS DROPDOWN SELECTOR (Requested feature) */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                      <label 
                        htmlFor={`status-select-${q.id}`} 
                        className="text-[10px] font-mono uppercase text-slate-500 font-bold hidden sm:inline"
                      >
                        Estado:
                      </label>
                      <div className="relative inline-flex items-center">
                        <select
                          id={`status-select-${q.id}`}
                          value={currentNorm}
                          onChange={(e) => handleStatusChange(q, e.target.value as QuotationStatus)}
                          disabled={isUpdating}
                          aria-label={`Cambiar estado de cotización ${q.quoteNumber}`}
                          className={`font-mono font-black text-xs pl-2.5 pr-7 py-1 rounded-lg border transition-all appearance-none cursor-pointer focus:outline-hidden focus:ring-2 shadow-2xs ${getStatusSelectStyle(currentNorm)}`}
                        >
                          <option value="Pendiente">🟡 1. Pendiente</option>
                          <option value="Pagado">🟢 2. Pagado</option>
                          <option value="Empacando Pedido">📦 3. Empacando</option>
                          <option value="Despachado">🚚 4. Despachado</option>
                          <option value="Entregado">✅ 5. Entregado</option>
                          <option value="No Concretada">❌ 6. No Compró</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>

                      {isUpdating && (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 ml-1" />
                      )}
                      {isSuccess && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-center animate-fadeIn flex items-center gap-0.5">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Guardado
                        </span>
                      )}
                    </div>

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
                      <span className="font-bold">{q.customerDocType}:</span> {q.customerDocNumber || 'S/N'}
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
                    {q.noPurchaseReason && currentNorm === 'No Concretada' && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-1.5 rounded font-mono">
                        ⚠️ <b>Motivo no compra:</b> {q.noPurchaseReason}
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
                  
                  {/* WORKFLOW STEP PROGRESSION BUTTONS (Orderly flow as requested) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* If Pendiente -> Next is 'Pagado', or cancel */}
                    {currentNorm === 'Pendiente' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(q, 'Pagado')}
                          disabled={isUpdating}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Marcar cotización como pagada por el cliente"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>➡️ Marcar como Pagado</span>
                        </button>
                        <button
                          onClick={() => {
                            setCancellingQuotation(q);
                            setCancelReasonInput('Precio elevado (Muy caro)');
                            setCustomCancelReason('');
                          }}
                          disabled={isUpdating}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          title="Cliente no compró o canceló la cotización"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>No Compró</span>
                        </button>
                      </>
                    )}

                    {/* If Pagado -> Next is 'Empacando Pedido' */}
                    {currentNorm === 'Pagado' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(q, 'Empacando Pedido')}
                          disabled={isUpdating}
                          className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
                          title="Enviar orden a almacén para empacar repuestos"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>➡️ Pasar a Empacando Pedido</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(q, 'Pendiente')}
                          disabled={isUpdating}
                          className="text-slate-400 hover:text-slate-600 text-[10px] font-mono underline ml-1 cursor-pointer"
                        >
                          Volver a Pendiente
                        </button>
                      </>
                    )}

                    {/* If Empacando Pedido -> Next is 'Despachado' */}
                    {currentNorm === 'Empacando Pedido' && (
                      <button
                        onClick={() => handleStatusChange(q, 'Despachado')}
                        disabled={isUpdating}
                        className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Marcar pedido como empacado y despachado por agencia"
                      >
                        <Truck className="w-3.5 h-3.5 text-white" />
                        <span>➡️ Marcar como Despachado</span>
                      </button>
                    )}

                    {/* If Despachado -> Next is 'Entregado' */}
                    {currentNorm === 'Despachado' && (
                      <button
                        onClick={() => handleStatusChange(q, 'Entregado')}
                        disabled={isUpdating}
                        className="bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-mono font-black text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Confirmar que el cliente recibió su pedido conforme"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-200" />
                        <span>➡️ Confirmar Entrega al Cliente</span>
                      </button>
                    )}

                    {/* Completed indicator */}
                    {currentNorm === 'Entregado' && (
                      <span className="text-[11px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        Pedido Entregado Conforme — Venta Concluida Exitosamente
                      </span>
                    )}

                    {/* Unconcluded indicator */}
                    {currentNorm === 'No Concretada' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          No Concluida {q.noPurchaseReason ? `• ${q.noPurchaseReason}` : ''}
                        </span>
                        <button
                          onClick={() => handleStatusChange(q, 'Pendiente')}
                          disabled={isUpdating}
                          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-mono font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                          title="Reactivar cotización en estado pendiente"
                        >
                          🔄 Reactivar Cotización
                        </button>
                      </div>
                    )}

                    {/* Secondary Dropdown in bottom bar for easy access */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 ml-1">
                      <span>Cambiar a:</span>
                      <div className="relative inline-flex items-center">
                        <select
                          value={currentNorm}
                          onChange={(e) => handleStatusChange(q, e.target.value as QuotationStatus)}
                          disabled={isUpdating}
                          className={`border rounded-lg pl-2 pr-6 py-1 text-[11px] font-mono font-bold focus:outline-hidden appearance-none cursor-pointer ${getStatusSelectStyle(currentNorm)}`}
                        >
                          <option value="Pendiente">🟡 1. Pendiente</option>
                          <option value="Pagado">🟢 2. Pagado</option>
                          <option value="Empacando Pedido">📦 3. Empacando</option>
                          <option value="Despachado">🚚 4. Despachado</option>
                          <option value="Entregado">✅ 5. Entregado</option>
                          <option value="No Concretada">❌ 6. No Compró</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
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

      {/* 7. CANCEL / NO COMPRÓ REASON MODAL */}
      {cancellingQuotation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <X className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Registrar Cotización No Concluida</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{cancellingQuotation.quoteNumber} — {cancellingQuotation.customerName}</p>
                </div>
              </div>
              <button 
                onClick={() => setCancellingQuotation(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Seleccione el motivo de no compra / cancelación:
              </label>
              <select
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:bg-white focus:outline-hidden focus:border-rose-500"
              >
                <option value="Precio elevado (Muy caro)">Precio elevado (Muy caro)</option>
                <option value="Falta de stock disponible">Falta de stock disponible</option>
                <option value="No volvió a responder WhatsApp">No volvió a responder WhatsApp</option>
                <option value="Costo de envío elevado">Costo de envío elevado</option>
                <option value="Demora en tiempo de entrega">Demora en tiempo de entrega</option>
                <option value="Prefirió comprar en su localidad">Prefirió comprar en su localidad</option>
                <option value="Solo estaba consultando">Solo estaba consultando precios</option>
                <option value="Otro motivo">Otro motivo personalizado...</option>
              </select>

              {cancelReasonInput === 'Otro motivo' && (
                <input
                  type="text"
                  placeholder="Escriba el motivo detallado..."
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-rose-500"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingQuotation(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-mono font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                Confirmar No Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
