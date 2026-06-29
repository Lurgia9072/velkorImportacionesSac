import React, { useState } from 'react';
import { Product, Order } from '../types';
import { X, CheckCircle, Send, Phone, MapPin, User, Hash, MessageCircle } from 'lucide-react';
import { createOrder } from '../firebase';

interface OrderFormModalProps {
  cartItems: { product: Product; quantity: number }[];
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({ cartItems, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [region, setRegion] = useState('Lima'); // Peruvian region tracking
  const [requestType, setRequestType] = useState<Order['requestType']>('Compra directa');
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('20% adelanto / 80% entrega');
  const [whatsappNumber, setWhatsappNumber] = useState('+51970329450'); // Default Peruvian number placeholder, editable for testing

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalAmount = cartItems.reduce((acc, item) => {
    const itemPrice = item.product.showPrice ? item.product.price : 0;
    return acc + itemPrice * item.quantity;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (cartItems.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Save each item as a separate order in Firestore
      for (const item of cartItems) {
        const newOrder: Omit<Order, 'id'> = {
          customerName,
          customerPhone,
          deliveryAddress,
          region,
          productId: item.product.id || '',
          productName: item.product.name,
          productPrice: item.product.showPrice ? item.product.price : 0,
          quantity: item.quantity,
          requestType,
          paymentMethod,
          status: 'En seguimiento', // Initial status
          createdAt: new Date().toISOString()
        };
        await createOrder(newOrder);
      }

      // 2. Format a single clean WhatsApp message listing all products
      let itemsText = '';
      cartItems.forEach((item, idx) => {
        itemsText += `${idx + 1}. *${item.product.name}*\n   Cantidad: ${item.quantity} und.\n\n`;
      });

      const formattedMessage = `Nuevo pedido Velkor Importaciones:

Nombre: ${customerName}
Celular: ${customerPhone}
Región: ${region}
Dirección: ${deliveryAddress}

PRODUCTOS DEL PEDIDO:
${itemsText}Tipo de Solicitud: ${requestType}
Método de Pago Preferido: ${paymentMethod}`;

      // 3. Format WhatsApp phone and open link
      const cleanPhone = whatsappNumber.replace(/\D/g, '');
      const waPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(formattedMessage)}`;
      
      // 4. Save order records to local storage to show in "Mis Pedidos" client history
      const localOrders = JSON.parse(localStorage.getItem('velkor_local_orders') || '[]');
      for (const item of cartItems) {
        localOrders.push({
          productId: item.product.id || '',
          productName: item.product.name,
          productPrice: item.product.showPrice ? item.product.price : 0,
          showPrice: item.product.showPrice,
          category: item.product.category,
          imageUrl: item.product.imageUrl,
          imageUrls: item.product.imageUrls || [],
          quantity: item.quantity,
          requestType: requestType,
          paymentMethod: paymentMethod,
          status: 'En seguimiento',
          createdAt: new Date().toISOString()
        });
      }
      localStorage.setItem('velkor_local_orders', JSON.stringify(localOrders));

      setIsSubmitting(false);
      setSubmitted(true);

      // Open WhatsApp link in a new tab
      window.open(whatsappUrl, '_blank');

      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err) {
      console.error('Error al procesar el pedido:', err);
      alert('Ocurrió un error al guardar el pedido. Intente nuevamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div id="order-form-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-fadeIn">
      <div 
        id="order-form-modal"
        className="bg-white rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl border border-slate-200 relative animate-slideUp flex flex-col max-h-[90vh] text-slate-900"
      >
        {/* Close button */}
        <button 
          id="close-order-form"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition-colors border border-slate-200"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>
 
        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-200">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-display font-extrabold text-slate-900">¡Pedido Registrado con Éxito!</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
              Se ha guardado el registro en nuestra base de datos y se ha abierto WhatsApp para enviar los detalles al administrador.
            </p>
            <p className="text-emerald-600 font-semibold text-xs mt-5 flex items-center gap-1">
              <MessageCircle className="w-4 h-4 animate-bounce" />
              Redireccionando a WhatsApp...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 md:p-8 flex flex-col">
            <h3 className="text-lg md:text-xl font-display font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-600" />
              Confirmar Pedido de Repuestos
            </h3>
 
            {/* Scrollable Cart Summary */}
            <div className="my-4 bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2">
              <p className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider border-b border-slate-200/60 pb-1">
                Resumen de tu Carrito ({cartItems.length} ítems)
              </p>
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-100 shadow-3xs">
                  <img 
                    src={item.product.imageUrl} 
                    alt={item.product.name} 
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-slate-900 text-xs font-bold font-display truncate">{item.product.name}</h4>
                    <p className="text-slate-500 text-[10px] font-mono">
                      Cantidad: {item.quantity} und.
                    </p>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center text-xs font-bold font-mono">
                <span className="text-slate-500 uppercase text-[10px]">Total de Repuestos:</span>
                <span className="text-emerald-600 text-sm">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)} und.
                </span>
              </div>
            </div>
 
            <div className="space-y-4 flex-1">
              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nombre Completo *
                </label>
                <input 
                  id="input-customer-name"
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez Rojas"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden transition-colors text-slate-900 placeholder:text-slate-400"
                />
              </div>
 
              {/* Customer Phone */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Número de Celular *
                </label>
                <input 
                  id="input-customer-phone"
                  type="tel"
                  required
                  placeholder="Ej: 999888777"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden transition-colors text-slate-900 placeholder:text-slate-400"
                />
              </div>
 
              {/* Delivery Address */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Dirección de Entrega *
                </label>
                <input 
                  id="input-delivery-address"
                  type="text"
                  required
                  placeholder="Ej: Av. Próceres de la Independencia 1230, S.J.L. - Lima"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden transition-colors text-slate-900 placeholder:text-slate-400"
                />
              </div>
 
              {/* Department / Region Filter */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Departamento / Región *
                </label>
                <select
                  id="select-customer-region"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden transition-colors font-sans text-slate-900"
                >
                  <option value="Lima">Lima</option>
                  <option value="Callao">Callao</option>
                  <option value="Arequipa">Arequipa</option>
                  <option value="La Libertad">La Libertad</option>
                  <option value="Lambayeque">Lambayeque</option>
                  <option value="Piura">Piura</option>
                  <option value="Cusco">Cusco</option>
                  <option value="Junín">Junín</option>
                  <option value="Ancash">Ancash</option>
                  <option value="Ica">Ica</option>
                  <option value="Cajamarca">Cajamarca</option>
                  <option value="San Martín">San Martín</option>
                  <option value="Tacna">Tacna</option>
                  <option value="Puno">Puno</option>
                  <option value="Huánuco">Huánuco</option>
                  <option value="Ayacucho">Ayacucho</option>
                  <option value="Ucayali">Ucayali</option>
                  <option value="Loreto">Loreto</option>
                  <option value="Pasco">Pasco</option>
                  <option value="Moquegua">Moquegua</option>
                  <option value="Madre de Dios">Madre de Dios</option>
                  <option value="Tumbes">Tumbes</option>
                  <option value="Amazonas">Amazonas</option>
                  <option value="Apurímac">Apurímac</option>
                  <option value="Huancavelica">Huancavelica</option>
                  <option value="Otro">Otro / Extranjero</option>
                </select>
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Request Type */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Tipo de Solicitud
                  </label>
                  <select
                    id="select-request-type"
                    value={requestType}
                    onChange={e => setRequestType(e.target.value as Order['requestType'])}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden transition-colors font-sans text-slate-900"
                  >
                    <option value="Compra directa">Compra directa</option>
                    <option value="Consulta">Consulta informativa</option>
                    <option value="Cotización">Cotización formal</option>
                  </select>
                </div>
 
                {/* Payment Method */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Método de Pago Preferido
                  </label>
                  <select
                    id="select-payment-method"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as Order['paymentMethod'])}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden transition-colors font-sans text-slate-900"
                  >
                    <option value="20% adelanto / 80% entrega">20% Adelanto / 80% Contra-entrega</option>
                    <option value="50/50">50% Adelanto / 50% Saldo</option>
                    <option value="Otro">Otro (Acordar con administrador)</option>
                  </select>
                </div>
              </div>
 
              {/* Editable WhatsApp business target number */}
              <div className="pt-4 border-t border-dashed border-slate-200">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                  Enviar pedido al WhatsApp del Negocio (Número de Pruebas):
                </label>
                <input 
                  id="input-whatsapp-target"
                  type="text"
                  placeholder="Ej: 999999999"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-hidden transition-colors text-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block leading-normal">
                  * Cambia este número para probar el envío directo a tu propio WhatsApp celular.
                </span>
              </div>
            </div>
 
            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                id="btn-cancel-order"
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-colors text-sm font-semibold border border-slate-200"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                id="btn-submit-order"
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-450 text-slate-950 py-3 rounded-xl transition-colors text-sm font-black flex items-center justify-center gap-2 shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Pedido
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
