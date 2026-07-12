import React, { useState, useEffect } from 'react';
import { Product, CATEGORIES, CartItem } from './types';
import { getProducts, getStoreConfig } from './firebase';
import { ProductCard } from './components/ProductCard';
import { ProductFullDetails } from './components/ProductFullDetails';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { OrderFormModal } from './components/OrderFormModal';
import { AdminPanel } from './components/AdminPanel';
const velkorBannerBgLocal = '/assets/images/velkor_banner.png';
import { 
  Wrench, 
  Search, 
  SlidersHorizontal, 
  BookOpen, 
  Sliders, 
  HelpCircle, 
  CheckCircle,
  Phone, 
  Send, 
  ChevronRight,
  Sparkles,
  Flame,
  Calendar,
  Grid,
  ClipboardList,
  ShoppingCart,
  Trash,
  X,
  Plus
} from 'lucide-react';

export default function App() {
  // Navigation: 'catalog' | 'history' | 'admin'
  const [activeView, setActiveView] = useState<'catalog' | 'history' | 'admin'>('catalog');

  // Dynamic asset URLs with fallback to local bundled assets
  const [bannerUrl, setBannerUrl] = useState<string>(velkorBannerBgLocal);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load store configuration from Firestore first
    getStoreConfig().then(config => {
      if (config) {
        if (config.bannerUrl) {
          setBannerUrl(config.bannerUrl);
        } else {
          tryFallbackBanner();
        }
        if (config.logoUrl) {
          setLogoUrl(config.logoUrl);
        } else {
          tryFallbackLogo();
        }
      } else {
        tryFallbackBanner();
        tryFallbackLogo();
      }
    }).catch(err => {
      console.warn("Could not fetch store config from firestore, using fallbacks:", err);
      tryFallbackBanner();
      tryFallbackLogo();
    });

    function tryFallbackBanner() {
      const fbBannerUrl1 = "https://firebasestorage.googleapis.com/v0/b/velkor-importaciones-sac.firebasestorage.app/o/velkor_banner_bg.jpg?alt=media";
      const fbBannerUrl2 = "https://firebasestorage.googleapis.com/v0/b/velkor-importaciones-sac.appspot.com/o/velkor_banner_bg.jpg?alt=media";
      
      const bannerImg = new Image();
      bannerImg.src = fbBannerUrl1;
      bannerImg.onload = () => setBannerUrl(fbBannerUrl1);
      bannerImg.onerror = () => {
        const bannerImg2 = new Image();
        bannerImg2.src = fbBannerUrl2;
        bannerImg2.onload = () => setBannerUrl(fbBannerUrl2);
      };
    }

    function tryFallbackLogo() {
      const fbLogoUrl1 = "https://firebasestorage.googleapis.com/v0/b/velkor-importaciones-sac.firebasestorage.app/o/logo.png?alt=media";
      const fbLogoUrl2 = "https://firebasestorage.googleapis.com/v0/b/velkor-importaciones-sac.appspot.com/o/logo.png?alt=media";

      const logoImg = new Image();
      logoImg.src = fbLogoUrl1;
      logoImg.onload = () => setLogoUrl(fbLogoUrl1);
      logoImg.onerror = () => {
        const logoImg2 = new Image();
        logoImg2.src = fbLogoUrl2;
        logoImg2.onload = () => setLogoUrl(fbLogoUrl2);
      };
    }
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [desktopCols, setDesktopCols] = useState<4 | 5 | 6>(5);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Pagination / Lazy Loading
  const [visibleCount, setVisibleCount] = useState(24);

  // Reset pagination when search query, selected category, or status changes
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedCategory, selectedStatus]);

  const getGridColsClass = () => {
    switch (desktopCols) {
      case 4:
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3';
      case 6:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3';
      case 5:
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3';
    }
  };

  const banners = [
    {
      badge: "🇨🇳 IMPORTACIÓN CHINA DIRECTA",
      title: "VELKOR IMPORTACIONES",
      desc: "Repuestos y accesorios premium de alta calidad al por mayor y menor.",
      image: bannerUrl,
      actionText: "Explorar Repuestos",
      statusFilter: "Todos"
    },
    {
      badge: "🔥 OFERTAS ESPECIALES",
      title: "LIQUIDACIÓN Y DESCUENTOS",
      desc: "Hasta un 30% de descuento directo en piezas seleccionadas.",
      image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      actionText: "Ver Promociones",
      statusFilter: "Promoción"
    },
    {
      badge: "⚡ NOVEDADES E INGRESOS",
      title: "NUEVAS PIEZAS ADQUIRIDAS",
      desc: "Componentes recién llegados con tecnología y durabilidad superior.",
      image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80",
      actionText: "Ver Novedades",
      statusFilter: "Nuevo"
    }
  ];

  useEffect(() => {
    if (activeView !== 'catalog') return;
    const interval = setInterval(() => {
      setActiveBannerIdx(prev => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeView, banners.length]);


  // Modals state
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);

  // Client local orders history loaded from localStorage
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // Shopping Cart States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartCheckoutOpen, setIsCartCheckoutOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('velkor_shopping_cart') || '[]');
    } catch {
      return [];
    }
  });

  // Sync effect for shopping cart
  useEffect(() => {
    localStorage.setItem('velkor_shopping_cart', JSON.stringify(cart));
  }, [cart]);

  const handleAddToCart = (product: Product, quantity: number, unitType?: 'unidades' | 'cajas', unitQuantity?: number) => {
    const finalUnitType = unitType || 'unidades';
    const finalUnitQuantity = unitQuantity ?? quantity;

    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.product.id === product.id && 
        (item.unitType || 'unidades') === finalUnitType
      );
      if (existingIdx !== -1) {
        const updated = [...prev];
        const prevUnitQty = updated[existingIdx].unitQuantity ?? updated[existingIdx].quantity;
        const newUnitQuantity = prevUnitQty + finalUnitQuantity;
        const newTotalQuantity = finalUnitType === 'cajas' && product.unitsPerBox 
          ? newUnitQuantity * product.unitsPerBox 
          : newUnitQuantity;

        updated[existingIdx] = {
          ...updated[existingIdx],
          unitQuantity: newUnitQuantity,
          quantity: newTotalQuantity
        };
        return updated;
      } else {
        return [...prev, { 
          product, 
          quantity, 
          unitType: finalUnitType, 
          unitQuantity: finalUnitQuantity 
        }];
      }
    });
    setIsCartOpen(true);
    setSelectedProductDetails(null); // Close details modal if open
  };

  // Path & Hash based SPA routing for custom link /admin support
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path === '/admin' || 
        path === '/admi' || 
        hash === '#/admin' || 
        hash === '#admin' || 
        hash === '#/admi' || 
        hash === '#admi'
      ) {
        setActiveView('admin');
      } else if (hash === '#/history' || hash === '#history') {
        setActiveView('history');
      } else {
        setActiveView('catalog');
      }
    };

    // Run initially
    handleUrlRouting();

    window.addEventListener('popstate', handleUrlRouting);
    window.addEventListener('hashchange', handleUrlRouting);
    return () => {
      window.removeEventListener('popstate', handleUrlRouting);
      window.removeEventListener('hashchange', handleUrlRouting);
    };
  }, []);

  const handleNavigate = (view: 'catalog' | 'history' | 'admin') => {
    setActiveView(view);
    if (view === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else if (view === 'history') {
      window.history.pushState(null, '', '/#history');
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  useEffect(() => {
    const fetchProds = async () => {
      setLoading(true);
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProds();

    // Load local history
    const history = JSON.parse(localStorage.getItem('velkor_local_orders') || '[]');
    setLocalHistory(history);
  }, []);

  const refreshLocalHistory = () => {
    const history = JSON.parse(localStorage.getItem('velkor_local_orders') || '[]');
    setLocalHistory(history);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductDetails(product);
  };

  const handleOrderProduct = (product: Product, quantity = 1) => {
    setSelectedProductDetails(null);
    setSelectedProductForOrder(product);
    setOrderQuantity(quantity);
  };

  const handleOrderSuccess = () => {
    setSelectedProductForOrder(null);
    refreshLocalHistory();
    // Refresh products to reload stock values and sales counters
    getProducts().then(setProducts);
  };

  // Filters logic - client catalog views
  const filteredProducts = products.filter(p => {
    // Hide 'Agotado' marked products completely from public customer catalog
    if (p.status === 'Agotado') {
      return false;
    }

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'Todos' || p.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AdminPanel />
        
        {/* Render modal overlays for admin just in case */}
        {selectedProductDetails && (
          <ProductDetailsModal 
            product={selectedProductDetails} 
            onClose={() => setSelectedProductDetails(null)} 
            onOrder={handleOrderProduct} 
          />
        )}
        {selectedProductForOrder && (
          <OrderFormModal 
            product={selectedProductForOrder} 
            quantity={orderQuantity} 
            onClose={() => setSelectedProductForOrder(null)} 
            onSuccess={handleOrderSuccess} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-16 md:pb-0">
      {/* 1. Header (Dynamic Navigation Branding) */}
      <header className="bg-white/95 text-slate-900 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Corporate Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate('catalog')}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold shadow-md overflow-hidden ${logoUrl ? 'bg-white border border-slate-200' : 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'}`}>
              {logoUrl ? (
                <img src={logoUrl} alt="Velkor Logo" className="w-full h-full object-contain p-0.5" />
              ) : (
                <Wrench className="w-5 h-5 text-slate-950 animate-spin-slow" style={{ animationDuration: '6s' }} />
              )}
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-tight leading-none flex items-center gap-1">
                VELKOR <span className="text-emerald-500">IMPORTACIONES</span>
              </h1>
              <p className="text-[10px] text-slate-500 tracking-wider font-mono uppercase mt-1">
                REPUESTOS DE MOTOS — VENTA POR MAYOR Y MENOR PERÚ
              </p>
            </div>
          </div>

          {/* Desktop Navigation Link Toggles & Shopping Cart */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-sm font-mono font-bold">
              <button 
                id="nav-catalog-desktop"
                onClick={() => handleNavigate('catalog')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${activeView === 'catalog' ? 'bg-emerald-500 text-slate-950' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <BookOpen className="w-4 h-4" />
                Catálogo de Repuestos
              </button>
              <button 
                id="nav-history-desktop"
                onClick={() => { handleNavigate('history'); refreshLocalHistory(); }}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${activeView === 'history' ? 'bg-emerald-500 text-slate-950' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <ClipboardList className="w-4 h-4" />
                Mis Pedidos
              </button>
            </nav>

            <button
              id="btn-cart-desktop"
              onClick={() => setIsCartOpen(true)}
              className="relative bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>Mi Carrito ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Compact Rotative Banner Hero (Active only on Catalog view when no product is selected) */}
      {activeView === 'catalog' && !selectedProductDetails && (
        <div 
          id="hero-banner"
          className="relative w-full overflow-hidden h-[2500px] md:h-[280px] border-b border-slate-200 bg-slate-900 text-white select-none transition-all duration-700 ease-in-out"
          style={{ backgroundImage: `url(${banners[activeBannerIdx].image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {/* Overlay to darken background for high contrast text readability */}
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="relative z-10 max-w-7xl w-full h-full mx-auto px-4 sm:px-6 flex flex-col justify-center space-y-1.5 md:space-y-2">
            <div>
              <span className="inline-block bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] md:text-[10px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-wider">
                {banners[activeBannerIdx].badge}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight uppercase leading-none transition-all duration-500">
              {banners[activeBannerIdx].title}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-1 font-sans font-medium">
              {banners[activeBannerIdx].desc}
            </p>

            <div className="pt-1 flex items-center gap-3">
              <button 
                id="hero-scroll-to-products"
                onClick={() => {
                  const filterVal = banners[activeBannerIdx].statusFilter;
                  if (filterVal) {
                    if (filterVal === 'Todos') {
                      setSelectedStatus('Todos');
                    } else {
                      setSelectedStatus(filterVal);
                    }
                  }
                  const element = document.getElementById('catalog-filters-section');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-[10px] md:text-xs px-4 py-2 rounded-lg shadow-md shadow-emerald-500/10 transition-all font-mono uppercase tracking-wider group"
              >
                <span>{banners[activeBannerIdx].actionText}</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Dots Indicator for Banners */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBannerIdx(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activeBannerIdx ? 'bg-emerald-500 w-3' : 'bg-white/40 hover:bg-white/75'}`}
                aria-label={`Ir al banner ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* ==================== VIEW A: CATALOG ==================== */}
        {activeView === 'catalog' && (
          selectedProductDetails ? (
            <ProductFullDetails 
              product={selectedProductDetails}
              allProducts={products}
              onClose={() => setSelectedProductDetails(null)}
              onOrder={handleAddToCart}
              onSelectProduct={setSelectedProductDetails}
            />
          ) : (
            <div id="catalog-view" className="space-y-6 animate-fadeIn">
            
            {/* Catalog Filter controls (Search & Filters Row) */}
            <div id="catalog-filters-section" className="bg-white border border-slate-200 rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-3 scroll-mt-24">
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
                {/* Search Bar Input (Reduced vertical footprint) */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    id="catalog-search-input"
                    type="text"
                    placeholder="Buscar repuesto..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg pl-8.5 pr-14 py-1.5 text-xs h-8.5 focus:outline-hidden transition-colors text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button 
                      id="catalog-clear-search"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
 
                {/* Status Filter Tab Buttons (Reduced sizes) */}
                <div className="flex overflow-x-auto gap-1 pb-0.5 md:pb-0 scrollbar-none font-mono text-[10px] shrink-0">
                  {[
                    { id: 'Todos', label: 'Todos', icon: Grid },
                    { id: 'Nuevo', label: 'Nuevos', icon: Sparkles, color: 'text-emerald-500' },
                    { id: 'Promoción', label: 'Promos', icon: Flame, color: 'text-orange-500' },
                    { id: 'Importación próxima', label: 'Por Llegar', icon: Calendar, color: 'text-blue-500' },
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = selectedStatus === tab.id;
                    return (
                      <button
                        id={`filter-status-${tab.id}`}
                        key={tab.id}
                        onClick={() => setSelectedStatus(tab.id)}
                        className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1 whitespace-nowrap transition-all h-8.5 ${
                          isActive 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <TabIcon className={`w-3 h-3 ${tab.color || ''}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
 
              {/* Categories Navigation Badges - Scroll horizontal in mobile without wrap */}
              <div className="border-t border-slate-100 pt-2 flex items-center w-full overflow-hidden">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-2 shrink-0 hidden sm:inline-block">Categorías:</span>
                
                <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5 gap-1.5 w-full md:flex-wrap items-center">
                  <button
                    id="category-all-btn"
                    onClick={() => setSelectedCategory('Todos')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                      selectedCategory === 'Todos'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Ver Todo
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      id={`category-btn-${cat}`}
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products grid density bar & summary */}
            <div className="flex justify-between items-center text-xs text-slate-500 font-mono pt-1">
              <div>
                Encontrados: <strong className="text-slate-800 font-bold">{filteredProducts.length}</strong> repuestos
              </div>
              
              {/* Columns switcher (visible only on desktop >= 1024px) */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase px-1">Columnas:</span>
                {[4, 5, 6].map(cols => (
                  <button
                    key={cols}
                    onClick={() => setDesktopCols(cols as 4 | 5 | 6)}
                    className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] transition-all ${
                      desktopCols === cols 
                        ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/60' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid View */}
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm font-mono">Cargando catálogo inteligente de repuestos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto">
                <HelpCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <h3 className="font-display font-extrabold text-base text-slate-900">Sin resultados en catálogo</h3>
                <p className="text-slate-500 text-xs mt-1 px-4">
                  No encontramos repuestos que coincidan con la búsqueda "{searchQuery}" o con los filtros activos. Intente removiendo filtros.
                </p>
                <button 
                  id="reset-catalog-filters"
                  onClick={() => { setSelectedCategory('Todos'); setSelectedStatus('Todos'); setSearchQuery(''); }}
                  className="mt-4 bg-slate-100 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-all font-mono border border-slate-200"
                >
                  Restablecer Catálogo
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={getGridColsClass()}>
                  {filteredProducts.slice(0, visibleCount).map(p => (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      onSelect={handleSelectProduct} 
                      onAddToCart={handleAddToCart} 
                    />
                  ))}
                </div>

                {/* Pagination Load More Controls */}
                {filteredProducts.length > visibleCount && (
                  <div className="flex flex-col items-center justify-center pt-4 pb-8 space-y-2">
                    <button
                      id="btn-load-more"
                      onClick={() => setVisibleCount(prev => prev + 24)}
                      className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-800 font-mono text-xs font-black rounded-xl border border-slate-200 hover:border-emerald-500/40 transition-all shadow-3xs cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4 text-emerald-500 animate-pulse" />
                      Cargar más repuestos en catálogo
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Mostrando {Math.min(visibleCount, filteredProducts.length)} de {filteredProducts.length} repuestos
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

        {/* ==================== VIEW B: CLIENT HISTORY ==================== */}
        {activeView === 'history' && (
          <div id="history-view" className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-slate-800">
              <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
                Historial de Mis Consultas / Pedidos
              </h2>
              <p className="text-slate-500 text-xs leading-normal">
                Aquí puedes revisar los repuestos que has solicitado a través de esta plataforma en este navegador. Tus pedidos se registran de forma segura en nuestra base de datos.
              </p>

              {localHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl mt-6">
                  Todavía no has registrado ninguna solicitud de repuesto. ¡Visita el catálogo para iniciar un pedido!
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {localHistory.map((h, idx) => {
                    const matchedProduct = products.find(p => p.id === h.productId || p.name === h.productName);
                    const displayImage = h.imageUrl || matchedProduct?.imageUrl;
                    const displayCategory = h.category || matchedProduct?.category;
                    const displayPrice = h.productPrice !== undefined ? h.productPrice : (matchedProduct?.showPrice ? matchedProduct.price : undefined);
                    const hasPrice = h.productPrice !== undefined ? (h.productPrice > 0) : (matchedProduct?.showPrice);
                    
                    const fallbackProduct: Product = {
                      id: h.productId || '',
                      name: h.productName,
                      price: displayPrice || 0,
                      showPrice: hasPrice ?? true,
                      category: displayCategory || 'Accesorios',
                      status: 'Catálogo general',
                      description: `Detalle histórico del repuesto solicitado el ${h.createdAt ? new Date(h.createdAt).toLocaleDateString('es-PE') : 'recientemente'}. Solicitud: ${h.requestType || 'Compra directa'}. Método de Pago: ${h.paymentMethod || 'Acordar con administrador'}.`,
                      imageUrl: displayImage || '',
                      imageUrls: h.imageUrls || (displayImage ? [displayImage] : [])
                    };

                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleSelectProduct(matchedProduct || fallbackProduct)}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-emerald-400 hover:bg-slate-100/60 cursor-pointer active:scale-[0.995]"
                      >
                        <div className="flex items-start gap-3">
                          {displayImage ? (
                            <img 
                              src={displayImage} 
                              alt={h.productName} 
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Wrench className="w-6 h-6" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {displayCategory && (
                                <span className="bg-slate-200/60 text-slate-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                                  {displayCategory}
                                </span>
                              )}
                              {h.createdAt && (
                                <span className="text-slate-400 text-[10px] font-mono">
                                  {new Date(h.createdAt).toLocaleDateString('es-PE')}
                                </span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-sm leading-tight">
                              {matchedProduct?.code && (
                                <span className="text-emerald-700 font-mono text-[10px] font-black mr-1 bg-emerald-100 px-1 py-0.5 rounded border border-emerald-200">
                                  {matchedProduct.code}
                                </span>
                              )}
                              {h.productName}
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500">
                              <span>
                                Cantidad:{' '}
                                <strong className="text-slate-950 font-black">
                                  {h.unitType === 'cajas' ? `${h.selectedQuantity ?? Math.ceil(h.quantity / (matchedProduct?.unitsPerBox || 1))} caja(s) (${h.quantity} u.)` : `${h.quantity} und.`}
                                </strong>
                              </span>
                            </div>
                            
                            {(h.requestType || h.paymentMethod) && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {h.requestType && (
                                  <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded font-medium">
                                    {h.requestType}
                                  </span>
                                )}
                                {h.paymentMethod && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-medium">
                                    {h.paymentMethod}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t md:border-t-0 border-slate-200/60 pt-3 md:pt-0 shrink-0">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg shadow-2xs">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            {h.status || 'Registrado'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <button
                  id="history-back-to-catalog"
                  onClick={() => handleNavigate('catalog')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2.5 px-5 rounded-lg transition-all font-mono"
                >
                  Volver al Catálogo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW C: ADMIN TAB ==================== */}
        {activeView === 'admin' && (
          <div id="admin-view" className="animate-fadeIn">
            <AdminPanel />
          </div>
        )}

      </main>

      {/* 3. Footer / Corporate Credentials */}
      <footer className="bg-black text-neutral-400 text-xs py-10 pb-24 md:pb-12 border-t border-neutral-900 font-mono">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left mb-8">
            
            {/* Column 1: Brand details */}
            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                {logoUrl ? (
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center p-0.5 border border-neutral-800 shadow-inner overflow-hidden">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                )}
                <span className="text-white font-display font-black tracking-wider uppercase text-sm">VELKOR IMPORTACIONES</span>
              </div>
              <p className="text-neutral-500 text-xs font-sans max-w-sm mx-auto md:mx-0">
                Tu importador directo de repuestos de calidad premium desde China. Abastecemos al mercado mayorista de motocicletas en todo el Perú con los mejores precios y stock garantizado.
              </p>
              <p className="text-[10px] text-neutral-600">
                RUC: 20609827412 — Lima, Perú
              </p>
            </div>

            {/* Column 2: Social Media (TikTok, Facebook, WhatsApp) */}
            <div className="space-y-4 flex flex-col items-center">
              <span className="text-white font-display font-black tracking-wider uppercase text-xs">Conéctate con Nosotros</span>
              <div className="flex justify-center gap-3">
                {/* Facebook */}
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 hover:bg-blue-600 hover:text-white border border-neutral-800 hover:border-blue-500 text-neutral-400 transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
                  title="Síguenos en Facebook"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>

                {/* TikTok */}
                <a 
                  href="https://tiktok.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 hover:text-white border border-neutral-800 hover:border-neutral-700 text-neutral-400 transition-all duration-300 transform hover:-translate-y-1 shadow-lg relative overflow-hidden group"
                  title="Síguenos en TikTok"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-cyan-400 via-transparent to-rose-500 -z-10" />
                  <div className="absolute inset-[1px] bg-neutral-900 group-hover:bg-neutral-950 rounded-full -z-10" />
                  
                  <svg className="w-4 h-4 fill-current group-hover:text-white" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.05-1.45-.11-.08-.12-.04-.12.07-.02 2.78.01 5.56-.02 8.33-.12 2.11-.83 4.21-2.22 5.81-1.39 1.6-3.4 2.62-5.49 2.91-2.11.3-4.32-.1-6.11-1.25-1.79-1.15-3.07-3-3.49-5.08-.42-2.07-.01-4.3 1.11-6.04C3.84 8.65 5.76 7.42 7.89 7.1c1.55-.23 3.16-.01 4.59.62.09.04.12.02.12-.08-.01-1.37 0-2.75 0-4.13-.01-1.16-.01-2.31-.02-3.47h-.05zm-4.72 11c-.7.08-1.39.42-1.89.92-.51.5-.83 1.19-.91 1.89-.08.7.1 1.43.51 2.01.41.58 1.05.97 1.74 1.09.7.11 1.44-.01 2.04-.4.6-.39 1.04-1.01 1.21-1.71.18-.7.08-1.47-.28-2.11-.36-.65-.96-1.14-1.67-1.32-.24-.07-.54-.15-.75-.37v.09z"/>
                  </svg>
                </a>

                {/* WhatsApp */}
                <a 
                  href="https://wa.me/51999999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 hover:bg-emerald-500 hover:text-white border border-neutral-800 hover:border-emerald-400 text-neutral-400 transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
                  title="Contáctanos por WhatsApp"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.019-5.101-2.873-6.958C16.608 1.982 14.135.96 11.51.959c-5.44 0-9.866 4.415-9.868 9.851-.001 1.714.453 3.39 1.316 4.873L1.99 21.91l6.326-1.659zM17.56 14.5c-.327-.164-1.93-.955-2.229-1.062-.298-.11-.517-.164-.734.164-.217.327-.844 1.062-1.035 1.281-.19.219-.382.246-.71.082-.327-.164-1.383-.51-2.637-1.627-.974-.871-1.632-1.947-1.823-2.275-.19-.327-.02-.504.143-.667.148-.147.328-.382.492-.573.164-.191.218-.328.327-.546.11-.219.055-.41-.027-.573-.082-.164-.734-1.77-.101-1.93-.3-.1-.58-.1-.774-.1-.19 0-.492.07-.75.355-.258.283-.984.955-.984 2.33 0 1.375 1.004 2.703 1.144 2.893.14.19 1.976 3.018 4.786 4.227.669.288 1.191.46 1.598.59.673.214 1.285.184 1.768.111.54-.082 1.93-.791 2.203-1.52.274-.727.274-1.355.191-1.487-.083-.131-.299-.213-.627-.377z"/>
                  </svg>
                </a>
              </div>
              <p className="text-[10px] text-neutral-500 text-center font-sans">
                ¿Tienes consultas? Envíanos un mensaje y te atenderemos al instante.
              </p>
            </div>

            {/* Column 3: Logistics & Values */}
            <div className="space-y-3 md:text-right">
              <span className="text-white font-display font-black tracking-wider uppercase text-xs block">Nuestra Garantía</span>
              <ul className="text-neutral-500 text-xs font-sans space-y-1.5">
                <li>🚢 Importación Directa sin Intermediarios</li>
                <li>📦 Pedidos consolidados y etiquetados</li>
                <li>🔧 Repuestos de Motocicletas Certificados</li>
                <li>🇵🇪 Distribución a todas las Regiones del Perú</li>
              </ul>
            </div>

          </div>

          {/* Bottom thin copyright bar */}
          <div className="pt-6 border-t border-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-[10px] text-neutral-600">
            <p>© 2026 VELKOR IMPORTACIONES S.A.C. Todos los derechos reservados.</p>
            <p className="font-sans">Despacho seguro y eficiente para mayoristas</p>
          </div>
        </div>
      </footer>

      {/* 4. Bottom Tabbed Navigation (Crucial for Mobile Viewport) */}
      <div 
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 border-t border-neutral-900 p-2 flex justify-around items-center z-40 shadow-xl backdrop-blur-md"
      >
        <button
          id="btn-nav-catalog-mobile"
          onClick={() => handleNavigate('catalog')}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono font-bold py-1.5 px-3 rounded-lg transition-all ${
            activeView === 'catalog' ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Catálogo
        </button>

        <button
          id="btn-nav-cart-mobile"
          onClick={() => setIsCartOpen(true)}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono font-bold py-1.5 px-3 rounded-lg transition-all relative ${
            isCartOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          Carrito
          {cart.length > 0 && (
            <span className="absolute top-1 right-2 bg-emerald-500 text-slate-950 font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>

        <button
          id="btn-nav-history-mobile"
          onClick={() => { handleNavigate('history'); refreshLocalHistory(); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono font-bold py-1.5 px-3 rounded-lg transition-all ${
            activeView === 'history' ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          Mis Pedidos
        </button>
      </div>

      {/* 5. OVERLAYS & MODALS */}

      {/* Checkout WhatsApp Request Form Overlay */}
      {isCartCheckoutOpen && (
        <OrderFormModal 
          cartItems={cart} 
          onClose={() => setIsCartCheckoutOpen(false)} 
          onSuccess={() => {
            setIsCartCheckoutOpen(false);
            setCart([]); // Clear the shopping cart
            refreshLocalHistory();
            getProducts().then(setProducts);
          }} 
        />
      )}

      {/* Shopping Cart Drawer Overlap */}
      {isCartOpen && (
        <div id="cart-drawer-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
          
          <div 
            id="cart-drawer"
            className="relative bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-slideLeft text-slate-900 z-10"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                <h3 className="font-display font-black text-base text-slate-900">Tu Carrito de Repuestos</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} und.
                </span>
              </div>
              <button 
                id="close-cart-drawer"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-850"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <ShoppingCart className="w-16 h-16 text-slate-200 mb-3" />
                  <p className="font-display font-extrabold text-sm text-slate-700">Tu carrito está vacío</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                    Explora nuestro catálogo de repuestos de calidad y agrega productos para iniciar tu pedido.
                  </p>
                  <button
                    onClick={() => { setIsCartOpen(false); handleNavigate('catalog'); }}
                    className="mt-4 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-mono text-xs font-bold px-4 py-2 rounded-lg transition-all"
                  >
                    Ver Catálogo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => {
                    const hasPrice = item.product.showPrice;
                    const price = item.product.showPrice ? item.product.price : 0;
                    return (
                      <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-3xs transition-all hover:border-slate-300">
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded uppercase">
                              {item.product.category}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-xs md:text-sm truncate leading-tight mt-0.5">
                              {item.product.name}
                            </h4>
                          </div>

                          {/* Quantity Selector inside cart */}
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center border border-slate-250 rounded bg-white overflow-hidden h-7">
                                <button
                                  type="button"
                                  id={`btn-cart-decrement-item-${item.product.id}`}
                                  onClick={() => {
                                    setCart(prev => prev.map((c, i) => {
                                      if (i === idx) {
                                        const currentUnitQty = c.unitQuantity ?? c.quantity;
                                        const nextUnitQty = Math.max(1, currentUnitQty - 1);
                                        const nextQuantity = c.unitType === 'cajas' && c.product.unitsPerBox ? nextUnitQty * c.product.unitsPerBox : nextUnitQty;
                                        return {
                                          ...c,
                                          unitQuantity: nextUnitQty,
                                          quantity: nextQuantity
                                        };
                                      }
                                      return c;
                                    }));
                                  }}
                                  className="px-2 h-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold text-slate-800 w-6 text-center">
                                  {item.unitQuantity ?? item.quantity}
                                </span>
                                <button
                                  type="button"
                                  id={`btn-cart-increment-item-${item.product.id}`}
                                  onClick={() => {
                                    setCart(prev => prev.map((c, i) => {
                                      if (i === idx) {
                                        const currentUnitQty = c.unitQuantity ?? c.quantity;
                                        const nextUnitQty = currentUnitQty + 1;
                                        const nextQuantity = c.unitType === 'cajas' && c.product.unitsPerBox ? nextUnitQty * c.product.unitsPerBox : nextUnitQty;
                                        return {
                                          ...c,
                                          unitQuantity: nextUnitQty,
                                          quantity: nextQuantity
                                        };
                                      }
                                      return c;
                                    }));
                                  }}
                                  className="px-2 h-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <span className="text-[11px] font-mono font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {item.unitType === 'cajas' ? `caja(s) (${item.quantity} u.)` : 'unid.'}
                              </span>

                              {/* Remove item button */}
                              <button
                                id={`btn-cart-remove-item-${item.product.id}`}
                                onClick={() => {
                                  setCart(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded border border-transparent hover:border-rose-200 transition-colors ml-auto"
                                title="Eliminar repuesto"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 shrink-0">
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between text-xs text-slate-700 font-bold">
                    <span>Total de Repuestos a Cotizar:</span>
                    <span className="text-emerald-600">{cart.reduce((sum, item) => sum + item.quantity, 0)} und.</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    * Al enviar el pedido, nuestro personal verificará la disponibilidad y el volumen de su solicitud para enviarle una cotización formal y los mejores precios mayoristas del mercado peruano.
                  </p>
                </div>

                <button
                  id="btn-cart-checkout"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCartCheckoutOpen(true);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-450 active:scale-[0.98] text-slate-950 font-display font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg tracking-wide uppercase text-sm"
                >
                  <Send className="w-4 h-4" />
                  Confirmar y Enviar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation Bar for Mobile (Only visible on screens < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => handleNavigate('catalog')}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono font-black transition-all ${
            activeView === 'catalog' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Catálogo</span>
        </button>

        {/* Floating Elevated Cart Trigger with real-time indicator badge */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative -top-5 w-12 h-12 rounded-full bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40 border-4 border-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        >
          <ShoppingCart className="w-5 h-5 text-slate-950" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] font-black min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center border border-white">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => { handleNavigate('history'); refreshLocalHistory(); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono font-black transition-all ${
            activeView === 'history' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Mis Pedidos</span>
        </button>
      </div>

    </div>
  );
}
