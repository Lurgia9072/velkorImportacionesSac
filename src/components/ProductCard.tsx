import React, { useState } from 'react';
import { Product } from '../types';
import { Eye, Flame, Calendar, Sparkles, MessageCircle, Images, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, unitType?: 'unidades' | 'cajas', unitQuantity?: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, onAddToCart }) => {
  const [cardQuantity, setCardQuantity] = useState(1);
  const [unitType, setUnitType] = useState<'unidades' | 'cajas'>('unidades');

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
      className="bento-card group flex flex-col h-full bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all duration-300"
    >
      {/* Product Image Panel */}
      <div className="relative aspect-[10/9] overflow-hidden bg-slate-50 cursor-pointer" onClick={() => onSelect(product)}>
        <img 
          src={product.imageUrl || 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80'} 
          alt={product.name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status Badge */}
        {getStatusBadge()}

        {/* Gallery count indicator */}
        {product.imageUrls && product.imageUrls.length > 1 && (
          <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 z-10">
            <Images className="w-3.5 h-3.5 text-emerald-400" />
            1/{product.imageUrls.length}
          </span>
        )}
 
        {/* Views Indicator */}
        {product.views !== undefined && product.views > 0 && (
          <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
            <Eye className="w-3 h-3 text-slate-200" />
            {product.views}
          </span>
        )}
      </div>
 
      {/* Product Information */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category */}
          <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
            {product.category}
          </span>
          
          {/* Code badge */}
          {product.code && (
            <span className="inline-block text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded uppercase mt-2">
              Cód: {product.code}
            </span>
          )}

          {/* Name */}
          <h3 
            onClick={() => onSelect(product)}
            className="text-slate-900 font-display font-bold text-base mt-1 line-clamp-2 hover:text-emerald-600 transition-colors cursor-pointer leading-tight h-10"
          >
            {product.name}
          </h3>
 
          {/* Description Snippet */}
          <p className="text-slate-500 text-xs mt-1 line-clamp-2 h-8 leading-normal">
            {product.description}
          </p>

          {/* Core Wholesaler Info Block */}
          <div className="mt-2.5 bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 space-y-1.5 text-xs text-slate-700">
            {product.brand && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-mono uppercase text-[9px] font-bold">Marca:</span>
                <span className="font-extrabold text-slate-800 uppercase bg-slate-200/50 px-1.5 py-0.5 rounded text-[10px]">{product.brand}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-mono uppercase text-[9px] font-bold">Precio Unitario:</span>
              <span className="font-mono font-black text-emerald-600">S/. {product.price.toFixed(2)}</span>
            </div>

            {product.unitsPerBox && product.unitsPerBox > 0 ? (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-mono uppercase text-[9px] font-bold">Cant. por Caja:</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">{product.unitsPerBox} unidades</span>
              </div>
            ) : null}
          </div>
 
          {/* Colors & Brands (Optional fields) */}
          {(product.colors || product.motorcycleBrands) && (
            <div className="mt-2.5 space-y-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 pt-2">
              {product.colors && (
                <p className="truncate">
                  <span className="text-slate-400 font-bold">Colores:</span> {product.colors}
                </p>
              )}
              {product.motorcycleBrands && (
                <p className="truncate">
                  <span className="text-slate-400 font-bold">Motos:</span> {product.motorcycleBrands}
                </p>
              )}
            </div>
          )}
 
          {/* China Import Arrival Date if Upcoming */}
          {product.status === 'Importación próxima' && (
            <div className="mt-2.5 bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-[11px] font-mono text-emerald-800">
              <span className="font-bold block text-[9px] uppercase tracking-wider text-emerald-600">Arribo desde China:</span>
              <span>{product.arrivalDate || 'Próximamente (En contenedor)'}</span>
            </div>
          )}
        </div>
 
        {/* Pricing and Action Row */}
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          {/* Unit Toggle Switcher */}
          {product.unitsPerBox && product.unitsPerBox > 0 ? (
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-mono font-bold border border-slate-200 mb-2.5">
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setUnitType('unidades'); 
                  setCardQuantity(1);
                }}
                className={`flex-1 py-1 rounded-md transition-all text-center ${unitType === 'unidades' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Por Unidades
              </button>
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setUnitType('cajas'); 
                  setCardQuantity(1);
                }}
                className={`flex-1 py-1 rounded-md transition-all text-center ${unitType === 'cajas' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Por Caja ({product.unitsPerBox} u.)
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Distribución Perú</p>
              <p className="text-xs font-semibold font-mono text-emerald-600 flex items-center gap-0.5 mt-0.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                Venta por Mayor y Menor
              </p>
            </div>
          </div>
 
          <div className="grid grid-cols-2 gap-2">
            {/* Quantity Selector */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between border border-slate-200 rounded-lg bg-slate-50 overflow-hidden h-9">
                <button
                  type="button"
                  id={`btn-card-decrement-${product.id}`}
                  disabled={cardQuantity <= 1 || isOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardQuantity(prev => Math.max(1, prev - 1));
                  }}
                  className="px-2.5 h-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold transition-all disabled:opacity-50 select-none text-sm"
                >
                  -
                </button>
                <span className="font-mono text-xs font-bold text-slate-900 w-8 text-center select-none">
                  {cardQuantity}
                </span>
                <button
                  type="button"
                  id={`btn-card-increment-${product.id}`}
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardQuantity(prev => prev + 1);
                  }}
                  className="px-2.5 h-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold transition-all disabled:opacity-50 select-none text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* "+ Carrito" button */}
            <button 
              id={`btn-add-cart-${product.id}`}
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                const totalUnits = unitType === 'cajas' && product.unitsPerBox ? cardQuantity * product.unitsPerBox : cardQuantity;
                onAddToCart(product, totalUnits, unitType, cardQuantity);
                setCardQuantity(1);
                setUnitType('unidades');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 text-xs font-black py-2 px-2.5 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 shadow-xs font-mono tracking-wide"
            >
              <div className="flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{product.status === 'Importación próxima' ? 'Reservar' : '+ Carrito'}</span>
              </div>
            </button>
          </div>

          {/* Subtotal Equivalence Indicator */}
          {unitType === 'cajas' && product.unitsPerBox ? (
            <div className="text-[10px] text-center font-mono font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/50 rounded-lg py-1 mt-2">
              Llevarás {cardQuantity} caja{cardQuantity > 1 ? 's' : ''} ({cardQuantity * product.unitsPerBox} unidades)
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
