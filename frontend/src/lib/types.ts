export type Size = 'S' | 'M' | 'L';
export type UserRole = 'CUSTOMER' | 'STAFF' | 'MANAGER';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
  available: boolean;
}

export interface ToppingOption {
  id: number;
  name: string;
  price: number;
}

export interface ProductDetail extends Product {
  options: {
    sizes: { size: Size; label: string; surcharge: number }[];
    toppings: ToppingOption[];
  };
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PAYMENT_FAILED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderItemView {
  productId: number;
  productName: string;
  size: Size;
  toppings: ToppingOption[];
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface OrderView {
  id: number;
  code: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  pointsEarned: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemView[];
}

export interface QuoteView {
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  promoError: string | null;
}

export type PaymentMethod = 'WALLET' | 'CARD';

export interface PaymentView {
  id: string;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  status: 'SUCCESS' | 'FAILED';
  failureReason: string | null;
  transactionRef: string | null;
  createdAt: string;
}

export interface PaymentResult {
  payment: PaymentView;
  order: OrderView;
  replayed: boolean;
}

// ---------------- Quản lý ----------------

export interface UserView {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  loyaltyPoints: number;
  createdAt: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
  isActive: boolean;
}

export interface AdminTopping {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
}

export interface AdminPromotion {
  code: string;
  description: string;
  percentOff: number;
  maxDiscount: number | null;
  minOrderTotal: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
}

export interface AdminOrder extends OrderView {
  customer: { id: string; email: string; fullName: string } | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  today: { revenue: number; paidOrders: number; allOrders: number; averageOrderValue: number };
  days: number;
  series: { day: string; revenue: number; orders: number }[];
  periodRevenue: number;
  periodOrders: number;
  topProducts: { productId: number; productName: string; qty: number; revenue: number }[];
  queue: { PAID: number; PREPARING: number; READY: number };
  lowStock: { id: number; name: string; stock: number }[];
  lowStockThreshold: number;
  customers: number;
}
