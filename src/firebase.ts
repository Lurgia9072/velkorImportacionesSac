import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
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
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { Product, Order, StoreConfig } from './types';

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

// Use auto-detect long polling to prevent WebChannel stream 404/Listen transport errors and memory leaks in browser extensions
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});

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

export async function getProductsPaged(
  limitSize: number = 50,
  startAfterDoc: DocumentSnapshot | null = null,
  category?: string,
  status?: string
): Promise<{ products: Product[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  try {
    const constraints: any[] = [];
    
    if (category && category !== 'Todos') {
      constraints.push(where('category', '==', category));
    }
    
    if (status && status !== 'Todos' && status !== 'MasVendidos') {
      constraints.push(where('status', '==', status));
    } else if (status === 'MasVendidos') {
      constraints.push(where('sales', '>', 0));
    }
    
    // Default alphabetical sorting of products
    constraints.push(orderBy(status === 'MasVendidos' ? 'sales' : 'name'));
    
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    
    constraints.push(firestoreLimit(limitSize));
    
    const q = query(collection(db, 'products'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });
    
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    const hasMore = querySnapshot.docs.length === limitSize;
    
    return {
      products,
      lastDoc,
      hasMore
    };
  } catch (error) {
    console.error("Error getting paged products from Firestore:", error);
    return { products: [], lastDoc: null, hasMore: false };
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

