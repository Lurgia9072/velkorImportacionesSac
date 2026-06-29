import React from 'react';
import { Product } from '../types';
import { Eye, Flame, Calendar, Sparkles, MessageCircle, Info } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onOrder: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, onOrder }) => {
  const getStatusBadge = () => {
    switch (product.status) {
      case 'Nuevo':
        return (
          <span id={`badge-nuevo-${product.id}`} className="absolute top-3 left-3 status-tag tag-new shadow-lg flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Nuevo
          </span>
        );
      case 'Promoción':
        return (
          <span id={`badge-promo-${product.id}`} className="absolute top-3 left-3 status-tag tag-promo shadow-lg flex items-center gap-1 uppercase tracking-wider animate-pulse">
            <Flame className="w-3 h-3" />
            Oferta
          </span>
        );
      case 'Importación próxima':
        return (
          <span id={`badge-import-${product.id}`} className="absolute top-3 left-3 status-tag tag-china shadow-lg flex items-center gap-1 uppercase tracking-wider">
            <Calendar className="w-3 h-3" />
            Por Llegar
          </span>
        );
      default:
        return null;
    }
  };

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="bento-card group flex flex-col h-full bg-[#111111] border border-neutral-800 hover:border-emerald-500/50 transition-all duration-300"
    >
      {/* Product Image Panel */}
      <div className="relative aspect-square overflow-hidden bg-neutral-900 cursor-pointer" onClick={() => onSelect(product)}>
        <img 
          src={product.imageUrl || 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80'} 
          alt={product.name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status Badge */}
        {getStatusBadge()}

        {/* Views Indicator */}
        {product.views !== undefined && product.views > 0 && (
          <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
            <Eye className="w-3 h-3 text-neutral-300" />
            {product.views}
          </span>
        )}
      </div>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category */}
          <span className="text-[11px] font-mono font-semibold tracking-wider text-neutral-500 uppercase">
            {product.category}
          </span>
          
          {/* Name */}
          <h3 
            onClick={() => onSelect(product)}
            className="text-white font-display font-bold text-base mt-1 line-clamp-2 hover:text-emerald-400 transition-colors cursor-pointer leading-tight h-10"
          >
            {product.name}
          </h3>

          {/* Description Snippet */}
          <p className="text-neutral-400 text-xs mt-1.5 line-clamp-2 h-8 leading-normal">
            {product.description}
          </p>

          {/* Colors & Brands (Optional fields) */}
          {(product.colors || product.motorcycleBrands) && (
            <div className="mt-3 space-y-1 text-[11px] font-mono text-neutral-400 border-t border-neutral-900/50 pt-2">
              {product.colors && (
                <p className="truncate">
                  <span className="text-neutral-500 font-bold">Colores:</span> {product.colors}
                </p>
              )}
              {product.motorcycleBrands && (
                <p className="truncate">
                  <span className="text-neutral-500 font-bold">Motos:</span> {product.motorcycleBrands}
                </p>
              )}
            </div>
          )}

          {/* China Import Arrival Date if Upcoming */}
          {product.status === 'Importación próxima' && (
            <div className="mt-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg p-2 text-[11px] font-mono text-emerald-400">
              <span className="font-bold block text-[9px] uppercase tracking-wider text-emerald-500">Arribo desde China:</span>
              <span>{product.arrivalDate || 'Próximamente (En contenedor)'}</span>
            </div>
          )}
        </div>

        {/* Pricing and Action Row */}
        <div className="mt-4 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">Distribución Perú</p>
              <p className="text-xs font-semibold font-mono text-emerald-400 flex items-center gap-0.5 mt-0.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                Por mayor y menor
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              id={`btn-details-${product.id}`}
              onClick={() => onSelect(product)}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold py-2 px-3 rounded-lg border border-neutral-700/50 transition-colors flex items-center justify-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              Ver más
            </button>
            <button 
              id={`btn-order-${product.id}`}
              onClick={() => onOrder(product)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1 shadow-xs font-mono tracking-wide"
            >
              {product.status === 'Importación próxima' ? 'Reservar' : 'Pedir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
