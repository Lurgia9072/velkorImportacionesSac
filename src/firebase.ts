import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  increment,
  writeBatch
} from 'firebase/firestore';
import { Product, Order } from './types';

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
export const db = getFirestore(app);

export async function getProducts(): Promise<Product[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });
    return products;
  } catch (error) {
    console.error("Error getting products from Firestore:", error);
    return [];
  }
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'products'), {
    ...product,
    views: product.views || 0,
    sales: product.sales || 0
  });
  return docRef.id;
}

export async function updateProduct(id: string, updatedFields: Partial<Product>): Promise<void> {
  const productDocRef = doc(db, 'products', id);
  await updateDoc(productDocRef, updatedFields);
}

export async function deleteProduct(id: string): Promise<void> {
  const productDocRef = doc(db, 'products', id);
  await deleteDoc(productDocRef);
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
