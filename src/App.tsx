import React, { useState, useEffect } from 'react';
import { Product, CATEGORIES } from './types';
import { getProducts } from './firebase';
import { ProductCard } from './components/ProductCard';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { OrderFormModal } from './components/OrderFormModal';
import { AdminPanel } from './components/AdminPanel';
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
  ClipboardList
} from 'lucide-react';

export default function App() {
  // Navigation: 'catalog' | 'history' | 'admin'
  const [activeView, setActiveView] = useState<'catalog' | 'history' | 'admin'>('catalog');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');

  // Modals state
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);

  // Client local orders history loaded from localStorage
  const [localHistory, setLocalHistory] = useState<any[]>([]);

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
    <div className="min-h-screen bg-[#050505] text-white flex flex-col pb-20 md:pb-6">
      {/* 1. Header (Dynamic Navigation Branding) */}
      <header className="bg-black/95 text-white border-b border-neutral-900 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Corporate Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate('catalog')}>
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black font-extrabold shadow-md shadow-emerald-500/20">
              <Wrench className="w-5 h-5 text-black animate-spin-slow" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-tight leading-none flex items-center gap-1">
                VELKOR <span className="text-emerald-500">IMPORTACIONES</span>
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider font-mono uppercase mt-1">
                REPUESTOS DE MOTOS — VENTA POR MAYOR Y MENOR PERÚ
              </p>
            </div>
          </div>

          {/* Desktop Navigation Link Toggles */}
          <nav className="hidden md:flex items-center bg-neutral-950 border border-neutral-850 rounded-lg p-1 text-sm font-mono font-bold">
            <button 
              id="nav-catalog-desktop"
              onClick={() => handleNavigate('catalog')}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${activeView === 'catalog' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'}`}
            >
              <BookOpen className="w-4 h-4" />
              Catálogo de Repuestos
            </button>
            <button 
              id="nav-history-desktop"
              onClick={() => { handleNavigate('history'); refreshLocalHistory(); }}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${activeView === 'history' ? 'bg-emerald-500 text-black' : 'text-neutral-400 hover:text-white'}`}
            >
              <ClipboardList className="w-4 h-4" />
              Mis Pedidos
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* ==================== VIEW A: CATALOG ==================== */}
        {activeView === 'catalog' && (
          <div id="catalog-view" className="space-y-6 animate-fadeIn">
            
            {/* China Import Campaign Hero Announcement Banner */}
            <div className="bento-card relative bg-[#111111] text-white p-5 md:p-6 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="space-y-2 relative z-10">
                <span className="bg-emerald-500 text-black text-[9px] font-mono font-black px-2.5 py-1 rounded-sm uppercase tracking-widest">
                  🇨🇳 IMPORTACIÓN CHINA EN CAMINO
                </span>
                <h2 className="text-xl md:text-2xl font-display font-black tracking-tight leading-tight text-white">
                  Asegura Stock Mayorista con un 20% de Adelanto
                </h2>
                <p className="text-neutral-400 text-xs md:text-sm max-w-2xl leading-relaxed">
                  Estamos importando contenedores directo desde las mejores fábricas chinas. Reserva los repuestos del catálogo catalogados como <strong>"Por Llegar"</strong> para asegurar precios preferenciales.
                </p>
              </div>
              <button 
                id="hero-see-upcoming"
                onClick={() => { setSelectedStatus('Importación próxima'); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-display font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center gap-1.5 whitespace-nowrap self-stretch md:self-auto justify-center font-mono uppercase tracking-wider"
              >
                Ver por llegar
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Catalog Filter controls (Search & Filters Row) */}
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Bar Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    id="catalog-search-input"
                    type="text"
                    placeholder="Buscar repuesto (ej: filtro, Honda, pastillas, kit de arrastre...)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-hidden transition-colors text-white"
                  />
                  {searchQuery && (
                    <button 
                      id="catalog-clear-search"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400 hover:text-neutral-200"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Status Filter Tab Buttons */}
                <div className="flex overflow-x-auto gap-1.5 pb-1 md:pb-0 scrollbar-none font-mono text-xs">
                  {[
                    { id: 'Todos', label: 'Todos', icon: Grid },
                    { id: 'Nuevo', label: 'Nuevos', icon: Sparkles, color: 'text-emerald-400' },
                    { id: 'Promoción', label: 'Promociones', icon: Flame, color: 'text-amber-400' },
                    { id: 'Importación próxima', label: 'Por Llegar', icon: Calendar, color: 'text-blue-400' },
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = selectedStatus === tab.id;
                    return (
                      <button
                        id={`filter-status-${tab.id}`}
                        key={tab.id}
                        onClick={() => setSelectedStatus(tab.id)}
                        className={`px-3 py-2 rounded-xl border font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                          isActive 
                            ? 'bg-emerald-500 text-black border-emerald-500' 
                            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                        }`}
                      >
                        <TabIcon className={`w-3.5 h-3.5 ${tab.color || ''}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categories Navigation Badges */}
              <div className="border-t border-neutral-800 pt-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mr-2">Categoría:</span>
                <button
                  id="category-all-btn"
                  onClick={() => setSelectedCategory('Todos')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCategory === 'Todos'
                      ? 'bg-emerald-500 text-black'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/40'
                  }`}
                >
                  Ver Todo
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    id={`category-btn-${cat}`}
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid View */}
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-neutral-800 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-neutral-400 text-sm font-mono">Cargando catálogo inteligente de repuestos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-[#111111] border border-neutral-800 rounded-2xl max-w-xl mx-auto">
                <HelpCircle className="w-12 h-12 mx-auto text-neutral-500 mb-3" />
                <h3 className="font-display font-extrabold text-base text-white">Sin resultados en catálogo</h3>
                <p className="text-neutral-400 text-xs mt-1 px-4">
                  No encontramos repuestos que coincidan con la búsqueda "{searchQuery}" o con los filtros activos. Intente removiendo filtros.
                </p>
                <button 
                  id="reset-catalog-filters"
                  onClick={() => { setSelectedCategory('Todos'); setSelectedStatus('Todos'); setSearchQuery(''); }}
                  className="mt-4 bg-neutral-800 hover:bg-emerald-500 hover:text-black text-white text-xs font-bold px-4 py-2 rounded-lg transition-all font-mono border border-neutral-750"
                >
                  Restablecer Catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onSelect={handleSelectProduct} 
                    onOrder={handleOrderProduct} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW B: CLIENT HISTORY ==================== */}
        {activeView === 'history' && (
          <div id="history-view" className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 shadow-xs text-white">
              <h2 className="text-xl font-display font-black text-white flex items-center gap-2 border-b border-neutral-800 pb-3 mb-4">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
                Historial de Mis Consultas / Pedidos
              </h2>
              <p className="text-neutral-400 text-xs leading-normal">
                Aquí puedes revisar los repuestos que has solicitado a través de esta plataforma en este navegador. Tus pedidos se registran de forma segura en nuestra base de datos.
              </p>

              {localHistory.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl mt-6">
                  Todavía no has registrado ninguna solicitud de repuesto. ¡Visita el catálogo para iniciar un pedido!
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {localHistory.map((h, idx) => (
                    <div key={idx} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-white text-sm">{h.productName}</h4>
                        <p className="text-neutral-400 text-[11px] font-mono mt-1">
                          Cantidad: <span className="font-bold text-neutral-200">{h.quantity} und.</span>
                          {h.createdAt && ` | Fecha: ${new Date(h.createdAt).toLocaleDateString('es-PE')}`}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-950/30 border border-emerald-900/50 px-2.5 py-1 rounded-md">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Registrado
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
                <button
                  id="history-back-to-catalog"
                  onClick={() => handleNavigate('catalog')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black py-2.5 px-5 rounded-lg transition-all font-mono"
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
      <footer className="bg-black text-neutral-500 text-xs py-6 border-t border-neutral-900 text-center space-y-1 font-mono hidden md:block">
        <p>© 2026 VELKOR IMPORTACIONES S.A.C. Todos los derechos reservados.</p>
        <p className="text-[10px] text-neutral-600">RUC: 20609827412 — Lima, Perú — Importador Directo de China</p>
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

      {/* Product Details Sheet Overlay */}
      {selectedProductDetails && (
        <ProductDetailsModal 
          product={selectedProductDetails} 
          onClose={() => setSelectedProductDetails(null)} 
          onOrder={handleOrderProduct} 
        />
      )}

      {/* Checkout WhatsApp Request Form Overlay */}
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
