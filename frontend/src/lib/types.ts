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
