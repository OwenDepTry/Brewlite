export type Size = 'S' | 'M' | 'L';

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

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

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
