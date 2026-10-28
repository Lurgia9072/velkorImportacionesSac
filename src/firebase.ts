import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  increment,
  writeBatch,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getCountFromServer,
  DocumentSnapshot
} from 'firebase/firestore';
import { Product, Order, StoreConfig, Quotation } from './types';

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBnzxk_ho1l0Kd0cTmsveizSkx4zdeAReM",
  authDomain: "velkor-importaciones-sac.firebaseapp.com",
  projectId: "velkor-importaciones-sac",
  storageBucket: "velkor-importaciones-sac.firebasestorage.app",
  messagingSenderId: "881230974520",
  appId: "1:881230974520:web:06cef873d4a78ec0efe0cd",
  measurementId: "G-NQF14FRXPH"
};

const app = initializeApp(firebaseConfig);

// Initialize standard Firestore client for fast web streaming without auto-detect probe latency
export const db = getFirestore(app);

// Cache for products to enable fast client/admin pagination without redundant network roundtrips
let cachedProducts: Product[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds cache

export function clearProductsCache() {
  cachedProducts = null;
  lastFetchTime = 0;
}

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  const now = Date.now();
  if (!forceRefresh && cachedProducts && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedProducts;
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });
    
    // Sort products by name by default
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    cachedProducts = products;
    lastFetchTime = now;
    return products;
  } catch (error) {
    console.error("Error getting products from Firestore:", error);
    if (cachedProducts) return cachedProducts;
    return [];
  }
}

export interface PagedProductsParams {
  page: number; // 1-indexed
  pageSize?: number; // default 10
  category?: string;
  status?: string;
  searchQuery?: string;
}

export interface PagedProductsResponse {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Loads products from Firestore strictly by pages of 10 items (or configured pageSize).
 * Executes counts on the backend and streams only the requested page's documents to maximize speed.
 */
export async function getProductsPagedFromDB(params: PagedProductsParams): Promise<PagedProductsResponse> {
  const { page = 1, pageSize = 10, category, status, searchQuery } = params;

  try {
    const cleanSearch = (searchQuery || '').trim();

    // 1. If text search is active, execute database search matching code, name, description
    if (cleanSearch) {
      const upper = cleanSearch.toUpperCase();
      const cap = cleanSearch.charAt(0).toUpperCase() + cleanSearch.slice(1).toLowerCase();
      const qLower = cleanSearch.toLowerCase();
      const foundMap = new Map<string, Product>();

      // Target query A: Code match
      try {
        const qCode = query(collection(db, 'products'), where('code', '==', upper), firestoreLimit(pageSize));
        const snapCode = await getDocs(qCode);
        snapCode.docs.forEach(d => foundMap.set(d.id, { id: d.id, ...d.data() } as Product));
      } catch (err) {
        console.warn('Code search query:', err);
      }

      // Target query B: Name prefix match (uppercase)
      try {
        const qUpper = query(
          collection(db, 'products'),
          where('name', '>=', upper),
          where('name', '<=', upper + '\uf8ff'),
          firestoreLimit(pageSize)
        );
        const snapUpper = await getDocs(qUpper);
        snapUpper.docs.forEach(d => foundMap.set(d.id, { id: d.id, ...d.data() } as Product));
      } catch (err) {
        console.warn('Name prefix upper query:', err);
      }

      // Target query C: Name prefix match (capitalized)
      try {
        const qCap = query(
          collection(db, 'products'),
          where('name', '>=', cap),
          where('name', '<=', cap + '\uf8ff'),
          firestoreLimit(pageSize)
        );
        const snapCap = await getDocs(qCap);
        snapCap.docs.forEach(d => foundMap.set(d.id, { id: d.id, ...d.data() } as Product));
      } catch (err) {
        console.warn('Name prefix cap query:', err);
      }

      let allResults = Array.from(foundMap.values());

      // If fewer than pageSize results, perform fast fallback across products for mid-string or description matching
      if (allResults.length < pageSize) {
        try {
          const allItems = await getProducts();
          const fallback: Product[] = [];
          allItems.forEach(data => {
            if (!data.id || foundMap.has(data.id)) return;
            const n = (data.name || '').toLowerCase();
            const c = (data.code || '').toLowerCase();
            const desc = (data.description || '').toLowerCase();
            const b = (data.brand || '').toLowerCase();
            if (n.includes(qLower) || c.includes(qLower) || desc.includes(qLower) || b.includes(qLower)) {
              fallback.push(data);
            }
          });
          allResults = [...allResults, ...fallback];
        } catch (err) {
          console.warn('Fallback search query:', err);
        }
      }

      // Filter by category if specified
      if (category && category !== 'Todos') {
        allResults = allResults.filter(p => p.category === category || (p.category && p.category.toLowerCase().trim() === category.toLowerCase().trim()));
      }

      // Filter by status if specified
      if (status && status !== 'Todos' && status !== 'MasVendidos') {
        allResults = allResults.filter(p => p.status === status);
      } else if (status === 'MasVendidos') {
        allResults = allResults.filter(p => p.sales !== undefined && p.sales > 0);
      }

      // Never show 'Agotado' items in public customer catalog
      allResults = allResults.filter(p => p.status !== 'Agotado');

      const totalCount = allResults.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const pageProducts = allResults.slice((page - 1) * pageSize, page * pageSize);

      return {
        products: pageProducts,
        totalCount,
        totalPages,
        currentPage: page
      };
    }

    // 2. Direct database pagination with limit(pageSize)
    const constraints: any[] = [];
    if (category && category !== 'Todos') {
      constraints.push(where('category', '==', category));
    }
    if (status && status !== 'Todos' && status !== 'MasVendidos') {
      constraints.push(where('status', '==', status));
    } else if (status === 'MasVendidos') {
      constraints.push(where('sales', '>', 0));
    }

    // Backend count calculation without downloading document bodies
    const countQuery = query(collection(db, 'products'), ...constraints);
    const countSnap = await getCountFromServer(countQuery);
    const totalCount = countSnap.data().count;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Order alphabetically by name only when not filtering by category or status to avoid composite index requirements
    const queryConstraints = [...constraints];
    if ((!category || category === 'Todos') && (!status || status === 'Todos')) {
      queryConstraints.push(orderBy('name'));
    }

    // Load only the documents needed for this page
    const fetchLimit = Math.min(page * pageSize, totalCount > 0 ? totalCount : pageSize);
    const pageQuery = query(collection(db, 'products'), ...queryConstraints, firestoreLimit(fetchLimit));
    const snap = await getDocs(pageQuery);

    const allDocs = snap.docs;
    const pageDocs = allDocs.slice((page - 1) * pageSize, page * pageSize);
    const products: Product[] = pageDocs.map(d => ({ id: d.id, ...d.data() } as Product));

    return {
      products,
      totalCount,
      totalPages,
      currentPage: page
    };
  } catch (error) {
    console.error("Error in getProductsPagedFromDB:", error);
    return {
      products: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1
    };
  }
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'products'), {
    ...product,
    views: product.views || 0,
    sales: product.sales || 0
  });
  clearProductsCache();
  return docRef.id;
}

export async function updateProduct(id: string, updatedFields: Partial<Product>): Promise<void> {
  const productDocRef = doc(db, 'products', id);
  await updateDoc(productDocRef, updatedFields);
  clearProductsCache();
}

export async function deleteProduct(id: string): Promise<void> {
  const productDocRef = doc(db, 'products', id);
  await deleteDoc(productDocRef);
  clearProductsCache();
}

export async function incrementProductView(productId: string): Promise<void> {
  try {
    const productDocRef = doc(db, 'products', productId);
    await updateDoc(productDocRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error("Error incrementing product view:", error);
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const orders: Order[] = [];
    querySnapshot.forEach((docSnap) => {
      orders.push({ id: docSnap.id, ...docSnap.data() } as Order);
    });
    // Sort by date descending
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error getting orders from Firestore:", error);
    return [];
  }
}

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
  // Add doc
  const docRef = await addDoc(collection(db, 'orders'), order);
  
  // Also increment view or sales on the specific product
  try {
    const productDocRef = doc(db, 'products', order.productId);
    await updateDoc(productDocRef, {
      sales: increment(order.quantity)
    });
  } catch (err) {
    console.warn("Could not increment product sales stat:", err);
  }
  
  return docRef.id;
}

export async function updateOrder(id: string, updatedFields: Partial<Order>): Promise<void> {
  const orderDocRef = doc(db, 'orders', id);
  await updateDoc(orderDocRef, updatedFields);
  
  // If order is updated to 'Venta cerrada', or if quantity changes, we could manage sales,
  // but keeping it simple: when created, we count it, and we can also update based on close status if needed.
}

export async function getStoreConfig(): Promise<StoreConfig | null> {
  try {
    const configDocRef = doc(db, 'settings', 'store_config');
    const docSnap = await getDoc(configDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as StoreConfig;
    }
    return null;
  } catch (error) {
    console.error("Error getting store config from Firestore:", error);
    return null;
  }
}

export async function updateStoreConfig(config: StoreConfig): Promise<void> {
  const configDocRef = doc(db, 'settings', 'store_config');
  await setDoc(configDocRef, config, { merge: true });
}

// ==================== COTIZACIONES / QUOTATIONS ====================

export async function getQuotations(): Promise<Quotation[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'quotations'));
    const quotations: Quotation[] = [];
    querySnapshot.forEach((docSnap) => {
      quotations.push({ id: docSnap.id, ...docSnap.data() } as Quotation);
    });
    // Sort descending by creation date or quotation date
    return quotations.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  } catch (error) {
    console.error("Error getting quotations from Firestore:", error);
    return [];
  }
}

export async function createQuotation(quotation: Omit<Quotation, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'quotations'), {
    ...quotation,
    createdAt: quotation.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateQuotation(id: string, updatedFields: Partial<Quotation>): Promise<void> {
  const quotationDocRef = doc(db, 'quotations', id);
  await updateDoc(quotationDocRef, {
    ...updatedFields,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteQuotation(id: string): Promise<void> {
  const quotationDocRef = doc(db, 'quotations', id);
  await deleteDoc(quotationDocRef);
}


