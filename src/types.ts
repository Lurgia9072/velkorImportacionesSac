export interface Product {
  id?: string;
  name: string;
  price: number; // legacy pricing
  showPrice: boolean; // legacy
  category: string;
  status: 'Nuevo' | 'Promoción' | 'Importación próxima' | 'Catálogo general' | 'Agotado';
  description: string;
  stock?: number;
  imageUrl: string;
  imageUrls?: string[]; // Multiple photos gallery
  views?: number;
  sales?: number;
  colors?: string;            // Optional: colors of the item
  motorcycleBrands?: string;  // Optional: brands of compatible motorcycles
  wholesalePrice?: number;    // Only visible to administrators
  retailPrice?: number;       // Only visible to administrators
  arrivalDate?: string;       // Expected delivery date from China for upcoming imports
  code?: string;              // Product code VK
  brand?: string;             // Brand of the product
  unitsPerBox?: number;       // Quantity of units per box (e.g. 300)
}

export interface CartItem {
  product: Product;
  quantity: number; // total units
  unitType?: 'unidades' | 'cajas';
  unitQuantity?: number; // chosen quantity in units/boxes
}

export interface Order {
  id?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  region: string;             // Client region for analytics & mapping potential clients
  productId: string;
  productName: string;
  productPrice: number;
  productCode?: string;       // Saved product code VK
  quantity: number;
  unitType?: 'unidades' | 'cajas'; // Unit type chosen
  selectedQuantity?: number;  // Number of units or boxes chosen
  requestType: 'Compra directa' | 'Consulta' | 'Cotización';
  paymentMethod: '50/50' | '20% adelanto / 80% entrega' | 'Otro';
  status: 'En seguimiento' | 'Vendido' | 'Despachado' | 'En entrega' | 'En envío' | 'Entregado' | 'Pagado' | 'Rechazado' | 'No pagó' | 'Venta cerrada' | 'No compró';
  paidAmount?: number;        // Paid amount tracked by administrator
  pendingAmount?: number;     // Remaining unpaid balance tracked by administrator
  noPurchaseReason?: string;
  createdAt: string; // ISO string
  orderGroupId?: string;      // Group ID for consolidating checkout items
}

export const CATEGORIES = [
  'Motor',
  'Sistema eléctrico',
  'Sistema de frenos',
  'Transmisión',
  'Suspensiones y dirección',
  'Accesorios y equipamiento',
  'Iluminación',
  'Lubricantes y mantenimiento',
  'Admisión y escape',
  'Llantas y neumáticos',
  'Carrocería y estetica',
  'Tornillería y ferretería',
   'Implementos de seguridad',

] as const;

export interface StoreConfig {
  logoUrl?: string;
  bannerUrl?: string;
}

