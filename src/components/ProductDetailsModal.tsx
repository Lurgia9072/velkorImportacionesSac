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
  const images = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl];
  const [activeImage, setActiveImage] = useState(images[0] || product.imageUrl);

  useEffect(() => {
    if (product.id) {
      incrementProductView(product.id);
    }
    const imgs = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl];
    setActiveImage(imgs[0] || product.imageUrl);
  }, [product]);

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
    <div id="product-details-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-fadeIn">
      <div 
        id="product-details-modal"
        className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl border border-slate-200 relative animate-slideUp flex flex-col max-h-[90vh] text-slate-900"
      >
        {/* Close Button */}
        <button 
          id="close-details-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition-colors border border-slate-200"
          aria-label="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>
 
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Image Column */}
            <div className="flex flex-col gap-3">
              <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200 aspect-square flex items-center justify-center">
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
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

              {/* Thumbnails list if there is more than 1 image */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 bg-white flex-shrink-0 transition-all ${
                        activeImage === img 
                          ? 'border-emerald-500 shadow-sm' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`${product.name} thumbnail ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
 
            {/* Information Column */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="inline-block bg-slate-100 text-slate-600 text-xs font-mono font-semibold tracking-wider px-2.5 py-1 rounded-sm uppercase mb-3 border border-slate-200">
                  {product.category}
                </span>
 
                {product.code && (
                  <div className="mb-2">
                    <span className="inline-block bg-emerald-550 text-emerald-800 text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded-sm uppercase border border-emerald-200">
                      Código: {product.code}
                    </span>
                  </div>
                )}
                <h2 className="text-xl md:text-2xl font-display font-black text-slate-900 leading-tight">
                  {product.name}
                </h2>
 
                {/* Popularity indicator */}
                {product.views !== undefined && product.views > 0 && (
                  <p className="text-slate-400 text-xs font-mono mt-1 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    Popularidad: visto {product.views} veces
                  </p>
                )}
 
                {/* Description */}
                <div className="mt-4">
                  <h4 className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Descripción del repuesto</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                    {product.description}
                  </p>
                </div>
 
                {/* Colors & Motorcycle compatibility (Optional) */}
                {(product.colors || product.motorcycleBrands) && (
                  <div className="mt-4 space-y-2 border-t border-b border-slate-100 py-3">
                    {product.colors && (
                      <p className="text-sm text-slate-600">
                        <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">Colores Disponibles:</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{product.colors}</span>
                      </p>
                    )}
                    {product.motorcycleBrands && (
                      <p className="text-sm text-slate-600">
                        <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider block">Motos Compatibles:</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">{product.motorcycleBrands}</span>
                      </p>
                    )}
                  </div>
                )}
 
                {/* Arrival Date from China if status is upcoming import */}
                {product.status === 'Importación próxima' ? (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <span className="text-[10px] text-emerald-600 font-mono uppercase tracking-widest block font-bold">🇨🇳 IMPORTACIÓN DESDE CHINA EN CAMINO</span>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Este repuesto está viajando en nuestro próximo lote de importación directa de fábrica. Puedes pre-ordenar para asegurar precio mayorista preferencial.
                    </p>
                    <div className="mt-3 text-sm text-emerald-700 font-mono font-bold">
                      Arribo estimado: {product.arrivalDate || 'Próximamente'}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                    * Distribuimos repuestos de motos por mayor y menor en todo el Perú. Solicita una cotización.
                  </div>
                )}
              </div>
 
              {/* Order Controls */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                {!isOutOfStock && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-slate-600">Cantidad:</span>
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button 
                        id="btn-decrement-qty"
                        onClick={handleDecrement}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors border-r border-slate-200 disabled:opacity-50"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-sm font-mono font-bold text-slate-800 w-12 text-center bg-slate-50">
                        {quantity}
                      </span>
                      <button 
                        id="btn-increment-qty"
                        onClick={handleIncrement}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors border-l border-slate-200"
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
                    className="flex-1 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-display font-black py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {product.status === 'Importación próxima' ? 'Reservar en Carrito' : 'Agregar al Carrito'}
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
