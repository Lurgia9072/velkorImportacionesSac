import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { X, ShoppingBag, MessageSquare, PhoneCall, Package, Calendar, Sparkles, Flame, Eye } from 'lucide-react';
import { incrementProductView } from '../firebase';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onOrder: (product: Product, quantity: number) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, onOrder }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product.id) {
      incrementProductView(product.id);
    }
  }, [product.id]);

  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div id="product-details-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn">
      <div 
        id="product-details-modal"
        className="bg-[#111111] rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl border border-neutral-800 relative animate-slideUp flex flex-col max-h-[90vh] text-white"
      >
        {/* Close Button */}
        <button 
          id="close-details-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-full transition-colors border border-neutral-700/50"
          aria-label="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Image Column */}
            <div className="relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 aspect-square flex items-center justify-center">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {/* Badges on detail */}
              {product.status === 'Nuevo' && (
                <span className="absolute top-3 left-3 status-tag tag-new shadow-md flex items-center gap-1 uppercase">
                  <Sparkles className="w-3 h-3" /> Nuevo
                </span>
              )}
              {product.status === 'Promoción' && (
                <span className="absolute top-3 left-3 status-tag tag-promo shadow-md flex items-center gap-1 uppercase">
                  <Flame className="w-3 h-3" /> Promoción
                </span>
              )}
              {product.status === 'Importación próxima' && (
                <span className="absolute top-3 left-3 status-tag tag-china shadow-md flex items-center gap-1 uppercase">
                  <Calendar className="w-3 h-3" /> Por Llegar
                </span>
              )}
            </div>

            {/* Information Column */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="inline-block bg-neutral-850 text-neutral-300 text-xs font-mono font-semibold tracking-wider px-2.5 py-1 rounded-sm uppercase mb-3 border border-neutral-800">
                  {product.category}
                </span>

                <h2 className="text-xl md:text-2xl font-display font-black text-white leading-tight">
                  {product.name}
                </h2>

                {/* Popularity indicator */}
                {product.views !== undefined && product.views > 0 && (
                  <p className="text-neutral-500 text-xs font-mono mt-1 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-neutral-500" />
                    Popularidad: visto {product.views} veces
                  </p>
                )}

                {/* Description */}
                <div className="mt-4">
                  <h4 className="text-neutral-500 text-[10px] font-mono uppercase tracking-wider">Descripción del repuesto</h4>
                  <p className="text-neutral-300 text-sm mt-1 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Colors & Motorcycle compatibility (Optional) */}
                {(product.colors || product.motorcycleBrands) && (
                  <div className="mt-4 space-y-2 border-t border-b border-neutral-850/65 py-3">
                    {product.colors && (
                      <p className="text-sm text-neutral-300">
                        <span className="text-neutral-500 font-mono text-[10px] uppercase tracking-wider block">Colores Disponibles:</span>
                        <span className="font-semibold text-white mt-0.5 block">{product.colors}</span>
                      </p>
                    )}
                    {product.motorcycleBrands && (
                      <p className="text-sm text-neutral-300">
                        <span className="text-neutral-500 font-mono text-[10px] uppercase tracking-wider block">Motos Compatibles:</span>
                        <span className="font-semibold text-white mt-0.5 block">{product.motorcycleBrands}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Arrival Date from China if status is upcoming import */}
                {product.status === 'Importación próxima' ? (
                  <div className="mt-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest block font-bold">🇨🇳 IMPORTACIÓN DESDE CHINA EN CAMINO</span>
                    <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                      Este repuesto está viajando en nuestro próximo lote de importación directa de fábrica. Puedes pre-ordenar para asegurar precio mayorista preferencial.
                    </p>
                    <div className="mt-3 text-sm text-emerald-400 font-mono">
                      <strong>Arribo estimado:</strong> {product.arrivalDate || 'Próximamente'}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-400">
                    * Distribuimos repuestos de motos por mayor y menor en todo el Perú. Solicita una cotización.
                  </div>
                )}
              </div>

              {/* Order Controls */}
              <div className="mt-6 pt-4 border-t border-neutral-800">
                {!isOutOfStock && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-neutral-300">Cantidad:</span>
                    <div className="flex items-center border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
                      <button 
                        id="btn-decrement-qty"
                        onClick={handleDecrement}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold transition-colors border-r border-neutral-850 disabled:opacity-50"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-sm font-mono font-bold text-white w-12 text-center bg-neutral-900">
                        {quantity}
                      </span>
                      <button 
                        id="btn-increment-qty"
                        onClick={handleIncrement}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold transition-colors border-l border-neutral-850"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    id="btn-action-order"
                    onClick={() => onOrder(product, quantity)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-display font-black py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {product.status === 'Importación próxima' ? 'Reservar e Importar' : 'Iniciar Pedido de WhatsApp'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
