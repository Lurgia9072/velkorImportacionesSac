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

export const PRIMARY_CATEGORIES = [
  'Motor',
  'Frenos',
  'Transmisión',
  'Llantas & Cámaras',
  'Sistema Eléctrico',
  'Suspensiones',
  'Accesorios'
] as const;

export interface CategoryGroup {
  group: string;
  categories: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: 'Repuestos de Motor & Rendimiento',
    categories: [
      'Motor',
      'Motor & Partes Internas',
      'Cilindros, Pistones & Anillos',
      'Culata, Válvulas & Balancines',
      'Carburadores, Toberas & Admisión',
      'Embrague & Discos de Clutch',
      'Transmisión, Cadenas & Kit de Arrastre',
      'Transmisión',
      'Bombas de Aceite & Lubricación',
      'Empaquetaduras, Retenes & Sellos',
      'Cigüeñales, Bielas & Rodamientos',
      'Arrancadores, Bendix & Piñones de Arranque',
      'Filtros de Aire, Aceite & Gasolina'
    ]
  },
  {
    group: 'Sistema Eléctrico & Encendido',
    categories: [
      'Sistema Eléctrico',
      'Sistema Eléctrico & Encendido',
      'CDI, Bobinas de Alta & Reguladores',
      'Estatores, Magnetos & Platos de Bobina',
      'Baterías de Moto',
      'Bujías & Capuchones',
      'Faros Principales, Focos LED & Neblineros',
      'Stops Traseros & Luces de Cola',
      'Direccionales & Luces de Señalización',
      'Velocímetros, Tacómetros & Tableros',
      'Switches, Chapas de Contacto & Comandos',
      'Bocinas & Claxon'
    ]
  },
  {
    group: 'Frenos & Control',
    categories: [
      'Frenos',
      'Frenos (Pastillas, Discos & Zapatas)',
      'Bombas de Freno, Calipers & Mangueras Hidráulicas',
      'Cables (Acelerador, Embrague, Freno, Velocímetro)',
      'Manetas, Manijas & Bombas de Embrague',
      'Timones, Manubrios & Puños'
    ]
  },
  {
    group: 'Suspensión, Dirección & Chasis',
    categories: [
      'Suspensiones',
      'Suspensiones Traseras & Amortiguadores',
      'Barras Telescópicas, Botellas & Retenes de Barra',
      'Cunas de Dirección, Rodajes & Ejes',
      'Chasis, Carenados, Tapas Laterales & Plásticos',
      'Guardabarros Delanteros & Traseros',
      'Máscaras de Faro & Cúpulas',
      'Asientos, Fundas & Cojines',
      'Tanques de Combustible, Tapas & Grifos',
      'Tubos de Escape, Silenciadores & Muflas'
    ]
  },
  {
    group: 'Llantas, Cámaras & Aros',
    categories: [
      'Llantas & Cámaras',
      'Llantas de Moto (Pistera, Mixta, Cross)',
      'Cámaras de Aire & Protectores de Aro',
      'Aros de Aleación & Rayos',
      'Mazas, Ejes & Rodajes de Rueda'
    ]
  },
  {
    group: 'Accesorios & Equipamiento de Motos',
    categories: [
      'Accesorios',
      'Accesorios & Equipamiento',
      'Cascos (Integrales, Abiertos, Modulares & Cross)',
      'Visores, Micas & Pines para Casco',
      'Guantes de Protección para Motociclista',
      'Rodilleras, Coderas & Pecheras de Seguridad',
      'Casacas, Chaquetas & Chalecos Reflectivos',
      'Ponchos & Trajes Impermeables para Lluvia',
      'Maletas, Alforjas & Cajas de Delivery',
      'Baúles & Maleteros Traseros',
      'Soportes para Celular & GPS para Moto',
      'Cargadores USB, Tomas 12V & Voltímetros',
      'Alarmas con Sensor de Golpe & Controles',
      'Candados de Disco con Alarma & Cadenas de Seguridad',
      'Rastreadores GPS para Motos',
      'Defensas de Motor, Mataperros & Jaulas',
      'Sliders de Protección Anti-Caídas',
      'Espejos Retrovisores (Originales & Deportivos)',
      'Paradores Laterales, Caballetes & Patas de Apoyo',
      'Pedales de Cambio, Freno & Estribos (Pedalines)',
      'Parabrisas, Cúpulas & Cortavientos',
      'Fundas Protectoras Impermeables para Moto',
      'Herramientas de Mecánica & Llaves de Taller',
      'Extractores de Volante & Herramientas Especiales',
      'Aceites de Motor 4T / 2T & Lubricantes',
      'Lubricantes de Cadena & Grasas Especiales',
      'Líquidos de Freno, Refrigerantes & Químicos'
    ]
  }
];

export const CATEGORIES = [
  // --- REPUESTOS DE MOTOR Y RENDIMIENTO ---
  'Motor',
  'Motor & Partes Internas',
  'Cilindros, Pistones & Anillos',
  'Culata, Válvulas & Balancines',
  'Carburadores, Toberas & Admisión',
  'Embrague & Discos de Clutch',
  'Transmisión, Cadenas & Kit de Arrastre',
  'Transmisión',
  'Bombas de Aceite & Lubricación',
  'Empaquetaduras, Retenes & Sellos',
  'Cigüeñales, Bielas & Rodamientos',
  'Arrancadores, Bendix & Piñones de Arranque',
  'Filtros de Aire, Aceite & Gasolina',

  // --- SISTEMA ELÉCTRICO, ENCENDIDO Y LUCES ---
  'Sistema Eléctrico',
  'Sistema Eléctrico & Encendido',
  'CDI, Bobinas de Alta & Reguladores',
  'Estatores, Magnetos & Platos de Bobina',
  'Baterías de Moto',
  'Bujías & Capuchones',
  'Faros Principales, Focos LED & Neblineros',
  'Stops Traseros & Luces de Cola',
  'Direccionales & Luces de Señalización',
  'Velocímetros, Tacómetros & Tableros',
  'Switches, Chapas de Contacto & Comandos',
  'Bocinas & Claxon',

  // --- FRENOS Y CONTROL ---
  'Frenos',
  'Frenos (Pastillas, Discos & Zapatas)',
  'Bombas de Freno, Calipers & Mangueras Hidráulicas',
  'Cables (Acelerador, Embrague, Freno, Velocímetro)',
  'Manetas, Manijas & Bombas de Embrague',
  'Timones, Manubrios & Puños',

  // --- SUSPENSIÓN, DIRECCIÓN Y CHASIS ---
  'Suspensiones',
  'Suspensiones Traseras & Amortiguadores',
  'Barras Telescópicas, Botellas & Retenes de Barra',
  'Cunas de Dirección, Rodajes & Ejes',
  'Chasis, Carenados, Tapas Laterales & Plásticos',
  'Guardabarros Delanteros & Traseros',
  'Máscaras de Faro & Cúpulas',
  'Asientos, Fundas & Cojines',
  'Tanques de Combustible, Tapas & Grifos',
  'Tubos de Escape, Silenciadores & Muflas',

  // --- RUEDAS, LLANTAS Y ARRASTRE ---
  'Llantas & Cámaras',
  'Llantas de Moto (Pistera, Mixta, Cross)',
  'Cámaras de Aire & Protectores de Aro',
  'Aros de Aleación & Rayos',
  'Mazas, Ejes & Rodajes de Rueda',

  // --- ACCESORIOS Y EQUIPAMIENTO DE MOTOS ---
  'Accesorios',
  'Accesorios & Equipamiento',
  'Cascos (Integrales, Abiertos, Modulares & Cross)',
  'Visores, Micas & Pines para Casco',
  'Guantes de Protección para Motociclista',
  'Rodilleras, Coderas & Pecheras de Seguridad',
  'Casacas, Chaquetas & Chalecos Reflectivos',
  'Ponchos & Trajes Impermeables para Lluvia',
  'Maletas, Alforjas & Cajas de Delivery',
  'Baúles & Maleteros Traseros',
  'Soportes para Celular & GPS para Moto',
  'Cargadores USB, Tomas 12V & Voltímetros',
  'Alarmas con Sensor de Golpe & Controles',
  'Candados de Disco con Alarma & Cadenas de Seguridad',
  'Rastreadores GPS para Motos',
  'Defensas de Motor, Mataperros & Jaulas',
  'Sliders de Protección Anti-Caídas',
  'Espejos Retrovisores (Originales & Deportivos)',
  'Paradores Laterales, Caballetes & Patas de Apoyo',
  'Pedales de Cambio, Freno & Estribos (Pedalines)',
  'Parabrisas, Cúpulas & Cortavientos',
  'Fundas Protectoras Impermeables para Moto',
  'Herramientas de Mecánica & Llaves de Taller',
  'Extractores de Volante & Herramientas Especiales',
  'Aceites de Motor 4T / 2T & Lubricantes',
  'Lubricantes de Cadena & Grasas Especiales',
  'Líquidos de Freno, Refrigerantes & Químicos'
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

