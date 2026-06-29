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
  apiKey: "AIzaSyD7zcSmxo6m8n2rWzGFxql3Vn-WOFSd4qA",
  authDomain: "ai-studio-applet-webapp-53d2e.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-53d2e",
  storageBucket: "ai-studio-applet-webapp-53d2e.firebasestorage.app",
  messagingSenderId: "75713693883",
  appId: "1:75713693883:web:a1e5a17d49f8a867c2019e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-velkorimportacio-f94654ae-d98e-4957-a050-ec1498ea4506");

// Seed data to make the initial experience rich and professional
const SEED_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Kit de Arrastre Racing Velkor - Honda CB190R',
    price: 145.00,
    showPrice: true,
    category: 'Transmisión',
    status: 'Nuevo',
    description: 'Kit de arrastre reforzado (cadena dorada paso 428H reforzada, corona de acero al carbono y piñón endurecido). Ofrece excelente transmisión de potencia, alta resistencia a la tracción y larga vida útil bajo condiciones exigentes en ciudad o carretera.',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    views: 124,
    sales: 12
  },
  {
    name: 'Pastillas de Freno Semimetálicas Velkor - Pulsar NS200',
    price: 28.00,
    showPrice: true,
    category: 'Frenos',
    status: 'Promoción',
    description: 'Pastillas de freno fabricadas con aleación semimetálica de primera calidad. Excelente coeficiente de fricción, disipación de calor óptima y frenado progresivo de alta seguridad que cuida el disco de freno y evita ruidos chillones.',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80',
    views: 95,
    sales: 18
  },
  {
    name: 'Filtro de Aire Deportivo de Alto Flujo - Yamaha FZ16',
    price: 35.00,
    showPrice: true,
    category: 'Motor',
    status: 'Catálogo general',
    description: 'Filtro de aire lavable y de alta resistencia. Optimiza el flujo de aire hacia el carburador o cuerpo de inyección, garantizando una combustión más eficiente y un incremento sutil en la aceleración de la motocicleta.',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=600&q=80',
    views: 62,
    sales: 5
  },
  {
    name: 'Batería de Gel Velkor Max 12V 7Ah (YTX7A-BS)',
    price: 95.00,
    showPrice: true,
    category: 'Sistema Eléctrico',
    status: 'Nuevo',
    description: 'Batería sellada de gel de alto rendimiento, completamente libre de mantenimiento. Brinda una corriente de arranque en frío (CCA) muy estable y una mayor durabilidad frente a vibraciones del motor y climas variables.',
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    views: 148,
    sales: 9
  },
  {
    name: 'Llanta de Moto 110/90-17 Pistera - Velkor Ninja',
    price: 185.00,
    showPrice: true,
    category: 'Llantas & Cámaras',
    status: 'Importación próxima',
    description: 'Llanta de compuesto medio para asfalto urbano y carretera. Diseño de cocada optimizado para canalizar agua eficientemente, asegurando máximo agarre en curvas cerradas y frenados de emergencia en superficies húmedas. Próxima importación directa de fábrica en China.',
    stock: 0,
    imageUrl: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=600&q=80',
    views: 210,
    sales: 0
  },
  {
    name: 'Amortiguadores Traseros Reforzados Velkor (Par) - Bajaj Torito',
    price: 220.00,
    showPrice: true,
    category: 'Suspensiones',
    status: 'Promoción',
    description: 'Amortiguadores traseros reforzados con doble resorte progresivo. Perfectos para mototaxis Bajaj Torito o motocargas, absorbiendo con suavidad baches en terrenos difíciles y soportando cargas pesadas sin perder estabilidad.',
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=600&q=80',
    views: 89,
    sales: 8
  },
  {
    name: 'Faro Principal LED de Alta Potencia H4 6000K',
    price: 42.00,
    showPrice: true,
    category: 'Sistema Eléctrico',
    status: 'Catálogo general',
    description: 'Foco LED H4 ultra-brillante de 6000 lúmenes con luz blanca fría. Equipado con ventilador inteligente de enfriamiento silencioso y disipador de aluminio espacial. Ofrece mayor visibilidad en conducción nocturna de largo alcance.',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1515777315835-281b94c9589f?auto=format&fit=crop&w=600&q=80',
    views: 110,
    sales: 14
  },
  {
    name: 'Kit Cilindro Completo 150cc - Honda GL150 / Cargo',
    price: 260.00,
    showPrice: true,
    category: 'Motor',
    status: 'Nuevo',
    description: 'Kit de cilindro estándar de alta precisión fabricado en aleación de aluminio y camisa de hierro gris. Incluye pistón, juego de anillos de compresión, pasador, seguros y empaques completos de motor para restaurar la compresión original de fábrica.',
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1615887023516-9b6bcd559e87?auto=format&fit=crop&w=600&q=80',
    views: 155,
    sales: 4
  },
  {
    name: 'Espejos Retrovisores Deportivos Carbono Universales',
    price: 49.00,
    showPrice: true,
    category: 'Accesorios',
    status: 'Promoción',
    description: 'Juego de espejos retrovisores universales con diseño aerodinámico y acabado tipo fibra de carbono de alta resistencia. Incluye pernos adaptadores de 8mm y 10mm rosca derecha/izquierda para una compatibilidad perfecta con cualquier motocicleta.',
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1516496636080-14fb876e029f?auto=format&fit=crop&w=600&q=80',
    views: 73,
    sales: 11
  }
];

export async function getProducts(): Promise<Product[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() } as Product);
    });
    
    // Auto-seed if database is empty
    if (products.length === 0) {
      console.log("No products found in Firestore. Seeding database with initial motorcycle parts...");
      const batch = writeBatch(db);
      const seeded: Product[] = [];
      
      for (const p of SEED_PRODUCTS) {
        const docRef = doc(collection(db, 'products'));
        batch.set(docRef, p);
        seeded.push({ id: docRef.id, ...p } as Product);
      }
      
      await batch.commit();
      console.log("Successfully seeded 9 initial products into Firestore.");
      return seeded;
    }
    
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
