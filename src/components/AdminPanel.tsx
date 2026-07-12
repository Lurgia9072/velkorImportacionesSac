import React, { useState, useEffect } from 'react';
import { Product, Order, CATEGORIES } from '../types';
import { 
  getProducts, 
  getProductsPaged,
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getOrders, 
  updateOrder,
  getStoreConfig,
  updateStoreConfig,
  db
} from '../firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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
  Image,
  X,
  Search
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

  const [adminLastVisible, setAdminLastVisible] = useState<any>(null);
  const [adminHasMore, setAdminHasMore] = useState(false);
  const [adminLoadingMore, setAdminLoadingMore] = useState(false);

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
  const [prodBrand, setProdBrand] = useState('');
  const [prodUnitsPerBox, setProdUnitsPerBox] = useState<number>(0);

  // Image upload and processing states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Store Layout Settings States
  const [storeLogo, setStoreLogo] = useState('');
  const [storeBanner, setStoreBanner] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Excel Import States
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mappedFields, setMappedFields] = useState<Record<string, string>>({
    code: '',
    name: '',
    imageUrl: '',
    brand: '',
    price: '',
    unitsPerBox: '',
    category: ''
  });
  const [defaultCategory, setDefaultCategory] = useState<string>(CATEGORIES[0]);
  const [defaultStatus, setDefaultStatus] = useState<Product['status']>('Catálogo general');
  const [defaultStock, setDefaultStock] = useState<number>(10);
  const [defaultUnitsPerBox, setDefaultUnitsPerBox] = useState<number>(100);
  const [autoGenCodes, setAutoGenCodes] = useState(false);
  const [autoGenPrefix, setAutoGenPrefix] = useState('VL-');
  const [autoGenStartNum, setAutoGenStartNum] = useState(1);

  // Search input inside Admin Product inventory list
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    status: 'idle' | 'parsing' | 'uploading' | 'completed' | 'error';
    successCount: number;
    errorCount: number;
  }>({
    current: 0,
    total: 0,
    status: 'idle',
    successCount: 0,
    errorCount: 0
  });

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
      const result = await getProductsPaged(100, null);
      const ords = await getOrders();
      setProducts(result.products);
      setAdminLastVisible(result.lastDoc);
      setAdminHasMore(result.hasMore);
      setOrders(ords);

      const config = await getStoreConfig();
      if (config) {
        setStoreLogo(config.logoUrl || '');
        setStoreBanner(config.bannerUrl || '');
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Progressive background loading for Admin inventory to fetch the rest of the database incrementally
  useEffect(() => {
    if (!isAuthenticated || loading || !adminHasMore || adminLoadingMore) return;

    const timer = setTimeout(async () => {
      try {
        const result = await getProductsPaged(100, adminLastVisible);
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniques = result.products.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniques];
        });
        setAdminLastVisible(result.lastDoc);
        setAdminHasMore(result.hasMore);
      } catch (err) {
        console.error("Error loading remaining admin products in background:", err);
      }
    }, 2000); // 2 seconds between batch loads to avoid network clutter

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, adminHasMore, adminLastVisible, adminLoadingMore]);

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
    setProdBrand('');
    setProdUnitsPerBox(0);
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
    setProdBrand(p.brand || '');
    setProdUnitsPerBox(p.unitsPerBox || 0);
    setIsEditingProduct(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName) {
      alert('El Nombre Comercial del Repuesto es obligatorio');
      return;
    }
    if (!prodCode) {
      alert('El Código del Repuesto es obligatorio');
      return;
    }

    const finalDescription = prodDescription.trim() || `Repuesto ${prodName} de alta calidad, marca ${prodBrand || 'Velkor'}. Código de repuesto: ${prodCode || 'N/A'}.`;
    const firstImage = prodImageUrls.length > 0 ? prodImageUrls[0] : (prodImageUrl || 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80');

    const payload: Omit<Product, 'id'> = {
      name: prodName,
      code: prodCode,
      price: Number(prodWholesalePrice), // keep general price in sync with wholesale
      showPrice: prodShowPrice,
      category: prodCategory,
      status: prodStatus,
      description: finalDescription,
      stock: Number(prodStock),
      imageUrl: firstImage,
      imageUrls: prodImageUrls,
      colors: prodColors,
      motorcycleBrands: prodMotorcycleBrands,
      wholesalePrice: Number(prodWholesalePrice),
      retailPrice: Number(prodRetailPrice),
      arrivalDate: prodArrivalDate,
      brand: prodBrand,
      unitsPerBox: Number(prodUnitsPerBox)
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

  // --- Excel Import & Parsing Actions ---
  const handleExcelImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportProgress(prev => ({ ...prev, status: 'parsing' }));

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('No se pudo leer el archivo.');

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        if (jsonData.length === 0) {
          alert('El archivo Excel está vacío.');
          setImportProgress(prev => ({ ...prev, status: 'idle' }));
          return;
        }

        // Get headers from first row of the worksheet directly, and scan all rows to ensure empty/sparse columns are never missed
        const headersSet = new Set<string>();
        if (worksheet && worksheet['!ref']) {
          try {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            const firstRowIdx = range.s.r;
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: firstRowIdx, c: C });
              const cell = worksheet[cellAddress];
              if (cell && cell.v !== undefined && cell.v !== null) {
                const headerText = String(cell.v).trim();
                if (headerText) {
                  headersSet.add(headerText);
                }
              }
            }
          } catch (e) {
            console.error('Error decoding range to fetch headers:', e);
          }
        }

        // Also accumulate keys from ALL rows in jsonData to ensure no parsed keys are missed
        jsonData.forEach(row => {
          Object.keys(row).forEach(k => {
            const trimmed = k.trim();
            if (trimmed) {
              headersSet.add(trimmed);
            }
          });
        });

        const headers = Array.from(headersSet);
        setExcelHeaders(headers);
        setExcelRows(jsonData);

        // Smart headers auto-mapping
        const autoMap: Record<string, string> = {
          code: '',
          name: '',
          imageUrl: '',
          brand: '',
          price: '',
          unitsPerBox: '',
          category: ''
        };

        headers.forEach(h => {
          const lower = h.toLowerCase().trim();
          if (/código|codigo|sku|id/i.test(lower)) {
            autoMap.code = h;
          } else if (/nombre|producto|repuesto|comercial/i.test(lower)) {
            autoMap.name = h;
          } else if (/imagen|image|foto|url|link/i.test(lower)) {
            autoMap.imageUrl = h;
          } else if (/marca|brand|fabricante/i.test(lower)) {
            autoMap.brand = h;
          } else if (/precio|price|costo|s\/\./i.test(lower)) {
            autoMap.price = h;
          } else if (/caja|box|unidades por caja|cant.*caja|cantidad por caja/i.test(lower)) {
            autoMap.unitsPerBox = h;
          } else if (/categoría|categoria|category|grupo/i.test(lower)) {
            autoMap.category = h;
          }
        });

        // Fallbacks if not auto-detected
        if (!autoMap.code) autoMap.code = headers.find(h => /cod/i.test(h)) || '';
        if (!autoMap.name) autoMap.name = headers.find(h => /nom/i.test(h)) || '';
        if (!autoMap.imageUrl) autoMap.imageUrl = headers.find(h => /img|url|foto/i.test(h)) || '';
        if (!autoMap.price) autoMap.price = headers.find(h => /pre|cos/i.test(h)) || '';
        if (!autoMap.category) autoMap.category = headers.find(h => /cat/i.test(h)) || '';

        setMappedFields(autoMap);
        setImportProgress(prev => ({ ...prev, status: 'idle' }));
      } catch (err) {
        console.error('Error parsing Excel:', err);
        alert('Ocurrió un error al procesar el archivo Excel. Asegúrese de que sea un archivo válido.');
        setImportProgress(prev => ({ ...prev, status: 'idle' }));
      }
    };

    reader.onerror = () => {
      alert('Error al leer el archivo.');
      setImportProgress(prev => ({ ...prev, status: 'idle' }));
    };

    reader.readAsArrayBuffer(file);
  };

  const startBatchImport = async () => {
    if (excelRows.length === 0) return;
    
    // Verify required mapping for minimally required fields
    if (!mappedFields.name || (!mappedFields.code && !autoGenCodes)) {
      alert('Debe mapear al menos el Nombre del Producto (o activar la Autogeneración de Códigos) para poder realizar la importación.');
      return;
    }

    setImportProgress({
      current: 0,
      total: excelRows.length,
      status: 'uploading',
      successCount: 0,
      errorCount: 0
    });

    const batchSize = 100;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < excelRows.length; i += batchSize) {
      const chunk = excelRows.slice(i, i + batchSize);
      const batch = writeBatch(db);
      const productsCol = collection(db, 'products');

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const rowIndex = i + j;
        try {
          const nameVal = String(row[mappedFields.name] || '').trim();
          const brandVal = String(row[mappedFields.brand] || '').trim();
          const priceVal = Number(row[mappedFields.price] || 0);
          
          let codeVal = '';
          if (autoGenCodes) {
            const seqNumber = Number(autoGenStartNum) + rowIndex;
            codeVal = `${autoGenPrefix}${String(seqNumber).padStart(4, '0')}`;
          } else {
            codeVal = String(row[mappedFields.code] || '').trim();
            // If the code is blank OR if it's a simple number (e.g. "1", "2"), auto-generate based on pattern
            const isNumericOnly = /^\d+$/.test(codeVal);
            if (!codeVal || isNumericOnly) {
              const seqNumber = Number(autoGenStartNum) + rowIndex;
              codeVal = `${autoGenPrefix}${String(seqNumber).padStart(4, '0')}`;
            }
          }

          let unitsPerBoxVal = Number(row[mappedFields.unitsPerBox] || 0);
          if (!unitsPerBoxVal || isNaN(unitsPerBoxVal)) {
            unitsPerBoxVal = Number(defaultUnitsPerBox) || 0;
          }

          // Smart Category Normalization & Matching
          const categoryVal = mappedFields.category ? String(row[mappedFields.category] || '').trim() : '';
          let matchedCategory = defaultCategory;
          if (categoryVal) {
            const cleaned = categoryVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const found = CATEGORIES.find(cat => {
              const catCleaned = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return catCleaned.includes(cleaned) || cleaned.includes(catCleaned);
            });
            if (found) {
              matchedCategory = found;
            }
          }

          if (!nameVal) {
            errors++;
            continue;
          }

          const fallbackDesc = `Repuesto ${nameVal} de marca ${brandVal || 'Velkor'}. Código de repuesto: ${codeVal}. Cantidad por caja: ${unitsPerBoxVal || 'N/A'}.`;
          const imageVal = String(row[mappedFields.imageUrl] || '').trim();
          const firstImage = imageVal || 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80';

          const productData: Omit<Product, 'id'> = {
            name: nameVal,
            code: codeVal,
            price: priceVal,
            showPrice: true,
            category: matchedCategory,
            status: defaultStatus,
            description: fallbackDesc,
            stock: Number(defaultStock),
            imageUrl: firstImage,
            imageUrls: [firstImage],
            brand: brandVal,
            unitsPerBox: unitsPerBoxVal,
            colors: '',
            motorcycleBrands: '',
            wholesalePrice: priceVal,
            retailPrice: priceVal,
            arrivalDate: '',
            views: 0,
            sales: 0
          };

          const newDocRef = doc(productsCol);
          batch.set(newDocRef, productData);
          success++;
        } catch (err) {
          console.error("Error processing row:", row, err);
          errors++;
        }
      }

      try {
        await batch.commit();
      } catch (dbErr) {
        console.error("Error committing batch:", dbErr);
        errors += chunk.length;
        success -= chunk.length;
      }

      setImportProgress(prev => ({
        ...prev,
        current: Math.min(i + batchSize, excelRows.length),
        successCount: success,
        errorCount: errors
      }));
    }

    setImportProgress(prev => ({
      ...prev,
      status: 'completed'
    }));

    alert(`Importación finalizada.\nCorrectos: ${success}\nErrores/Omitidos: ${errors}`);
    setIsImportingExcel(false);
    setExcelRows([]);
    setExcelHeaders([]);
    loadData();
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
            <Shield className="w-6 h-6" />
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

          <div className="relative my-6 text-center">
            <hr className="border-neutral-850" />
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#111111] px-2 text-[10px] text-neutral-500 uppercase font-mono">o</span>
          </div>

          <button
            id="admin-bypass-btn"
            onClick={handleDemoAccess}
            className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-750 text-neutral-200 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 font-mono"
          >
            <Sparkles className="w-4 h-4" />
            Autocompletar Datos (Demo)
          </button>
          <p className="text-[10px] text-center text-neutral-500 mt-2 font-mono">
            * Carga las credenciales autorizadas del corporativo Velkor.
          </p>
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
            <div className="w-9 h-9 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Shield className="w-5 h-5" />
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
              { id: 'lost_clients', label: 'Clientes "No Compraron"', icon: UserX },
              { id: 'settings', label: 'Diseño Tienda (Logo/Banner)', icon: Sliders }
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
              Sincronizar DB
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-xs font-mono">
              VK
            </div>
            <div className="truncate">
              <p className="font-bold text-white leading-tight">Yauramiza A.</p>
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
            { id: 'lost_clients', label: 'No Compraron' },
            { id: 'settings', label: 'Diseño' }
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
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-import-excel"
                      type="button"
                      onClick={() => {
                        setIsImportingExcel(true);
                        setExcelRows([]);
                        setExcelHeaders([]);
                        setImportProgress({
                          current: 0,
                          total: 0,
                          status: 'idle',
                          successCount: 0,
                          errorCount: 0
                        });
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors border border-slate-700"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      Importar Excel
                    </button>
                    <button
                      id="btn-add-new-product"
                      onClick={handleOpenNewProduct}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black font-display font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Repuesto
                    </button>
                  </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {/* Brand */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Marca del Producto</label>
                      <input 
                        id="form-prod-brand"
                        type="text"
                        placeholder="Ej: Velkor, OEM"
                        value={prodBrand}
                        onChange={e => setProdBrand(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

                    {/* Units per Box */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Cant. por Caja</label>
                      <input 
                        id="form-prod-units-per-box"
                        type="number"
                        placeholder="Ej: 300"
                        value={prodUnitsPerBox || ''}
                        onChange={e => setProdUnitsPerBox(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-hidden"
                      />
                    </div>

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
                      <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Descripción Detallada (Opcional)</label>
                      <textarea 
                        id="form-prod-desc"
                        rows={3}
                        placeholder="Escriba especificaciones técnicas, compatibilidad con motos, materiales de fabricación, etc. (Opcional - Se auto-generará si se deja en blanco)"
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

              {/* Search Bar for Inventory */}
              <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={adminSearchQuery}
                    onChange={e => setAdminSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, código, marca o categoría..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs focus:outline-hidden text-slate-700 font-semibold"
                  />
                  {adminSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAdminSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono sm:ml-auto flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3">
                  <div className="flex items-center gap-1.5">
                    <span>Cargados:</span>
                    <strong className="text-slate-800">{products.length}</strong>
                    {adminHasMore ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm animate-pulse text-[10px]">
                        Cargando...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm text-[10px]">
                        Listo
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline-block text-slate-300">|</span>
                  <div>
                    Filtrados: <strong className="text-slate-800">{
                      products.filter(p => {
                        if (inventoryFilterStatus !== 'Todos') {
                          if (inventoryFilterStatus === 'MasVendidos') {
                            if (!(p.sales !== undefined && p.sales > 0)) return false;
                          } else {
                            if (p.status !== inventoryFilterStatus) return false;
                          }
                        }
                        if (adminSearchQuery.trim()) {
                          const q = adminSearchQuery.toLowerCase().trim();
                          return (p.name || '').toLowerCase().includes(q) || 
                                 (p.code || '').toLowerCase().includes(q) || 
                                 (p.brand || '').toLowerCase().includes(q) || 
                                 (p.category || '').toLowerCase().includes(q);
                        }
                        return true;
                      }).length
                    }</strong> repuestos
                  </div>
                </div>
              </div>

              {/* Product Inventory Table / Grid */}
              <div className="bg-white border-t border-slate-200 overflow-hidden shadow-xs">
                {products.filter(p => {
                  if (inventoryFilterStatus !== 'Todos') {
                    if (inventoryFilterStatus === 'MasVendidos') {
                      if (!(p.sales !== undefined && p.sales > 0)) return false;
                    } else {
                      if (p.status !== inventoryFilterStatus) return false;
                    }
                  }
                  if (adminSearchQuery.trim()) {
                    const q = adminSearchQuery.toLowerCase().trim();
                    return (p.name || '').toLowerCase().includes(q) || 
                           (p.code || '').toLowerCase().includes(q) || 
                           (p.brand || '').toLowerCase().includes(q) || 
                           (p.category || '').toLowerCase().includes(q);
                  }
                  return true;
                }).length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No se encontraron repuestos con el filtro o término de búsqueda ingresado.
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
                            if (inventoryFilterStatus !== 'Todos') {
                              if (inventoryFilterStatus === 'MasVendidos') {
                                if (!(p.sales !== undefined && p.sales > 0)) return false;
                              } else {
                                if (p.status !== inventoryFilterStatus) return false;
                              }
                            }
                            if (adminSearchQuery.trim()) {
                              const q = adminSearchQuery.toLowerCase().trim();
                              return (p.name || '').toLowerCase().includes(q) || 
                                     (p.code || '').toLowerCase().includes(q) || 
                                     (p.brand || '').toLowerCase().includes(q) || 
                                     (p.category || '').toLowerCase().includes(q);
                            }
                            return true;
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

              {/* ==================== EXCEL IMPORT MODAL ==================== */}
              {isImportingExcel && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 animate-duration-200">
                    
                    {/* Header */}
                    <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h4 className="font-display font-black text-sm uppercase tracking-wider">Importador de Repuestos desde Excel</h4>
                          <p className="text-[10px] font-mono text-slate-400">Velkor Importaciones SAC — Lotes de 100 en 100</p>
                        </div>
                      </div>
                      {importProgress.status !== 'uploading' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsImportingExcel(false);
                            setExcelRows([]);
                            setExcelHeaders([]);
                          }}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      
                      {/* Step 1: File Selection */}
                      {excelRows.length === 0 && (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-xs flex gap-3">
                            <span className="text-base">💡</span>
                            <div>
                              <p className="font-bold">Formato del Excel Recomendado</p>
                              <p className="mt-1 leading-relaxed">
                                El archivo Excel debe contener las siguientes columnas para una importación óptima:
                              </p>
                              <ul className="list-disc list-inside mt-1 font-mono text-[10px] space-y-0.5 text-emerald-700">
                                <li><strong>Código de Producto</strong> (Ej: VK-4028-FZ)</li>
                                <li><strong>Nombre del Producto</strong> (Ej: Kit de arrastre Velkor para Yamaha FZ16)</li>
                                <li><strong>Imagen</strong> (URL web de la foto)</li>
                                <li><strong>Marca</strong> (Ej: Velkor)</li>
                                <li><strong>Precio (S/)</strong> (Monto al por mayor/menor, Ej: 45)</li>
                                <li><strong>Cantidad por Caja</strong> (Ej: 200)</li>
                              </ul>
                              <p className="mt-2 text-[10px] italic font-medium">
                                * Nota: Se detectará automáticamente el nombre de las columnas y se dividirá el procesamiento en lotes de 100 registros para evitar sobrecargar la base de datos.
                              </p>
                            </div>
                          </div>

                          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-50/50 cursor-pointer transition-all relative flex flex-col items-center justify-center min-h-[220px]">
                            <input
                              type="file"
                              accept=".xlsx, .xls, .csv"
                              onChange={handleExcelImportFile}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {importProgress.status === 'parsing' ? (
                              <div className="flex flex-col items-center">
                                <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
                                <span className="text-sm font-semibold text-slate-700">Leyendo y analizando archivo Excel...</span>
                                <span className="text-xs text-slate-400 mt-1">Por favor espere.</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                                  <Download className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-bold text-slate-800">Seleccionar o Arrastrar Archivo Excel</span>
                                <span className="text-xs text-slate-400 mt-1">Formatos permitidos: .xlsx, .xls, .csv</span>
                                <span className="text-xs text-emerald-600 font-semibold underline mt-3">Examinar archivos</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 2: Mapping and Defaults */}
                      {excelRows.length > 0 && importProgress.status !== 'uploading' && importProgress.status !== 'completed' && (
                        <div className="space-y-6">
                          
                          {/* File info card */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Archivo Excel cargado</span>
                                <p className="text-xs font-bold text-slate-800 mt-0.5">
                                  Se detectaron <span className="text-emerald-600 font-black">{excelRows.length}</span> registros listos para importar.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setExcelRows([]);
                                setExcelHeaders([]);
                              }}
                              className="text-xs font-mono text-rose-600 hover:underline"
                            >
                              Cambiar archivo
                            </button>
                          </div>

                          {/* Column Mapping Section */}
                          <div>
                            <span className="block text-[11px] font-mono uppercase text-slate-400 mb-3 tracking-wider font-extrabold">
                              1. Mapear Columnas de Excel
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                { key: 'code', label: 'Código de Producto / SKU *', desc: 'Identificador único del repuesto' },
                                { key: 'name', label: 'Nombre del Producto / Comercial *', desc: 'Nombre que verá el cliente' },
                                { key: 'imageUrl', label: 'Imagen (URL de la foto)', desc: 'Link de la imagen del producto' },
                                { key: 'brand', label: 'Marca del Repuesto', desc: 'Velkor, OEM, etc.' },
                                { key: 'price', label: 'Precio (S/) *', desc: 'Monto asignado al repuesto' },
                                { key: 'unitsPerBox', label: 'Cantidad por Caja', desc: 'Capacidad de embalaje de la caja' },
                                { key: 'category', label: 'Categoría del Repuesto', desc: 'Grupo o categoría del producto' }
                              ].map(col => (
                                <div key={col.key} className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                  <label className="block text-xs font-bold text-slate-700">{col.label}</label>
                                  <p className="text-[10px] text-slate-400 leading-tight">{col.desc}</p>
                                  <select
                                    value={mappedFields[col.key] || ''}
                                    onChange={e => setMappedFields(prev => ({ ...prev, [col.key]: e.target.value }))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-hidden focus:border-emerald-500 font-mono font-bold font-semibold"
                                  >
                                    <option value="">-- No importar / Omitir --</option>
                                    {excelHeaders.map(header => (
                                      <option key={header} value={header}>{header}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Code Auto-Generation & Defaults section */}
                          <div className="border-t border-slate-100 pt-5 space-y-4">
                            <span className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider font-extrabold">
                              2. Configuración por Defecto y Autogeneración de Códigos
                            </span>

                            {/* Sequential code generation box */}
                            <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 rounded-xl p-4 space-y-3.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="chk-auto-gen-codes"
                                  checked={autoGenCodes}
                                  onChange={e => setAutoGenCodes(e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                />
                                <label htmlFor="chk-auto-gen-codes" className="text-xs font-black text-slate-800 cursor-pointer select-none">
                                  Autogenerar códigos secuenciales ordenados (Ej: VL-0001, VL-0002...)
                                </label>
                              </div>

                              <p className="text-[11px] text-slate-500 leading-normal">
                                * Nota: Si activa esta casilla, o si los códigos del Excel están vacíos o contienen simples índices numéricos (como 1, 2, 3), se generarán códigos con el formato configurado a continuación para mantener el orden exacto de sus repuestos.
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                <div className="space-y-1">
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Prefijo del Código</label>
                                  <input
                                    type="text"
                                    value={autoGenPrefix}
                                    onChange={e => setAutoGenPrefix(e.target.value)}
                                    placeholder="Ej: VL-"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                                    disabled={!autoGenCodes}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Iniciar desde número</label>
                                  <input
                                    type="number"
                                    value={autoGenStartNum}
                                    onChange={e => setAutoGenStartNum(Math.max(1, Number(e.target.value)))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                                    disabled={!autoGenCodes}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Defaults Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría por Defecto</label>
                                <select
                                  value={defaultCategory}
                                  onChange={e => setDefaultCategory(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-emerald-500 font-bold text-slate-700"
                                >
                                  {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Estado de Campaña</label>
                                <select
                                  value={defaultStatus}
                                  onChange={e => setDefaultStatus(e.target.value as any)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                                >
                                  <option value="Catálogo general">Catálogo general</option>
                                  <option value="Nuevo">Nuevo</option>
                                  <option value="Promoción">Promoción</option>
                                  <option value="Importación próxima">Importación próxima</option>
                                  <option value="Agotado">Agotado</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Stock de Unidades</label>
                                <input
                                  type="number"
                                  value={defaultStock}
                                  onChange={e => setDefaultStock(Number(e.target.value))}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Cant. por Caja por Defecto</label>
                                <input
                                  type="number"
                                  value={defaultUnitsPerBox}
                                  onChange={e => setDefaultUnitsPerBox(Math.max(0, Number(e.target.value)))}
                                  placeholder="Ej: 100"
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                                />
                              </div>
                            </div>
                          </div>

                          {/* First 3 Rows Preview */}
                          <div className="border-t border-slate-100 pt-5">
                            <span className="block text-[11px] font-mono uppercase text-slate-400 mb-2 tracking-wider font-extrabold">
                              3. Vista Previa de Datos Mapeados (Primeros 3 elementos)
                            </span>
                            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                              <table className="w-full text-left font-mono">
                                <thead className="bg-slate-50 text-[10px] text-slate-400 border-b border-slate-200 uppercase">
                                  <tr>
                                    <th className="p-2">Código</th>
                                    <th className="p-2">Nombre del Producto</th>
                                    <th className="p-2">Imagen</th>
                                    <th className="p-2">Marca</th>
                                    <th className="p-2">Precio</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px]">
                                  {excelRows.slice(0, 3).map((row, idx) => {
                                    const code = row[mappedFields.code] || '-';
                                    const name = row[mappedFields.name] || '-';
                                    const image = row[mappedFields.imageUrl] || '-';
                                    const brand = row[mappedFields.brand] || '-';
                                    const price = row[mappedFields.price] || 0;
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 text-emerald-600 font-bold">{code}</td>
                                        <td className="p-2 text-slate-800 font-semibold truncate max-w-[180px]">{name}</td>
                                        <td className="p-2 truncate max-w-[120px] text-slate-400 text-[10px]">{image}</td>
                                        <td className="p-2 text-slate-500">{brand}</td>
                                        <td className="p-2 text-slate-900 font-bold">S/. {Number(price).toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Step 3: Progress and Stats */}
                      {(importProgress.status === 'uploading' || importProgress.status === 'completed') && (
                        <div className="py-8 text-center space-y-6">
                          
                          {importProgress.status === 'uploading' ? (
                            <div className="space-y-2">
                              <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-2" />
                              <h5 className="font-display font-black text-slate-800 text-sm">Procesando Importación...</h5>
                              <p className="text-xs text-slate-400 font-mono">
                                Subiendo lote de productos. Por favor, no cierre esta ventana.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 animate-bounce">
                              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                              <h5 className="font-display font-black text-emerald-600 text-sm font-mono uppercase">¡Importación Exitosa!</h5>
                              <p className="text-xs text-slate-500">
                                Todos los repuestos válidos han sido añadidos a la base de datos de Velkor.
                              </p>
                            </div>
                          )}

                          {/* Progress bar */}
                          <div className="space-y-1 max-w-md mx-auto">
                            <div className="flex justify-between text-xs font-mono text-slate-500">
                              <span>Progreso de Registros</span>
                              <span>
                                {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100) || 0}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-300"
                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Statistics counter */}
                          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-center font-mono">
                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block uppercase">Correctos</span>
                              <span className="text-xl font-black text-emerald-600">{importProgress.successCount}</span>
                            </div>
                            <div className="text-center border-l border-slate-200">
                              <span className="text-[10px] text-slate-400 block uppercase">Errores / Omitidos</span>
                              <span className="text-xl font-black text-slate-500">{importProgress.errorCount}</span>
                            </div>
                          </div>

                        </div>
                      )}

                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
                      {excelRows.length > 0 && importProgress.status !== 'uploading' && importProgress.status !== 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setExcelRows([]);
                              setExcelHeaders([]);
                            }}
                            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold font-mono"
                          >
                            Volver a cargar
                          </button>
                          <button
                            type="button"
                            onClick={startBatchImport}
                            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors font-mono"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Iniciar Importación en Lotes
                          </button>
                        </>
                      )}
                      
                      {importProgress.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsImportingExcel(false);
                            setExcelRows([]);
                            setExcelHeaders([]);
                          }}
                          className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors font-mono"
                        >
                          Cerrar Importador
                        </button>
                      )}

                      {excelRows.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setIsImportingExcel(false)}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              )}
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

          {/* ==================== 6. TAB: SETTINGS ==================== */}
          {activeTab === 'settings' && (
            <div id="admin-settings-tab" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-slideDown p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-500" />
                  Configuración de Página y Tienda Virtual
                </h2>
                <p className="text-slate-500 text-xs mt-1 font-mono">
                  Personaliza el aspecto visual de Velkor Importaciones cargando tu logo oficial y tu banner publicitario principal.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingSettings(true);
                try {
                  await updateStoreConfig({ logoUrl: storeLogo, bannerUrl: storeBanner });
                  alert('¡Configuración guardada con éxito! El logo y el banner se actualizarán instantáneamente para todos los clientes en la tienda virtual.');
                } catch (err) {
                  console.error('Error saving store config:', err);
                  alert('Ocurrió un error al guardar la configuración en la base de datos.');
                } finally {
                  setIsSavingSettings(false);
                }
              }} className="space-y-8">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Logo Config Section */}
                  <div className="space-y-4 border border-slate-100 rounded-xl p-5 bg-slate-50/50">
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                        <Image className="w-4 h-4 text-emerald-500" />
                        Logo Oficial de la Tienda
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        Se muestra en la esquina superior izquierda del encabezado y en el pie de página de la web de los clientes.
                      </p>
                    </div>

                    {/* Logo Preview */}
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2 shadow-inner shrink-0 overflow-hidden">
                        {storeLogo ? (
                          <img src={storeLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400 text-center font-mono font-bold">Sin Logo</span>
                        )}
                      </div>
                      <div className="space-y-2 flex-1">
                        <label className="block text-xs font-mono font-bold text-slate-700">Subir Logo desde tu computadora:</label>
                        <input
                          id="logo-file-input"
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await new Promise<string>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const img = new window.Image();
                                    img.onload = () => {
                                      const canvas = document.createElement('canvas');
                                      const ctx = canvas.getContext('2d');
                                      canvas.width = 200;
                                      canvas.height = 200;
                                      if (ctx) {
                                        ctx.drawImage(img, 0, 0, 200, 200);
                                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                                      } else {
                                        reject(new Error('Canvas context error'));
                                      }
                                    };
                                    img.onerror = () => reject(new Error('Error al cargar la imagen'));
                                    img.src = event.target?.result as string;
                                  };
                                  reader.onerror = () => reject(new Error('Error de FileReader'));
                                  reader.readAsDataURL(file);
                                });
                                setStoreLogo(compressed);
                              } catch (err) {
                                console.error('Error al procesar logo:', err);
                                alert('Error al procesar e integrar el archivo de logo');
                              }
                            }
                          }}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                        />
                        <div className="text-[10px] text-slate-400">Formatos recomendados: PNG o JPG con fondo blanco o transparente.</div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <label className="block text-[10px] font-mono uppercase text-slate-500">O ingresa un enlace (URL) alternativo para tu logo:</label>
                      <input
                        id="logo-url-input"
                        type="url"
                        placeholder="https://ejemplo.com/logo.png"
                        value={storeLogo}
                        onChange={(e) => setStoreLogo(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono"
                      />
                    </div>

                    {storeLogo && (
                      <button
                        type="button"
                        onClick={() => setStoreLogo('')}
                        className="text-[10px] font-mono text-rose-500 hover:text-rose-700 font-bold border border-transparent hover:border-rose-100 bg-rose-50 px-2 py-1 rounded"
                      >
                        Quitar Logo / Restaurar Predeterminado
                      </button>
                    )}
                  </div>

                  {/* Banner Config Section */}
                  <div className="space-y-4 border border-slate-100 rounded-xl p-5 bg-slate-50/50">
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                        <Image className="w-4 h-4 text-emerald-500" />
                        Banner Publicitario Principal (Cabecera)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        Fondo de la sección principal en el catálogo. Se recomienda una imagen panorámica de alta calidad de repuestos o motocicletas.
                      </p>
                    </div>

                    {/* Banner Preview */}
                    <div className="space-y-3">
                      <div className="relative w-full h-28 bg-neutral-900 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-inner">
                        {storeBanner ? (
                          <>
                            <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${storeBanner})` }} />
                            <div className="relative z-10 text-center space-y-1">
                              <p className="text-white text-xs font-bold font-display uppercase tracking-wider">VELKOR IMPORTACIONES</p>
                              <p className="text-[9px] text-emerald-400 font-mono">Vista Previa Interactiva del Banner</p>
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono font-bold">Sin Banner / Fondo Predeterminado Activo</span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-mono font-bold text-slate-700">Subir Banner desde tu computadora:</label>
                        <input
                          id="banner-file-input"
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await new Promise<string>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const img = new window.Image();
                                    img.onload = () => {
                                      const canvas = document.createElement('canvas');
                                      const ctx = canvas.getContext('2d');
                                      const MAX_W = 800;
                                      const MAX_H = 400;
                                      let w = img.width;
                                      let h = img.height;
                                      if (w > MAX_W) {
                                        h = (h * MAX_W) / w;
                                        w = MAX_W;
                                      }
                                      if (h > MAX_H) {
                                        w = (w * MAX_H) / h;
                                        h = MAX_H;
                                      }
                                      canvas.width = w;
                                      canvas.height = h;
                                      if (ctx) {
                                        ctx.drawImage(img, 0, 0, w, h);
                                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                                      } else {
                                        reject(new Error('Canvas context error'));
                                      }
                                    };
                                    img.onerror = () => reject(new Error('Error al cargar la imagen'));
                                    img.src = event.target?.result as string;
                                  };
                                  reader.onerror = () => reject(new Error('FileReader error'));
                                  reader.readAsDataURL(file);
                                });
                                setStoreBanner(compressed);
                              } catch (err) {
                                console.error('Error al procesar banner:', err);
                                alert('Error al comprimir y procesar la imagen de banner.');
                              }
                            }
                          }}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                        />
                        <div className="text-[10px] text-slate-400">Recomendado: Imágenes horizontales de repuestos de motos. El sistema las comprimirá automáticamente.</div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <label className="block text-[10px] font-mono uppercase text-slate-500">O ingresa un enlace (URL) alternativo para tu banner:</label>
                      <input
                        id="banner-url-input"
                        type="url"
                        placeholder="https://ejemplo.com/banner.jpg"
                        value={storeBanner}
                        onChange={(e) => setStoreBanner(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono"
                      />
                    </div>

                    {storeBanner && (
                      <button
                        type="button"
                        onClick={() => setStoreBanner('')}
                        className="text-[10px] font-mono text-rose-500 hover:text-rose-700 font-bold border border-transparent hover:border-rose-100 bg-rose-50 px-2 py-1 rounded"
                      >
                        Quitar Banner / Restaurar Predeterminado
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="border-t border-slate-100 pt-6 flex justify-end">
                  <button
                    id="save-store-settings-btn"
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-emerald-500 hover:bg-emerald-450 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-display font-black px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-mono uppercase tracking-wider text-sm flex items-center gap-2"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Guardar Configuración de Tienda
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
