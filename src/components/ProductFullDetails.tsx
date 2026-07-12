import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Eye, 
  Package, 
  Sparkles, 
  Flame, 
  Calendar, 
  CheckCircle, 
  Info, 
  Layers, 
  Grid,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { incrementProductView } from '../firebase';

interface ProductFullDetailsProps {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
  onOrder: (product: Product, quantity: number, unitType?: 'unidades' | 'cajas', unitQuantity?: number) => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductFullDetails: React.FC<ProductFullDetailsProps> = ({
  product,
  allProducts,
  onClose,
  onOrder,
  onSelectProduct
}) => {
  const [unitType, setUnitType] = useState<'unidades' | 'cajas'>('unidades');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.imageUrl);
  const [successMsg, setSuccessMsg] = useState(false);

  const images = product.imageUrls && product.imageUrls.length > 0 
    ? product.imageUrls 
    : [product.imageUrl];

  useEffect(() => {
    if (product.id) {
      incrementProductView(product.id);
    }
    setActiveImage(product.imageUrl);
    setQuantity(1);
    setUnitType('unidades');
    setSuccessMsg(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handleAddToCart = () => {
    // calculate total items
    const finalQuantity = unitType === 'cajas' && product.unitsPerBox 
      ? quantity * product.unitsPerBox 
      : quantity;

    onOrder(product, finalQuantity, unitType, quantity);
    
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 3000);
  };

  // Find similar products in the same category (excluding current)
  const similarProducts = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 5);

  // If not enough similar products, pad with products from the same brand
  const brandFallback = similarProducts.length < 5
    ? allProducts
        .filter(p => p.brand === product.brand && p.id !== product.id && !similarProducts.some(s => s.id === p.id))
        .slice(0, 5 - similarProducts.length)
    : [];

  const recommendedProducts = [...similarProducts, ...brandFallback];

  const isOutOfStock = product.status === 'Agotado' || (product.stock !== undefined && product.stock <= 0);

  return (
    <div id="product-full-details-container" className="space-y-8 animate-fadeIn text-slate-800">
      
      {/* Top action header / Navigation breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          id="btn-back-to-catalog"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs font-black rounded-xl border border-slate-200 transition-all shadow-3xs cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-500" />
          Volver al Catálogo de Repuestos
        </button>

        <div className="text-[11px] font-mono text-slate-400">
          Usted está viendo: <span className="text-slate-600 font-semibold">{product.name}</span>
        </div>
      </div>

      {/* Main details content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        
        {/* Left Column: Image Gallery (lg:span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-150 aspect-square flex items-center justify-center p-4">
            <img 
              src={activeImage} 
              alt={product.name} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain max-h-[450px]"
            />
            
            {/* Fancy Badges on Gallery Main View */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {product.status === 'Nuevo' && (
                <span className="status-tag tag-new shadow-md flex items-center gap-1 uppercase font-mono text-[9px] font-black">
                  <Sparkles className="w-3 h-3" /> Nuevo Repuesto
                </span>
              )}
              {product.status === 'Promoción' && (
                <span className="status-tag tag-promo shadow-md flex items-center gap-1 uppercase font-mono text-[9px] font-black">
                  <Flame className="w-3 h-3" /> Oferta Especial
                </span>
              )}
              {product.status === 'Importación próxima' && (
                <span className="status-tag tag-china shadow-md flex items-center gap-1 uppercase font-mono text-[9px] font-black">
                  <Calendar className="w-3 h-3" /> Llegando de China
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails Gallery */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-1.5 scrollbar-thin">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 bg-white flex-shrink-0 transition-all ${
                    activeImage === img 
                      ? 'border-emerald-500 shadow-sm scale-95' 
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

        {/* Right Column: Information & Interactive Box (lg:span-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Header tags */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold tracking-wider px-3 py-1 rounded-lg uppercase border border-slate-200">
                Categoría: {product.category}
              </span>
              
              {product.code && (
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-mono font-black tracking-wider px-3 py-1 rounded-lg uppercase border border-emerald-200 shadow-3xs">
                  Código: {product.code}
                </span>
              )}

              {product.brand && (
                <span className="bg-slate-900 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-lg uppercase flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  {product.brand}
                </span>
              )}
            </div>

            {/* Title & popularity */}
            <div>
              <h2 className="text-xl md:text-2xl font-display font-black text-slate-900 leading-tight">
                {product.name}
              </h2>
              {product.views !== undefined && product.views > 0 && (
                <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px] mt-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Este repuesto ha sido visto {product.views} veces en el catálogo</span>
                </div>
              )}
            </div>

            {/* Description Block */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Descripción detallada</span>
              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                {product.description || 'No hay descripción disponible para este repuesto.'}
              </p>
            </div>

            {/* Core Specifications Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-100 py-4 font-mono text-xs">
              <div className="space-y-2">
                <p className="text-slate-600">
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">Motos Compatibles:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block text-[13px]">{product.motorcycleBrands || 'Compatibilidad universal / Consultar'}</span>
                </p>
                <p className="text-slate-600">
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">Colores de Repuesto:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block text-[13px]">{product.colors || 'Estándar / Original'}</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-slate-600">
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">Cantidad por Caja (Embalaje):</span>
                  <span className="font-bold text-emerald-600 mt-0.5 block text-[13px]">{product.unitsPerBox || 100} unidades por caja</span>
                </p>
                <p className="text-slate-600">
                  <span className="text-slate-400 font-bold block uppercase text-[9px] tracking-wider">Disponibilidad de Stock:</span>
                  <span className={`font-bold mt-0.5 block text-[13px] ${isOutOfStock ? 'text-rose-600' : 'text-slate-800'}`}>
                    {isOutOfStock ? 'Agotado (Bajo Pedido)' : `${product.stock || 10} unidades`}
                  </span>
                </p>
              </div>
            </div>

            {/* Upcoming import alert from china */}
            {product.status === 'Importación próxima' && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-200 rounded-2xl p-4 flex gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl self-start">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest block">🇨🇳 Importación Directa en Camino</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Este lote de repuestos se encuentra actualmente viajando desde fábrica en China. Puede reservarlo agregándolo a su lista de cotización para congelar el precio mayorista preferencial.
                  </p>
                  <p className="text-xs font-bold text-emerald-700 font-mono pt-1">
                    Arribo Estimado: {product.arrivalDate || 'Fines de mes'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Pricing and Order form card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4 shadow-3xs">
            
            {/* Wholesale vs Retail pricing banner */}
            <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Precio Mayorista *</span>
                <span className="text-xl font-display font-black text-slate-900 block mt-1">
                  S/. {(product.wholesalePrice || product.price || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Por caja o volumen</span>
              </div>
              <div className="pl-4 text-center sm:text-left">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Precio Minorista</span>
                <span className="text-xl font-display font-black text-emerald-600 block mt-1">
                  S/. {(product.retailPrice || product.price || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Por unidades sueltas</span>
              </div>
            </div>

            {/* Toggle buying by Units or by Boxes */}
            {product.unitsPerBox && product.unitsPerBox > 0 && (
              <div className="border-t border-slate-200/60 pt-3">
                <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-bold">Modalidad de Pedido:</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1 rounded-lg font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => { setUnitType('unidades'); setQuantity(1); }}
                    className={`py-2 rounded-md font-bold transition-all ${
                      unitType === 'unidades' 
                        ? 'bg-white text-slate-900 shadow-3xs' 
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Unidades Sueltas
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUnitType('cajas'); setQuantity(1); }}
                    className={`py-2 rounded-md font-bold transition-all ${
                      unitType === 'cajas' 
                        ? 'bg-white text-slate-900 shadow-3xs' 
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Por Caja ({product.unitsPerBox} u.)
                  </button>
                </div>
              </div>
            )}

            {/* Selector quantity and confirmation */}
            <div className="border-t border-slate-200/60 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-xs font-mono font-bold text-slate-600 uppercase">Cantidad:</span>
                
                <div className="flex items-center border border-slate-250 rounded-xl overflow-hidden bg-white shadow-3xs">
                  <button 
                    type="button"
                    onClick={handleDecrement}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold transition-colors border-r border-slate-200 select-none cursor-pointer disabled:opacity-40"
                    disabled={quantity <= 1 || isOutOfStock}
                  >
                    -
                  </button>
                  <span className="px-5 py-2 text-sm font-mono font-black text-slate-900 min-w-12 text-center">
                    {quantity}
                  </span>
                  <button 
                    type="button"
                    onClick={handleIncrement}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold transition-colors border-l border-slate-200 select-none cursor-pointer"
                    disabled={isOutOfStock}
                  >
                    +
                  </button>
                </div>

                <span className="text-xs font-mono font-bold text-slate-500">
                  {unitType === 'cajas' ? 'cajas' : 'unidades'}
                </span>
              </div>

              {/* Dynamic total quantity feedback */}
              {unitType === 'cajas' && product.unitsPerBox && (
                <div className="font-mono text-right text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-100">
                  Llevará un total de: <strong className="font-black text-emerald-950">{quantity * product.unitsPerBox}</strong> unidades sueltas
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button 
                id="btn-add-to-cart-fullscreen"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full text-slate-950 font-display font-black py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                  isOutOfStock 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                    : 'bg-emerald-500 hover:bg-emerald-450 active:scale-[0.99] cursor-pointer shadow-emerald-500/20'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                {isOutOfStock 
                  ? 'REPUESTO AGOTADO' 
                  : product.status === 'Importación próxima' 
                    ? 'Reservar Lote en mi Carrito' 
                    : 'Agregar al Carrito de Repuestos'
                }
              </button>

              {successMsg && (
                <div className="mt-2 text-center text-xs font-mono text-emerald-600 font-bold flex items-center justify-center gap-1 animate-pulse">
                  <CheckCircle className="w-4 h-4" />
                  ¡Repuesto agregado correctamente al carrito! Puedes verlo arriba.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Recommended/Similar products section */}
      <div id="similar-products-section" className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          <h3 className="font-display font-black text-base text-slate-900 uppercase tracking-wide">
            Productos Similares y Recomendados
          </h3>
        </div>
        
        {recommendedProducts.length === 0 ? (
          <p className="text-xs text-slate-400 font-mono">No hay otros productos similares registrados en este momento.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {recommendedProducts.map(p => (
              <div 
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="bg-white border border-slate-200 hover:border-emerald-500/50 rounded-2xl p-3 shadow-3xs transition-all hover:shadow-md cursor-pointer flex flex-col justify-between group h-full"
              >
                <div className="space-y-2">
                  {/* Image container */}
                  <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center relative p-1.5 border border-slate-100">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain transition-transform group-hover:scale-105 duration-300"
                    />
                    
                    {/* Status badge */}
                    {p.status && p.status !== 'Catálogo general' && (
                      <span className={`absolute top-1 left-1 font-mono text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                        p.status === 'Nuevo' ? 'bg-emerald-500 text-slate-950' :
                        p.status === 'Promoción' ? 'bg-amber-500 text-slate-950' :
                        'bg-blue-500 text-white'
                      }`}>
                        {p.status === 'Importación próxima' ? 'Llegando' : p.status}
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-mono font-bold uppercase text-slate-400 block">
                      {p.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">
                      {p.name}
                    </h4>
                    {p.code && (
                      <span className="inline-block text-[9px] font-mono bg-slate-100 text-slate-500 px-1 rounded uppercase">
                        {p.code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Por Mayor</span>
                  <span className="font-mono text-xs font-black text-slate-900">
                    S/. {(p.wholesalePrice || p.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
