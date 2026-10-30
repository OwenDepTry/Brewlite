/**
 * Chạy trước khi import AppModule trong test tích hợp.
 * Dùng một CSDL riêng (mặc định brewlite_test) và xóa sạch bảng mỗi lần chạy.
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://brewlite:brewlite@localhost:5432/brewlite_test';
process.env.DB_SYNC = 'true';
process.env.DB_DROP_SCHEMA = 'true';
process.env.SEED_ON_START = 'true';
process.env.JWT_SECRET = 'test-secret';
// có độ trễ nhỏ để các request đồng thời thật sự chồng lên nhau
process.env.MOCK_PAYMENT_LATENCY_MS = '25';
process.env.DB_POOL_SIZE = '30';
