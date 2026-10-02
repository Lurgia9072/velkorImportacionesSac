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
  status: 'En seguimiento' | 'Cotizado' | 'Vendido' | 'Despachado' | 'En entrega' | 'En envío' | 'Entregado' | 'Pagado' | 'Rechazado' | 'No pagó' | 'Venta cerrada' | 'No compró';
  paidAmount?: number;        // Paid amount tracked by administrator
  pendingAmount?: number;     // Remaining unpaid balance tracked by administrator
  noPurchaseReason?: string;
  quotationId?: string;       // Linked quotation document ID
  quotationNumber?: string;   // Linked quotation number VK-COT-XXXX
  createdAt: string; // ISO string
  orderGroupId?: string;      // Group ID for consolidating checkout items
}

export const CATEGORIES = [
  'Motor',
  'Frenos',
  'Transmisión',
  'Llantas & Cámaras',
  'Sistema Eléctrico',
  'Suspensiones',
  'Accesorios'
] as const;

export interface StoreConfig {
  logoUrl?: string;
  bannerUrl?: string;
  hidePrices?: boolean; // When true, prices are hidden on the public catalog and replaced with "Precio a cotizar"
}

export interface QuotationItem {
  itemNumber: number;
  productId?: string;
  productCode: string;
  productName: string;
  brand?: string;
  quantity: number;
  unitType?: 'unidades' | 'cajas';
  unitsPerBox?: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
}

export type QuotationStatus = 
  | 'Pendiente'
  | 'Pagado'
  | 'Empacando Pedido'
  | 'Despachado'
  | 'Entregado'
  | 'No Concretada'
  | 'Cancelada'
  | 'Pagada'
  | 'Empacar pedido'
  | 'Enviada (Falta pagar)';

export interface Quotation {
  id?: string;
  quoteNumber: string; // VK-COT-XXXX
  date: string; // YYYY-MM-DD or ISO
  validityDays: number;
  
  // Cliente
  customerName: string;
  customerDocType: 'RUC' | 'DNI' | 'CE';
  customerDocNumber: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;

  // Items
  items: QuotationItem[];

  // Finanzas
  subtotal: number;
  includeIgv: boolean;
  igvRate: number; // 0.18
  igvAmount: number;
  total: number;

  // Estado de flujo de trabajo ordenado
  status: QuotationStatus;
  noPurchaseReason?: string;
  
  // Metadatos y notas
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  packedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  originOrderId?: string;
  originOrderGroupId?: string;
}

