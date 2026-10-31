/** Dữ liệu mẫu – ảnh nằm ở frontend/public/images */

export const SEED_PRODUCTS = [
  { name: 'Cà phê sữa', category: 'Cà phê', price: 35000, stock: 100, imageUrl: '/images/ca-phe-sua.svg', description: 'Cà phê phin pha sữa đặc, đậm vị truyền thống.' },
  { name: 'Bạc xỉu', category: 'Cà phê', price: 35000, stock: 80, imageUrl: '/images/bac-xiu.svg', description: 'Nhiều sữa, ít cà phê, ngọt dịu.' },
  { name: 'Americano', category: 'Cà phê', price: 40000, stock: 80, imageUrl: '/images/americano.svg', description: 'Espresso pha loãng với nước nóng, thanh và nhẹ.' },
  { name: 'Cappuccino', category: 'Cà phê', price: 45000, stock: 60, imageUrl: '/images/cappuccino.svg', description: 'Espresso, sữa nóng và lớp bọt sữa mịn.' },
  { name: 'Latte', category: 'Cà phê', price: 45000, stock: 60, imageUrl: '/images/latte.svg', description: 'Espresso với nhiều sữa tươi đánh nóng.' },
  { name: 'Trà đào', category: 'Trà', price: 39000, stock: 70, imageUrl: '/images/tra-dao.svg', description: 'Trà đen ủ lạnh với đào miếng giòn ngọt.' },
  { name: 'Trà sữa trân châu', category: 'Trà', price: 42000, stock: 70, imageUrl: '/images/tra-sua.svg', description: 'Trà sữa đậm vị kèm trân châu đen.' },
  { name: 'Matcha latte', category: 'Trà', price: 49000, stock: 40, imageUrl: '/images/matcha.svg', description: 'Matcha Nhật Bản và sữa tươi.' },
];

export const SEED_TOPPINGS = [
  { name: 'Trân châu', price: 5000 },
  { name: 'Thạch đào', price: 7000 },
  { name: 'Kem cheese', price: 10000 },
  { name: 'Thêm shot espresso', price: 10000 },
];

/** Tài khoản demo (mật khẩu được băm bcrypt khi seed) */
export const SEED_USERS = [
  { email: 'demo@brewlite.vn', password: 'demo1234', fullName: 'Khách Demo', role: 'CUSTOMER' as const },
  { email: 'barista@brewlite.vn', password: 'barista123', fullName: 'Barista BrewLite', role: 'STAFF' as const },
  { email: 'manager@brewlite.vn', password: 'manager123', fullName: 'Quản lý BrewLite', role: 'MANAGER' as const },
];

/** Mã khuyến mãi mẫu (SUMMER25 đã hết hạn – dùng để demo trường hợp bị từ chối) */
export const SEED_PROMOTIONS = [
  {
    code: 'WELCOME10',
    description: 'Giảm 10% cho đơn từ 50.000đ, tối đa 20.000đ',
    percentOff: 10,
    maxDiscount: 20000,
    minOrderTotal: 50000,
    startsAt: new Date('2026-01-01T00:00:00+07:00'),
    endsAt: new Date('2027-12-31T23:59:59+07:00'),
    active: true,
    usageLimit: null,
  },
  {
    code: 'BREW20',
    description: 'Giảm 20% cho đơn từ 100.000đ, tối đa 30.000đ (giới hạn 100 lượt)',
    percentOff: 20,
    maxDiscount: 30000,
    minOrderTotal: 100000,
    startsAt: new Date('2026-01-01T00:00:00+07:00'),
    endsAt: new Date('2027-12-31T23:59:59+07:00'),
    active: true,
    usageLimit: 100,
  },
  {
    code: 'SUMMER25',
    description: 'Ưu đãi hè 2025 (đã hết hạn)',
    percentOff: 25,
    maxDiscount: null,
    minOrderTotal: 0,
    startsAt: new Date('2025-06-01T00:00:00+07:00'),
    endsAt: new Date('2025-08-31T23:59:59+07:00'),
    active: true,
    usageLimit: null,
  },
];
