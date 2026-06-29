import React, { useState, useEffect } from 'react';
import { Product, Order, CATEGORIES } from '../types';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getOrders, 
  updateOrder 
} from '../firebase';
import { 
  Shield, 
  Lock, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  DollarSign, 
  Eye, 
  Users, 
  Calendar, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Download,
  TrendingUp,
  UserCheck,
  UserX,
  MessageSquare,
  Sliders,
  Upload,
  Image
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState(''); // Specific admin email login check
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin tabs: 'orders' | 'inventory' | 'metrics' | 'loyal_clients' | 'lost_clients'
  const [activeTab, setActiveTab] = useState<string>('orders');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD Product Form States
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodShowPrice, setProdShowPrice] = useState(true);
  const [prodCategory, setProdCategory] = useState<string>(CATEGORIES[0]);
  const [prodStatus, setProdStatus] = useState<Product['status']>('Catálogo general');
  const [prodDescription, setProdDescription] = useState('');
  const [prodStock, setProdStock] = useState(10);
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodImageUrls, setProdImageUrls] = useState<string[]>([]);
  
  // Custom optional fields for product management
  const [prodColors, setProdColors] = useState('');
  const [prodMotorcycleBrands, setProdMotorcycleBrands] = useState('');
  const [prodWholesalePrice, setProdWholesalePrice] = useState<number>(0);
  const [prodRetailPrice, setProdRetailPrice] = useState<number>(0);
  const [prodArrivalDate, setProdArrivalDate] = useState('');

  // Image upload and processing states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const processImageFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    setIsUploadingImage(true);
    const newUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert(`El archivo "${file.name}" no es una imagen válida y será omitido.`);
        continue;
      }
      
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
              // Compress using canvas to keep within Firestore limits
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
              } else {
                reject(new Error('Canvas context is null'));
              }
            };
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error('Error de FileReader'));
          reader.readAsDataURL(file);
        });
        
        newUrls.push(dataUrl);
      } catch (err) {
        console.error('Error procesando imagen:', file.name, err);
      }
    }
    
    if (newUrls.length > 0) {
      setProdImageUrls(prev => [...prev, ...newUrls]);
    }
    setIsUploadingImage(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  // Filtering inventory lists
  const [inventoryFilterStatus, setInventoryFilterStatus] = useState<string>('Todos');

  // Filtering orders by region
  const [orderFilterRegion, setOrderFilterRegion] = useState<string>('Todos');
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('Todos');

  // Required "No Purchase Reason" states
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<string | null>(null);
  const [noPurchaseReasonInput, setNoPurchaseReasonInput] = useState('');

  const ADMIN_PASSWORD = 'velkor2026';
  const ADMIN_EMAIL = 'velkoryauramiza@gmail.com';

  const loadData = async () => {
    setLoading(true);
    try {
      const prods = await getProducts();
      const ords = await getOrders();
      setProducts(prods);
      setOrders(ords);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
    } else if (cleanEmail !== ADMIN_EMAIL) {
      setLoginError(`Acceso restringido: El correo "${cleanEmail}" no está autorizado. Ingrese con el correo corporativo.`);
    } else {
      setLoginError('Contraseña incorrecta. Intente nuevamente.');
    }
  };

  const handleDemoAccess = () => {
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    setIsAuthenticated(true);
  };

  // --- Order Status Actions ---
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status'], reason = '') => {
    try {
      await updateOrder(orderId, { 
        status: newStatus,
        ...(newStatus === 'No compró' ? { noPurchaseReason: reason } : {})
      });
      
      // Update local state instantly
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, noPurchaseReason: reason } : o));
      setSelectedOrderForCancel(null);
      setNoPurchaseReasonInput('');
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Error al actualizar el pedido');
    }
  };

  const handleUpdateGroupOrderStatus = async (groupId: string, items: Order[], newStatus: Order['status'], reason = '') => {
    try {
      setLoading(true);
      for (const item of items) {
        if (item.id) {
          await updateOrder(item.id, { 
            status: newStatus,
            ...(newStatus === 'No compró' ? { noPurchaseReason: reason } : {})
          });
        }
      }
      
      // Update local state for all matching orders
      setOrders(prev => prev.map(o => {
        const itemInGroup = items.find(item => item.id === o.id);
        if (itemInGroup) {
          return { ...o, status: newStatus, noPurchaseReason: reason };
        }
        return o;
      }));
      setSelectedOrderForCancel(null);
      setNoPurchaseReasonInput('');
      alert('Se actualizó el estado de todos los productos en este pedido.');
    } catch (err) {
      console.error('Error updating group orders:', err);
      alert('Error al actualizar el pedido');
    } finally {
      setLoading(false);
    }
  };

  // --- Product CRUD Actions ---
  const handleOpenNewProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCode('');
    setProdPrice(0);
    setProdShowPrice(true);
    setProdCategory(CATEGORIES[0]);
    setProdStatus('Catálogo general');
    setProdDescription('');
    setProdStock(10);
    setProdImageUrl('');
    setProdImageUrls([]);
    setProdColors('');
    setProdMotorcycleBrands('');
    setProdWholesalePrice(0);
    setProdRetailPrice(0);
    setProdArrivalDate('');
    setIsEditingProduct(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProductId(p.id || null);
    setProdName(p.name);
    setProdCode(p.code || '');
    setProdPrice(p.price);
    setProdShowPrice(p.showPrice);
    setProdCategory(p.category);
    setProdStatus(p.status);
    setProdDescription(p.description);
    setProdStock(p.stock || 0);
    setProdImageUrl(p.imageUrl);
    setProdImageUrls(p.imageUrls || (p.imageUrl ? [p.imageUrl] : []));
    setProdColors(p.colors || '');
    setProdMotorcycleBrands(p.motorcycleBrands || '');
    setProdWholesalePrice(p.wholesalePrice || p.price || 0);
    setProdRetailPrice(p.retailPrice || p.price || 0);
    setProdArrivalDate(p.arrivalDate || '');
    setIsEditingProduct(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodDescription) {
      alert('Nombre y descripción son obligatorios');
      return;
    }

    const firstImage = prodImageUrls.length > 0 ? prodImageUrls[0] : (prodImageUrl || 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80');

    const payload: Omit<Product, 'id'> = {
      name: prodName,
      code: prodCode,
      price: Number(prodWholesalePrice), // keep general price in sync with wholesale
      showPrice: prodShowPrice,
      category: prodCategory,
      status: prodStatus,
      description: prodDescription,
      stock: Number(prodStock),
      imageUrl: firstImage,
      imageUrls: prodImageUrls,
      colors: prodColors,
      motorcycleBrands: prodMotorcycleBrands,
      wholesalePrice: Number(prodWholesalePrice),
      retailPrice: Number(prodRetailPrice),
      arrivalDate: prodArrivalDate
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        alert('Producto actualizado con éxito');
      } else {
        await createProduct({ ...payload, views: 0, sales: 0 });
        alert('Producto creado con éxito');
      }
      setIsEditingProduct(false);
      loadData();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Ocurrió un error al guardar');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este repuesto del catálogo?')) return;
    try {
      await deleteProduct(id);
      alert('Producto eliminado');
      loadData();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  // --- Export Products to Excel / CSV ---
  const handleExportCSV = () => {
    if (products.length === 0) {
      alert('No hay productos para exportar.');
      return;
    }

    // CSV Headers
    const headers = [
      'ID',
      'Nombre de Repuesto',
      'Categoria',
      'Stock (und)',
      'Precio al Mayor (S/.)',
      'Precio al Menor (S/.)',
      'Estado',
      'Colores Disponibles',
      'Modelos Compatibles',
      'Fecha Arribo (China)',
      'Vistas Totales',
      'Pedidos Registrados',
      'Descripcion'
    ];

    // Map products to CSV rows
    const rows = products.map(p => [
      p.id || '',
      p.name.replace(/"/g, '""'), // escape quotes
      p.category.replace(/"/g, '""'),
      p.stock !== undefined ? p.stock : 'Ilimitado',
      (p.wholesalePrice || p.price || 0).toFixed(2),
      (p.retailPrice || p.price || 0).toFixed(2),
      p.status,
      (p.colors || '').replace(/"/g, '""'),
      (p.motorcycleBrands || '').replace(/"/g, '""'),
      (p.arrivalDate || '').replace(/"/g, '""'),
      p.views || 0,
      p.sales || 0,
      p.description.replace(/"/g, '""')
    ]);

    // Build the CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(value => `"${value}"`).join(','))
    ].join('\n');

    // Create a Blob with UTF-8 and BOM to support special Spanish characters in Excel (accents, ñ, etc.)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Velkor_Catalogo_Repuestos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Loyal & Lost Clients Helpers ---
  const getLoyalClients = () => {
    const clientMap: Record<string, { 
      name: string; 
      phone: string; 
      totalOrders: number; 
      completedOrders: number; 
      totalSpent: number; 
      requestedProducts: string[]; 
    }> = {};

    orders.forEach(o => {
      const key = o.customerPhone.trim();
      if (!clientMap[key]) {
        clientMap[key] = { 
          name: o.customerName, 
          phone: o.customerPhone, 
          totalOrders: 0, 
          completedOrders: 0, 
          totalSpent: 0, 
          requestedProducts: [] 
        };
      }
      
      clientMap[key].totalOrders += 1;
      if (o.status === 'Venta cerrada') {
        clientMap[key].completedOrders += 1;
        clientMap[key].totalSpent += o.productPrice * o.quantity;
      }
      
      if (!clientMap[key].requestedProducts.includes(o.productName)) {
        clientMap[key].requestedProducts.push(o.productName);
      }
    });

    return Object.values(clientMap)
      .sort((a, b) => b.totalSpent - a.totalSpent || b.completedOrders - a.completedOrders);
  };

  const getLostClients = () => {
    // List orders that are 'No compró'
    return orders.filter(o => o.status === 'No compró');
  };

  // --- Metrics Aggregations ---
  const calculateMetrics = () => {
    const totalOrders = orders.length;
    const closedSales = orders.filter(o => o.status === 'Venta cerrada').length;
    const inProgress = orders.filter(o => o.status === 'En seguimiento').length;
    const noPurchase = orders.filter(o => o.status === 'No compró').length;

    const conversionRate = totalOrders > 0 ? (closedSales / totalOrders) * 100 : 0;

    // Sales amount (sum of completed orders price * quantity)
    const totalRevenue = orders
      .filter(o => o.status === 'Venta cerrada')
      .reduce((sum, o) => sum + (o.productPrice * o.quantity), 0);

    // Frequent clients
    const clientMap: Record<string, { name: string; count: number; spend: number }> = {};
    orders.forEach(o => {
      const key = o.customerPhone;
      if (!clientMap[key]) {
        clientMap[key] = { name: o.customerName, count: 0, spend: 0 };
      }
      clientMap[key].count += 1;
      if (o.status === 'Venta cerrada') {
        clientMap[key].spend += o.productPrice * o.quantity;
      }
    });
    const frequentClients = Object.entries(clientMap)
      .map(([phone, val]) => ({ phone, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Group orders by day
    const dayMap: Record<string, number> = {};
    orders.forEach(o => {
      const day = new Date(o.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const ordersByDay = Object.entries(dayMap).map(([day, val]) => ({ day, count: val }));

    // Lost Reasons count
    const lostReasonsMap: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status === 'No compró' && o.noPurchaseReason) {
        const r = o.noPurchaseReason.trim();
        lostReasonsMap[r] = (lostReasonsMap[r] || 0) + 1;
      }
    });
    const lostReasons = Object.entries(lostReasonsMap).sort((a, b) => b[1] - a[1]);

    return {
      totalOrders,
      closedSales,
      inProgress,
      noPurchase,
      conversionRate,
      totalRevenue,
      frequentClients,
      ordersByDay,
      lostReasons
    };
  };

  const metrics = calculateMetrics();

  if (!isAuthenticated) {
    return (
      <div id="admin-login-screen" className="max-w-md mx-auto my-12 bg-[#111111] rounded-2xl border border-neutral-800 shadow-xl overflow-hidden text-white animate-fadeIn">
        <div className="bg-black p-6 text-center text-white border-b border-neutral-850">
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
             <img src="/assets/images/logo.jpeg" alt="VELKOR IMPORTACIONES" />
          </div>
          <h2 className="text-xl font-display font-black tracking-tight">Acceso Administrativo</h2>
          <p className="text-neutral-400 text-xs mt-1">Velkor Importaciones S.A.C.</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                Correo Electrónico de Administrador
              </label>
              <input 
                id="admin-email-input"
                type="email"
                required
                placeholder="velkoryauramiza@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden text-white font-mono"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                Contraseña Corporativa
              </label>
              <input 
                id="admin-password-input"
                type="password"
                required
                placeholder="Ingrese contraseña de admin"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden text-white"
              />
              {loginError && (
                <p className="text-rose-500 text-xs mt-2 flex items-start gap-1 font-mono leading-relaxed bg-rose-950/20 border border-rose-900/35 p-2 rounded">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                  <span>{loginError}</span>
                </p>
              )}
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-lg text-sm font-black transition-all font-mono tracking-wide mt-2"
            >
              Iniciar Sesión
            </button>
          </form>

         
        </div>
      </div>
    );
  }

  return (
    <div id="admin-panel-container" className="flex flex-col md:flex-row min-h-screen w-full bg-slate-100 text-slate-800">
      
      {/* 1. DESKTOP LEFT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 p-5 shrink-0 justify-between select-none">
        <div className="space-y-6">
          {/* Header & Corporate Title */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
            <div className="w-9 h-9 text-slate-950 rounded-xl flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
             <img src="/assets/images/logo.jpeg" alt="VELKOR IMPORTACIONES" />
            </div>
            <div>
              <h2 className="font-display font-black text-sm text-white tracking-tight leading-none">VELKOR ADMIN</h2>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mt-1">SISTEMA CORPORATIVO</p>
            </div>
          </div>

          {/* Navigation Links (As requested: Orders with status filters, products with crud, sales metrics, loyal clients, lost clients) */}
          <nav className="space-y-1">
            {[
              { id: 'orders', label: 'Pedidos Registrados', icon: ShoppingBag, badge: orders.filter(o => o.status === 'En seguimiento').length },
              { id: 'inventory', label: 'Mis Productos (CRUD)', icon: Package, badge: products.length },
              { id: 'metrics', label: 'Métricas & Ventas', icon: BarChart3 },
              { id: 'loyal_clients', label: 'Clientes Fieles', icon: UserCheck },
              { id: 'lost_clients', label: 'Clientes "No Compraron"', icon: UserX }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-tab-${item.id}`}
                  onClick={() => { setActiveTab(item.id); setIsEditingProduct(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    isActive 
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Administrator Profile Card */}
        <div className="pt-4 border-t border-slate-800 text-[11px] font-mono space-y-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={loadData}
              className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
              title="Sincronizar base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar información
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-xs font-mono">
              VK
            </div>
            <div className="truncate">
              <p className="font-bold text-white leading-tight">Yauramiza Ivan</p>
              <p className="text-slate-500 text-[8px] truncate">velkoryauramiza@gmail.com</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full bg-slate-800/50 hover:bg-rose-600/30 hover:text-rose-400 border border-slate-850 hover:border-rose-900 text-slate-400 py-1.5 rounded-md text-center text-[10px] font-bold transition-all"
          >
            Cerrar Sesión Admin
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & HORIZONTAL SCROLL TABS */}
      <div className="md:hidden w-full bg-slate-900 border-b border-slate-800 flex flex-col p-3 text-white sticky top-0 z-40">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="font-display font-black text-xs tracking-wider uppercase">VELKOR ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700"
              title="Sincronizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-[10px] font-mono text-slate-400 hover:text-white font-bold bg-slate-800 px-2.5 py-1 rounded-md"
            >
              Salir
            </button>
          </div>
        </div>
        
        {/* Horizontal scroll for mobile tabs */}
        <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
          {[
            { id: 'orders', label: 'Pedidos', count: orders.filter(o => o.status === 'En seguimiento').length },
            { id: 'inventory', label: 'Productos', count: products.length },
            { id: 'metrics', label: 'Métricas' },
            { id: 'loyal_clients', label: 'Fieles' },
            { id: 'lost_clients', label: 'No Compraron' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsEditingProduct(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === item.id 
                  ? 'bg-emerald-500 text-slate-950 font-black' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[9px] bg-slate-950 text-emerald-400 px-1 rounded-md">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN DASHBOARD AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto pb-16">
          {loading ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-slate-500 text-sm font-mono">Cargando base de datos Firestore...</p>
            </div>
          ) : (
            <>
              {/* ==================== 1. TAB: ORDERS ==================== */}
              {activeTab === 'orders' && (
            <div id="admin-orders-tab" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-slideDown">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-display font-extrabold text-base text-slate-900">Historial de Ventas y Solicitudes</h2>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-md">
                    En Seguimiento: {metrics.inProgress}
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">
                    Ventas Cerradas: {metrics.closedSales}
                  </span>
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-md">
                    No Compraron: {metrics.noPurchase}
                  </span>
                </div>
              </div>

              {/* Advanced Filtering controls for Admin */}
              <div className="p-4 bg-slate-50/50 border-b border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status selection */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Filtrar por Estado de Venta</label>
                  <div className="flex flex-wrap gap-1">
                    {['Todos', 'En seguimiento', 'Venta cerrada', 'No compró'].map(st => (
                      <button
                        key={st}
                        type="button"
                        id={`btn-order-status-filter-${st}`}
                        onClick={() => setOrderFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                          orderFilterStatus === st 
                            ? 'bg-slate-900 text-white shadow-xs' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {st === 'Todos' ? 'Todos los Estados' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region selection */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Filtrar por Región / Departamento</label>
                  <select
                    id="admin-order-region-filter"
                    value={orderFilterRegion}
                    onChange={e => setOrderFilterRegion(e.target.value)}
                    className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-hidden font-sans font-bold text-slate-700"
                  >
                    <option value="Todos">Todas las Regiones ({Array.from(new Set(orders.map(o => o.region || 'Lima'))).length})</option>
                    {Array.from(new Set(orders.map(o => o.region || 'Lima'))).filter(Boolean).map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const filteredIndividualOrders = orders.filter(o => {
                  const matchesStatus = orderFilterStatus === 'Todos' ? true : o.status === orderFilterStatus;
                  const matchesRegion = orderFilterRegion === 'Todos' ? true : (o.region || 'Lima') === orderFilterRegion;
                  return matchesStatus && matchesRegion;
                });

                // Group by orderGroupId. If missing, use id
                const groupsMap: { [key: string]: { id: string; customerName: string; customerPhone: string; deliveryAddress: string; region: string; requestType: string; paymentMethod: string; status: string; createdAt: string; items: Order[] } } = {};
                
                filteredIndividualOrders.forEach(o => {
                  const gId = o.orderGroupId || o.id || `UNKNOWN-${Math.random()}`;
                  if (!groupsMap[gId]) {
                    groupsMap[gId] = {
                      id: gId,
                      customerName: o.customerName,
                      customerPhone: o.customerPhone,
                      deliveryAddress: o.deliveryAddress,
                      region: o.region || 'Lima',
                      requestType: o.requestType,
                      paymentMethod: o.paymentMethod,
                      status: o.status,
                      createdAt: o.createdAt,
                      items: []
                    };
                  }
                  groupsMap[gId].items.push(o);
                });

                const sortedGroups = Object.values(groupsMap).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (sortedGroups.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-400 bg-white">
                      <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="font-medium text-sm text-slate-700">No hay pedidos con los filtros seleccionados.</p>
                      <p className="text-xs text-slate-400 mt-1">Sincroniza la base de datos o limpia los filtros para ver todos los registros.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse bg-white">
                      <thead className="bg-slate-50 text-[11px] font-mono text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-4">Cliente / Contacto</th>
                          <th className="p-4 min-w-[320px]">Productos Solicitados (Carrito)</th>
                          <th className="p-4">Tipo / Solicitud</th>
                          <th className="p-4">Pago Preferido</th>
                          <th className="p-4">Fecha</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4 text-right">Acciones de Pedido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedGroups.map((group) => {
                          const isCancelling = selectedOrderForCancel === group.id;
                          const totalGroupPrice = group.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);

                          return (
                            <tr key={group.id} className="hover:bg-slate-50/50 transition-colors align-top">
                              {/* Customer details */}
                              <td className="p-4">
                                <div className="space-y-1">
                                  <p className="font-extrabold text-slate-900 text-sm">{group.customerName}</p>
                                  <div className="flex flex-wrap gap-1">
                                    <span className="text-[11px] text-slate-600 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      📞 {group.customerPhone}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] rounded font-bold font-mono">
                                      📍 {group.region}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 italic line-clamp-2 max-w-[200px]" title={group.deliveryAddress}>
                                    {group.deliveryAddress}
                                  </p>
                                  
                                  {group.id.startsWith('VK-GRP-') && (
                                    <span className="inline-block mt-1 font-mono text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                      📦 ID Carrito: {group.id.substring(7, 18)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Cart Items consolidated */}
                              <td className="p-4">
                                <div className="space-y-2">
                                  {group.items.map((item, idx) => (
                                    <div key={item.id || idx} className="bg-slate-50 border border-slate-100 p-2 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-emerald-700 font-black font-mono text-xs">
                                            [{item.quantity} und.]
                                          </span>
                                          <span className="font-bold text-slate-800 text-xs">
                                            {item.productName}
                                          </span>
                                        </div>
                                        {item.productCode && (
                                          <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-black px-1 py-0.5 rounded mt-1">
                                            CÓDIGO: {item.productCode}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <span className="text-xs font-mono text-slate-500 font-bold">
                                        {item.productPrice > 0 
                                          ? `S/. ${(item.productPrice * item.quantity).toFixed(2)}` 
                                          : 'S/. (Sin precio listado)'}
                                      </span>
                                    </div>
                                  ))}

                                  {totalGroupPrice > 0 && (
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center bg-slate-50/40 p-2 rounded-lg">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 font-black">Monto Total del Pedido:</span>
                                      <span className="font-mono font-black text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
                                        S/. {totalGroupPrice.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Request Type */}
                              <td className="p-4">
                                <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  group.requestType === 'Compra directa' ? 'bg-emerald-100 text-emerald-800' :
                                  group.requestType === 'Cotización' ? 'bg-blue-100 text-blue-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {group.requestType}
                                </span>
                              </td>

                              {/* Payment details */}
                              <td className="p-4 text-xs font-mono text-slate-600">
                                {group.paymentMethod}
                              </td>

                              {/* Date */}
                              <td className="p-4 text-xs font-mono text-slate-500">
                                {new Date(group.createdAt).toLocaleDateString('es-PE')}
                                <br />
                                <span className="text-[10px] text-slate-400">
                                  {new Date(group.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>

                              {/* Order Status */}
                              <td className="p-4">
                                {group.status === 'Venta cerrada' ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Venta Cerrada
                                  </span>
                                ) : group.status === 'No compró' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                                      <XCircle className="w-3.5 h-3.5" />
                                      No Compró
                                    </span>
                                    {group.items[0]?.noPurchaseReason && (
                                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 border border-slate-100 rounded max-w-[180px]">
                                        Motivo: {group.items[0].noPurchaseReason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100 animate-pulse">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    En Seguimiento
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right">
                                {isCancelling ? (
                                  <div className="space-y-2 inline-block text-left bg-slate-100 p-3 rounded-xl border border-slate-200">
                                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold mb-1">
                                      Motivo de no compra (Obligatorio)
                                    </label>
                                    <select 
                                      id={`reason-select-${group.id}`}
                                      value={noPurchaseReasonInput}
                                      onChange={e => setNoPurchaseReasonInput(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs mb-2 focus:outline-hidden"
                                    >
                                      <option value="">Seleccione motivo...</option>
                                      <option value="Muy caro">Precio elevado (Muy caro)</option>
                                      <option value="Falta de stock">No hay stock disponible</option>
                                      <option value="No responde">No volvió a responder WhatsApp</option>
                                      <option value="Costo de envío">Costo de envío elevado</option>
                                      <option value="Demora entrega">Tiempo de entrega prolongado</option>
                                      <option value="Otro">Otro motivo</option>
                                    </select>
                                    
                                    {noPurchaseReasonInput === 'Otro' && (
                                      <input 
                                        id={`custom-reason-${group.id}`}
                                        type="text"
                                        placeholder="Especificar motivo..."
                                        onChange={e => setNoPurchaseReasonInput(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs mb-2 focus:outline-hidden"
                                      />
                                    )}

                                    <div className="flex justify-end gap-1.5">
                                      <button 
                                        id={`btn-cancel-reason-${group.id}`}
                                        onClick={() => setSelectedOrderForCancel(null)}
                                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold"
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        id={`btn-confirm-no-buy-${group.id}`}
                                        onClick={() => handleUpdateGroupOrderStatus(group.id, group.items, 'No compró', noPurchaseReasonInput || 'No especificado')}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold disabled:opacity-50"
                                        disabled={!noPurchaseReasonInput}
                                      >
                                        Confirmar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {group.status === 'En seguimiento' && (
                                      <>
                                        <button
                                          id={`btn-close-sale-${group.id}`}
                                          onClick={() => handleUpdateGroupOrderStatus(group.id, group.items, 'Venta cerrada')}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold px-2 py-1 rounded transition-colors whitespace-nowrap"
                                        >
                                          ✓ Despachar Carrito
                                        </button>
                                        <button
                                          id={`btn-reject-sale-${group.id}`}
                                          onClick={() => setSelectedOrderForCancel(group.id)}
                                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-mono text-[11px] font-bold px-2 py-1 rounded transition-colors whitespace-nowrap"
                                        >
                                          ✗ No Compró
                                        </button>
                                      </>
                                    )}
                                    {group.status !== 'En seguimiento' && (
                                      <button
                                        id={`btn-reopen-${group.id}`}
                                        onClick={() => handleUpdateGroupOrderStatus(group.id, group.items, 'En seguimiento')}
                                        className="text-slate-400 hover:text-slate-600 font-mono text-[11px] underline whitespace-nowrap"
                                      >
                                        Reabrir caso
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ==================== 2. TAB: INVENTORY (CRUD) ==================== */}
          {activeTab === 'inventory' && (
            <div id="admin-inventory-tab" className="space-y-6">
              {/* CRUD Panel controls */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">Catálogo de Repuestos Disponibles</h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono">Modifica, elimina o añade nuevos repuestos al catálogo visible para los clientes.</p>
                </div>
                {!isEditingProduct && (
                  <button
                    id="btn-add-new-product"
                    onClick={handleOpenNewProduct}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-display font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Repuesto
                  </button>
                )}
              </div>

              {/* Edit/Create Form View */}
              {isEditingProduct && (
                <form onSubmit={handleSaveProduct} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-slideDown">
                  <h3 className="text-base font-display font-black text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-500" />
                    {editingProductId ? 'Editar Datos del Repuesto' : 'Agregar Nuevo Repuesto al Catálogo'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1 font-bold">Nombre Comercial del Repuesto *</label>
                      <input 
                        id="form-prod-name"
                        type="text"
                        required
                        placeholder="Ej: Kit de arrastre Velkor para Yamaha FZ16"
                        value={prodName}
                        onChange={e => setProdName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Product Code */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1 font-bold">Código del Repuesto (Código/SKU) *</label>
                      <input 
                        id="form-prod-code"
                        type="text"
                        required
                        placeholder="Ej: VK-4028-FZ"
                        value={prodCode}
                        onChange={e => setProdCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Image Upload & Preview Grid */}
                    <div className="md:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                        <div>
                          <label className="block text-xs font-mono uppercase text-slate-700 font-bold">Galería de Fotos del Repuesto *</label>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Puedes subir varias fotos. La primera foto será la portada principal.</p>
                        </div>
                        {prodImageUrls.length > 0 && (
                          <span className="text-[11px] font-mono font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                            {prodImageUrls.length} {prodImageUrls.length === 1 ? 'Foto' : 'Fotos'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Drag and Drop Box */}
                        <div className="md:col-span-1">
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center h-44 ${
                              isDragging 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                : 'border-slate-300 bg-white text-slate-500 hover:border-emerald-400'
                            }`}
                          >
                            <input 
                              type="file" 
                              id="form-prod-image-file"
                              accept="image/*"
                              multiple
                              onChange={handleImageFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {isUploadingImage ? (
                              <div className="flex flex-col items-center">
                                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
                                <span className="text-xs font-mono text-slate-500">Procesando fotos...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-xs font-mono font-bold text-slate-700 block">Subir Fotos</span>
                                <span className="text-[10px] text-emerald-600 underline font-semibold mt-1">Haz clic o arrastra</span>
                                <span className="text-[9px] text-slate-400 mt-1 block font-mono">Permite subir varias</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gallery Thumbnails List */}
                        <div className="md:col-span-2 flex flex-col justify-between">
                          <span className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5 font-bold">Administrar Fotos</span>
                          {prodImageUrls.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[140px] pr-1">
                              {prodImageUrls.map((url, index) => (
                                <div key={index} className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden bg-white group shadow-xs">
                                  <img 
                                    src={url} 
                                    alt={`Foto ${index + 1}`} 
                                    className="w-full h-full object-cover"
                                  />
                                  {index === 0 && (
                                    <span className="absolute top-1 left-1 bg-emerald-500 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                                      Portada
                                    </span>
                                  )}
                                  
                                  {/* Hover Actions */}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 z-10">
                                    {index !== 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setProdImageUrls(prev => {
                                            const updated = [...prev];
                                            const item = updated.splice(index, 1)[0];
                                            updated.unshift(item); // make it first (main)
                                            return updated;
                                          });
                                        }}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[9px] font-black py-0.5 px-1.5 rounded transition-all shadow-md font-mono"
                                      >
                                        Principal
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProdImageUrls(prev => prev.filter((_, idx) => idx !== index));
                                      }}
                                      className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black py-0.5 px-1.5 rounded transition-all shadow-md font-mono"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl h-28 bg-white flex flex-col items-center justify-center text-center p-4">
                              <Image className="w-8 h-8 text-slate-300 mb-1" />
                              <p className="text-[10px] text-slate-400 font-mono">No hay fotos en la galería aún.</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Sube al menos una foto para mostrar en el catálogo.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dropdown for Manual URL */}
                      <div className="mt-3 pt-3 border-t border-slate-200/60">
                        <details className="text-left text-xs text-slate-400 select-none cursor-pointer">
                          <summary className="hover:text-emerald-600 font-mono text-[10px] uppercase font-bold">Opciones avanzadas (Ingresar URLs de internet manualmente)</summary>
                          <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                            <label className="block text-[11px] font-mono uppercase text-slate-500 font-bold">Agregar URL de imagen:</label>
                            <div className="flex gap-2">
                              <input 
                                id="form-prod-image-manual-input"
                                type="url"
                                placeholder="https://ejemplo.com/mifoto.jpg"
                                className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      setProdImageUrls(prev => [...prev, val]);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById('form-prod-image-manual-input') as HTMLInputElement;
                                  const val = input?.value.trim();
                                  if (val) {
                                    setProdImageUrls(prev => [...prev, val]);
                                    input.value = '';
                                  }
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-200"
                              >
                                Agregar
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-400 font-mono leading-tight">Presiona Enter o haz clic en Agregar. Puedes agregar tantas URLs externas como desees.</p>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Wholesale Price */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Precio Por Mayor (S/.) *</label>
                      <input 
                        id="form-prod-wholesale-price"
                        type="number"
                        step="0.01"
                        required
                        value={prodWholesalePrice}
                        onChange={e => setProdWholesalePrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Retail Price */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Precio Por Menor (S/.) *</label>
                      <input 
                        id="form-prod-retail-price"
                        type="number"
                        step="0.01"
                        required
                        value={prodRetailPrice}
                        onChange={e => setProdRetailPrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Categoría</label>
                      <select
                        id="form-prod-category"
                        value={prodCategory}
                        onChange={e => setProdCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status badge type */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Estado de Campaña</label>
                      <select
                        id="form-prod-status"
                        value={prodStatus}
                        onChange={e => setProdStatus(e.target.value as Product['status'])}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      >
                        <option value="Catálogo general">Catálogo general</option>
                        <option value="Nuevo">Nuevo Lanzamiento</option>
                        <option value="Promoción">En Promoción / Oferta</option>
                        <option value="Importación próxima">Próxima Importación (China)</option>
                        <option value="Agotado">Agotado (Ocultar al cliente)</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Attributes Block */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {/* Colors */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Colores (Opcional)</label>
                      <input 
                        id="form-prod-colors"
                        type="text"
                        placeholder="Ej: Negro, Rojo brillante, Azul metálico"
                        value={prodColors}
                        onChange={e => setProdColors(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Motorcycle Brands */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Motos Compatibles (Opcional)</label>
                      <input 
                        id="form-prod-motorcycle-brands"
                        type="text"
                        placeholder="Ej: Honda CB190R, Pulsar NS200, Yamaha FZ25"
                        value={prodMotorcycleBrands}
                        onChange={e => setProdMotorcycleBrands(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Arrival Date (Shown only for China imports) */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">
                        Fecha de Arribo (China) 
                        {prodStatus !== 'Importación próxima' && ' (Inactivo)'}
                      </label>
                      <input 
                        id="form-prod-arrival-date"
                        type="text"
                        disabled={prodStatus !== 'Importación próxima'}
                        placeholder="Ej: Fines de Octubre / Quincena Noviembre"
                        value={prodArrivalDate}
                        onChange={e => setProdArrivalDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Stock level */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Stock de Unidades</label>
                      <input 
                        id="form-prod-stock"
                        type="number"
                        value={prodStock}
                        onChange={e => setProdStock(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Descripción Detallada *</label>
                      <textarea 
                        id="form-prod-desc"
                        rows={3}
                        required
                        placeholder="Escriba especificaciones técnicas, compatibilidad con motos, materiales de fabricación, etc."
                        value={prodDescription}
                        onChange={e => setProdDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      id="form-prod-cancel"
                      type="button"
                      onClick={() => setIsEditingProduct(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      id="form-prod-save"
                      type="submit"
                      className="px-5 py-2 bg-slate-950 hover:bg-emerald-600 text-white hover:text-black rounded-lg text-xs font-extrabold font-mono transition-colors"
                    >
                      {editingProductId ? 'Guardar Cambios' : 'Registrar Repuesto'}
                    </button>
                  </div>
                </form>
              )}

              {/* Inventory Status Filter Tabs */}
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border-b border-slate-200">
                {[
                  { label: 'Todos los repuestos', value: 'Todos' },
                  { label: 'Nuevos', value: 'Nuevo' },
                  { label: 'En Promoción', value: 'Promoción' },
                  { label: 'Por Llegar (China)', value: 'Importación próxima' },
                  { label: 'Agotados / Ocultos', value: 'Agotado' },
                  { label: 'Con Ventas', value: 'MasVendidos' }
                ].map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    id={`btn-inv-filter-${tab.value}`}
                    onClick={() => setInventoryFilterStatus(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors font-bold ${
                      inventoryFilterStatus === tab.value 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Product Inventory Table / Grid */}
              <div className="bg-white border-t border-slate-200 overflow-hidden shadow-xs">
                {products.filter(p => {
                  if (inventoryFilterStatus === 'Todos') return true;
                  if (inventoryFilterStatus === 'MasVendidos') return (p.sales !== undefined && p.sales > 0);
                  return p.status === inventoryFilterStatus;
                }).length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No hay productos en esta categoría. Haz click en "Nuevo Repuesto" para crear uno o cambia de filtro.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-[11px] font-mono text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-4">Foto</th>
                          <th className="p-4">Datos del Repuesto</th>
                          <th className="p-4">Categoría</th>
                          <th className="p-4">Precios Admin (Mayor / Menor)</th>
                          <th className="p-4">Stock</th>
                          <th className="p-4">Popularidad / Ventas</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products
                          .filter(p => {
                            if (inventoryFilterStatus === 'Todos') return true;
                            if (inventoryFilterStatus === 'MasVendidos') return (p.sales !== undefined && p.sales > 0);
                            return p.status === inventoryFilterStatus;
                          })
                          .map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <img 
                                  src={p.imageUrl} 
                                  alt={p.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                                />
                              </td>
                              <td className="p-4">
                                <div className="max-w-md">
                                  <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-1 ${
                                    p.status === 'Nuevo' ? 'bg-emerald-100 text-emerald-800' :
                                    p.status === 'Promoción' ? 'bg-amber-100 text-amber-800' :
                                    p.status === 'Importación próxima' ? 'bg-blue-100 text-blue-800' :
                                    p.status === 'Agotado' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {p.status}
                                  </span>
                                  <p className="font-bold text-slate-900 line-clamp-1">
                                    {p.code && (
                                      <span className="text-emerald-600 font-mono text-[11px] font-black mr-1.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                        {p.code}
                                      </span>
                                    )}
                                    {p.name}
                                  </p>
                                  <p className="text-xs text-slate-400 line-clamp-1 italic mt-0.5">{p.description}</p>
                                  
                                  {/* Optional metadata blocks for colors and brands */}
                                  {(p.colors || p.motorcycleBrands || p.arrivalDate) && (
                                    <div className="mt-1.5 space-y-0.5 text-[10px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                      {p.colors && <p><span className="text-slate-400 font-bold">Colores:</span> {p.colors}</p>}
                                      {p.motorcycleBrands && <p><span className="text-slate-400 font-bold">Motos:</span> {p.motorcycleBrands}</p>}
                                      {p.status === 'Importación próxima' && p.arrivalDate && (
                                        <p className="text-blue-600 font-bold"><span className="text-slate-400">Arribo China:</span> {p.arrivalDate}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-xs font-semibold text-slate-600">
                                {p.category}
                              </td>
                              <td className="p-4 font-mono text-xs">
                                <div className="space-y-0.5 text-slate-700">
                                  <p><span className="text-slate-400">Al Mayor:</span> <strong className="text-slate-900 font-bold">S/. {(p.wholesalePrice || p.price || 0).toFixed(2)}</strong></p>
                                  <p><span className="text-slate-400">Al Menor:</span> <strong className="text-emerald-600 font-bold">S/. {(p.retailPrice || p.price || 0).toFixed(2)}</strong></p>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-xs">
                                {p.stock !== undefined ? (
                                  <span className={p.stock <= 5 ? "text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" : "text-slate-700"}>
                                    {p.stock} und.
                                  </span>
                                ) : (
                                  'Ilimitado'
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col text-[11px] font-mono text-slate-500 gap-1">
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    Vistas: <strong className="text-slate-800">{p.views || 0}</strong>
                                  </span>
                                <span className="flex items-center gap-1">
                                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                  Pedidos: <strong className="text-slate-800">{p.sales || 0}</strong>
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  id={`btn-edit-inv-${p.id}`}
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  id={`btn-delete-inv-${p.id}`}
                                  onClick={() => handleDeleteProduct(p.id || '')}
                                  className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-700"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. TAB: METRICS ==================== */}
          {activeTab === 'metrics' && (
            <div id="admin-metrics-tab" className="space-y-6">
              {/* Top Row cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Metric Card 1 */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Total de Solicitudes</span>
                    <span className="text-3xl font-display font-black text-slate-900 mt-1 block">
                      {metrics.totalOrders}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">Pedidos guardados en DB</span>
                  </div>
                  <div className="p-3 bg-slate-50 text-slate-800 rounded-xl">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>

                {/* Metric Card 2 */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Tasa de Conversión</span>
                    <span className="text-3xl font-display font-black text-emerald-600 mt-1 block">
                      {metrics.conversionRate.toFixed(1)}%
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">Ventas cerradas / Pedidos</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>

                {/* Metric Card 3 */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Monto en Cierres</span>
                    <span className="text-3xl font-display font-black text-slate-900 mt-1 block">
                      S/. {metrics.totalRevenue.toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">Suma de ventas concretadas</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                {/* Metric Card 4 */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Ventas No Concretadas</span>
                    <span className="text-3xl font-display font-black text-rose-500 mt-1 block">
                      {metrics.noPurchase}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">Registros con motivo de pérdida</span>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Middle Row Charts / Rankings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Demanda por Producto (Views vs. Sales) */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                  <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    Repuestos con Mayor Demanda y Consultas
                  </h3>
                  
                  <div className="space-y-4">
                    {products
                      .sort((a, b) => ((b.views || 0) + (b.sales || 0)*2) - ((a.views || 0) + (a.sales || 0)*2))
                      .slice(0, 5)
                      .map((p, idx) => {
                        const totalScore = (p.views || 0) + (p.sales || 0) * 3;
                        const maxScore = Math.max(...products.map(pr => (pr.views || 0) + (pr.sales || 0) * 3)) || 1;
                        const percentage = (totalScore / maxScore) * 100;

                        return (
                          <div key={p.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-slate-800 truncate max-w-[260px]">{idx + 1}. {p.name}</span>
                              <span className="font-mono text-slate-500">
                                {p.views || 0} vistas | {p.sales || 0} pedidos
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {/* Right: Motivos de No Compra */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                  <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Motivos de Pérdida de Ventas (Feedback de WhatsApp)
                  </h3>

                  {metrics.lostReasons.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No hay registros de ventas perdidas para analizar.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.lostReasons.map(([reason, count]) => {
                        const maxCount = Math.max(...metrics.lostReasons.map(r => r[1])) || 1;
                        const widthPct = (count / maxCount) * 100;
                        return (
                          <div key={reason} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-700">{reason}</span>
                              <span className="font-mono font-bold text-slate-900">{count} casos</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-rose-500 rounded-full transition-all" 
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 text-amber-900 rounded-lg text-xs">
                    💡 <strong>Consejo de Importación de China:</strong> Analiza estos motivos para corregir desabastecimientos de stock o adecuar los precios de los productos más perdidos.
                  </div>
                </div>
              </div>

              {/* Bottom Row stats: Clients and Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Frequent Clients */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                  <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Resumen de Clientes Frecuentes
                  </h3>

                  {metrics.frequentClients.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No hay clientes registrados aún.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {metrics.frequentClients.map((c, idx) => (
                        <div key={c.phone} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{c.phone}</p>
                            </div>
                          </div>
                          <div className="text-right font-mono text-xs">
                            <p className="font-bold text-slate-900">{c.count} consultas</p>
                            <p className="text-[10px] text-emerald-600">S/. {c.spend.toFixed(2)} comprados</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orders by Day Graph */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                  <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Demanda de Pedidos Registrados por Día
                  </h3>

                  {metrics.ordersByDay.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Sin datos históricos.
                    </div>
                  ) : (
                    <div className="h-44 flex items-end justify-between gap-2 pt-4">
                      {metrics.ordersByDay.map(d => {
                        const maxVal = Math.max(...metrics.ordersByDay.map(day => day.count)) || 1;
                        const heightPct = (d.count / maxVal) * 80; // keep some top padding
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <span className="text-[10px] font-mono text-slate-600 font-bold">{d.count}</span>
                            <div 
                              className="w-full bg-emerald-500 hover:bg-emerald-600 transition-all rounded-t-xs"
                              style={{ height: `${heightPct}%` }}
                            />
                            <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                              {d.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 4. TAB: LOYAL CLIENTS ==================== */}
          {activeTab === 'loyal_clients' && (
            <div id="admin-loyal-clients-tab" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-slideDown">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-900 font-sans">Clientes Fieles (Siempre Compran)</h2>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono">Contactos ordenados por volumen de consultas y compras cerradas en el corporativo Velkor.</p>
                </div>
                <div className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  💎 {getLoyalClients().filter(c => c.completedOrders > 0).length} Clientes con Compras
                </div>
              </div>

              {getLoyalClients().length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-sm text-slate-750 font-sans">No hay clientes con compras registradas aún.</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">Los pedidos cambiados a estado "Venta cerrada" generarán estadísticas aquí.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-mono text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-4">Rango</th>
                        <th className="p-4">Nombre / Celular</th>
                        <th className="p-4 text-center">Consultas Totales</th>
                        <th className="p-4 text-center">Ventas Cerradas</th>
                        <th className="p-4 text-right">Inversión Total (S/.)</th>
                        <th className="p-4">Repuestos Consultados</th>
                        <th className="p-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getLoyalClients().map((client, idx) => {
                        const isFrequent = client.completedOrders >= 2;
                        return (
                          <tr key={client.phone} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-mono text-xs font-bold text-slate-500">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                                {client.name}
                                {isFrequent && (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[8px] font-mono font-black px-1.5 py-0.5 rounded">
                                    FRECUENTE
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">{client.phone}</p>
                            </td>
                            <td className="p-4 text-center font-mono text-xs text-slate-600">
                              {client.totalOrders} consultas
                            </td>
                            <td className="p-4 text-center font-mono text-xs">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold border border-emerald-100">
                                {client.completedOrders}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-900">
                              S/. {client.totalSpent.toFixed(2)}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {client.requestedProducts.map(prod => (
                                  <span key={prod} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[150px]">
                                    {prod}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <a
                                href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${client.name}, le saludamos de Velkor Importaciones. Queríamos agradecerle por preferirnos para la compra de sus repuestos de motocicleta. ¿Todo bien con sus productos? Recuerde que siempre tenemos novedades directo desde China!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors font-mono"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Fidelizar
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== 5. TAB: LOST CLIENTS ==================== */}
          {activeTab === 'lost_clients' && (
            <div id="admin-lost-clients-tab" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-slideDown">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-900 font-sans">Clientes "No Compraron" (Guardaditos)</h2>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono">Registro detallado de consultas perdidas y motivos que ayudan a adecuar la próxima importación de China.</p>
                </div>
                <div className="bg-rose-100 text-rose-800 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  ⚠️ {getLostClients().length} Casos Registrados
                </div>
              </div>

              {getLostClients().length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <UserX className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-sm text-slate-755 font-sans">No hay registros de clientes sin concretar.</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">¡Excelente! Todos los pedidos se han cerrado con éxito o están activos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-mono text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-4">Fecha Consulta</th>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Repuesto Solicitado</th>
                        <th className="p-4 text-center">Cantidad</th>
                        <th className="p-4 text-right">Monto Pérdida</th>
                        <th className="p-4">Motivo de Pérdida / Feedback</th>
                        <th className="p-4 text-right">Recuperación WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getLostClients().map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-PE') : 'S/F'}
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900 font-sans">{order.customerName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-slate-500 font-mono">{order.customerPhone}</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] rounded font-bold font-mono">
                                📍 {order.region || 'Lima'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-slate-800 font-sans">
                            {order.productName}
                          </td>
                          <td className="p-4 text-center font-mono text-xs text-slate-600">
                            {order.quantity} und.
                          </td>
                          <td className="p-4 text-right font-mono text-slate-900 font-bold">
                            S/. {(order.productPrice * order.quantity).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-bold font-mono">
                              ⚠️ {order.noPurchaseReason || 'Precio / No contestó'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <a
                              href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${order.customerName}, le saludamos de Velkor Importaciones. Estuvimos revisando su consulta por el repuesto "${order.productName}". Para ayudarle a equipar su moto, queríamos ofrecerle un precio de oferta o facilidades en el delivery. ¿Aún se encuentra interesado?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors font-mono"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Re-contactar
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
