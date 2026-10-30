/**
 * Test tích hợp Task 10 – chạy với PostgreSQL thật (xem test/setup-env.ts).
 *   (a) chặn chuyển trạng thái sai
 *   (b) gửi 2 lần cùng Idempotency-Key chỉ tạo 1 đơn / 1 giao dịch
 *   (c) đặt hàng đồng thời không vượt tồn kho
 *   (d) khuyến mãi và điểm thưởng
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Order } from '../src/orders/order.entity';
import { MockPaymentGateway } from '../src/payments/mock-payment.gateway';
import { Payment } from '../src/payments/payment.entity';
import { Product } from '../src/products/product.entity';
import { Promotion } from '../src/promotions/promotion.entity';
import { User } from '../src/users/user.entity';

type Http = ReturnType<INestApplication['getHttpServer']>;

interface OrderBody {
  id: number;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  pointsEarned: number;
}

let app: INestApplication;
let http: Http;
let ds: DataSource;
let gateway: MockPaymentGateway;
let customerToken: string;
let staffToken: string;
let seq = 0;

const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

async function login(email: string, password: string): Promise<string> {
  const res = await request(http).post('/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

async function registerCustomer(): Promise<{ token: string; userId: string }> {
  const res = await request(http)
    .post('/auth/register')
    .send({ email: `${uniq('kh')}@test.vn`, password: 'matkhau123', fullName: 'Khách test' })
    .expect(201);
  return { token: res.body.accessToken, userId: res.body.user.id };
}

async function createProduct(stock: number, price = 30000): Promise<Product> {
  const repo = ds.getRepository(Product);
  return repo.save(repo.create({ name: uniq('Ly test'), price, stock, category: 'Test' }));
}

async function stockOf(productId: number): Promise<number> {
  return (await ds.getRepository(Product).findOneByOrFail({ id: productId })).stock;
}

function postOrder(token: string, items: object[], opts: { key?: string; promoCode?: string } = {}) {
  const req = request(http).post('/orders').set('Authorization', `Bearer ${token}`);
  if (opts.key) req.set('Idempotency-Key', opts.key);
  return req.send({ items, ...(opts.promoCode ? { promoCode: opts.promoCode } : {}) });
}

async function placeOrder(token: string, productId: number, qty = 1, promoCode?: string): Promise<OrderBody> {
  const res = await postOrder(token, [{ productId, size: 'S', qty }], { promoCode }).expect(201);
  return res.body;
}

function pay(token: string, orderId: number, key: string, simulateFailure = false) {
  return request(http)
    .post('/payments')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', key)
    .send({ orderId, method: 'WALLET', simulateFailure });
}

function setStatus(orderId: number, status: string) {
  return request(http)
    .patch(`/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  http = app.getHttpServer();
  ds = app.get(DataSource);
  gateway = app.get(MockPaymentGateway);

  customerToken = await login('demo@brewlite.vn', 'demo1234');
  staffToken = await login('barista@brewlite.vn', 'barista123');
});

afterAll(async () => {
  await app?.close();
});

// ---------------------------------------------------------------------------
describe('(a) Order State Machine – chặn chuyển trạng thái sai', () => {
  it('đơn mới ở PENDING; không thể chuyển thẳng sang PREPARING khi chưa thanh toán', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id);
    expect(order.status).toBe('PENDING');

    const res = await setStatus(order.id, 'PREPARING').expect(409);
    expect(res.body.message).toContain('PENDING');
  });

  it('đi đúng luồng PAID → PREPARING → READY → COMPLETED; nhảy cóc bị chặn', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id);

    const paid = await pay(customerToken, order.id, uniq('pay')).expect(200);
    expect(paid.body.order.status).toBe('PAID');

    await setStatus(order.id, 'READY').expect(409); // bỏ qua PREPARING
    await setStatus(order.id, 'COMPLETED').expect(409);
    await setStatus(order.id, 'PREPARING').expect(200);
    await setStatus(order.id, 'PAID').expect(409); // không quay ngược
    await setStatus(order.id, 'READY').expect(200);
    const done = await setStatus(order.id, 'COMPLETED').expect(200);
    expect(done.body.status).toBe('COMPLETED');

    // COMPLETED là trạng thái kết thúc
    await setStatus(order.id, 'CANCELLED').expect(409);
    await setStatus(order.id, 'PREPARING').expect(409);
  });

  it('thanh toán lỗi → PAYMENT_FAILED; thử lại thành công → PAID', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id);

    const failed = await pay(customerToken, order.id, uniq('pay'), true).expect(200);
    expect(failed.body.payment.status).toBe('FAILED');
    expect(failed.body.order.status).toBe('PAYMENT_FAILED');

    const ok = await pay(customerToken, order.id, uniq('pay')).expect(200);
    expect(ok.body.payment.status).toBe('SUCCESS');
    expect(ok.body.order.status).toBe('PAID');
  });

  it('không thể thanh toán đơn đã PAID bằng một khóa khác (không trừ tiền lần 2)', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id);
    await pay(customerToken, order.id, uniq('pay')).expect(200);

    const chargesBefore = gateway.successfulCharges;
    await pay(customerToken, order.id, uniq('pay')).expect(409);
    expect(gateway.successfulCharges).toBe(chargesBefore);
    expect(await ds.getRepository(Payment).countBy({ orderId: order.id })).toBe(1);
  });

  it('khách chỉ hủy được đơn chưa thanh toán; hủy thì hoàn lại tồn kho', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id, 3);
    expect(await stockOf(product.id)).toBe(7);

    const cancelled = await request(http)
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(await stockOf(product.id)).toBe(10);

    // CANCELLED là trạng thái kết thúc: không thể thanh toán
    await pay(customerToken, order.id, uniq('pay')).expect(409);
  });

  it('khách không tự chuyển trạng thái pha chế được (403)', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id);
    await request(http)
      .patch(`/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'PREPARING' })
      .expect(403);
  });
});

// ---------------------------------------------------------------------------
describe('(b) Thanh toán idempotent – cùng Idempotency-Key chỉ xử lý 1 lần', () => {
  it('gửi 2 lần cùng khóa: 1 giao dịch, trừ tiền 1 lần, cộng điểm 1 lần', async () => {
    const { token, userId } = await registerCustomer();
    const product = await createProduct(10, 45000);
    const order = await placeOrder(token, product.id, 2); // 90.000đ -> 9 điểm
    const key = uniq('pay');
    const chargesBefore = gateway.successfulCharges;

    const first = await pay(token, order.id, key).expect(200);
    const second = await pay(token, order.id, key).expect(200);

    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.payment.id).toBe(first.body.payment.id);
    expect(second.body.order.status).toBe('PAID');
    expect(gateway.successfulCharges - chargesBefore).toBe(1);
    expect(await ds.getRepository(Payment).countBy({ idempotencyKey: key })).toBe(1);

    const user = await ds.getRepository(User).findOneByOrFail({ id: userId });
    expect(user.loyaltyPoints).toBe(9);
  });

  it('5 request đồng thời cùng khóa: chỉ 1 giao dịch', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct(10);
    const order = await placeOrder(token, product.id);
    const key = uniq('pay');
    const chargesBefore = gateway.successfulCharges;

    const results = await Promise.all(Array.from({ length: 5 }, () => pay(token, order.id, key)));

    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(new Set(results.map((r) => r.body.payment.id)).size).toBe(1);
    expect(gateway.successfulCharges - chargesBefore).toBe(1);
    expect(await ds.getRepository(Payment).countBy({ orderId: order.id })).toBe(1);
  });

  it('POST /orders 2 lần cùng khóa: chỉ 1 đơn và chỉ trừ kho 1 lần', async () => {
    const { token, userId } = await registerCustomer();
    const product = await createProduct(10);
    const key = uniq('order');
    const items = [{ productId: product.id, size: 'M', qty: 2 }];

    const first = await postOrder(token, items, { key }).expect(201);
    const second = await postOrder(token, items, { key }).expect(200);

    expect(second.body.id).toBe(first.body.id);
    expect(await ds.getRepository(Order).countBy({ userId })).toBe(1);
    expect(await stockOf(product.id)).toBe(8);
  });

  it('POST /orders đồng thời cùng khóa: chỉ 1 đơn', async () => {
    const { token, userId } = await registerCustomer();
    const product = await createProduct(20);
    const key = uniq('order');
    const items = [{ productId: product.id, size: 'S', qty: 1 }];

    const results = await Promise.all(Array.from({ length: 5 }, () => postOrder(token, items, { key })));

    expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect(await ds.getRepository(Order).countBy({ userId })).toBe(1);
    expect(await stockOf(product.id)).toBe(19);
  });

  it('thiếu Idempotency-Key khi thanh toán → 400', async () => {
    const product = await createProduct(10);
    const order = await placeOrder(customerToken, product.id);
    await request(http)
      .post('/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: order.id, method: 'CARD' })
      .expect(400);
  });

  it('dùng lại khóa cho một đơn khác → 422', async () => {
    const product = await createProduct(10);
    const orderA = await placeOrder(customerToken, product.id);
    const orderB = await placeOrder(customerToken, product.id);
    const key = uniq('pay');

    await pay(customerToken, orderA.id, key).expect(200);
    await pay(customerToken, orderB.id, key).expect(422);
  });
});

// ---------------------------------------------------------------------------
describe('(c) Kiểm soát tồn kho khi đặt đồng thời', () => {
  it('10 khách cùng đặt 1 ly khi kho còn 5: đúng 5 đơn thành công, kho về 0', async () => {
    const product = await createProduct(5);
    const customers = await Promise.all(Array.from({ length: 10 }, () => registerCustomer()));

    const results = await Promise.all(
      customers.map((c) => postOrder(c.token, [{ productId: product.id, size: 'S', qty: 1 }])),
    );

    const ok = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);
    expect(ok).toHaveLength(5);
    expect(rejected).toHaveLength(5);
    expect(await stockOf(product.id)).toBe(0);
    expect(await ds.getRepository(Order).countBy({ items: { productId: product.id } })).toBe(5);
  });

  it('đặt nhiều ly / nhiều sản phẩm đồng thời: không bao giờ âm kho, không deadlock', async () => {
    const a = await createProduct(7);
    const b = await createProduct(7);
    const { token } = await registerCustomer();

    // Một nửa đặt (A, B), một nửa đặt (B, A) để thử thứ tự khóa ngược nhau
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        postOrder(
          token,
          i % 2 === 0
            ? [
                { productId: a.id, size: 'S', qty: 1 },
                { productId: b.id, size: 'L', qty: 1 },
              ]
            : [
                { productId: b.id, size: 'M', qty: 1 },
                { productId: a.id, size: 'S', qty: 1 },
              ],
        ),
      ),
    );

    const ok = results.filter((r) => r.status === 201).length;
    expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    expect(ok).toBe(7);
    expect(await stockOf(a.id)).toBe(0);
    expect(await stockOf(b.id)).toBe(0);
  });

  it('một đơn yêu cầu nhiều hơn số còn lại bị từ chối và không trừ kho', async () => {
    const product = await createProduct(3);
    const res = await postOrder(customerToken, [{ productId: product.id, size: 'S', qty: 4 }]).expect(409);
    expect(res.body.message).toContain('chỉ còn 3');
    expect(await stockOf(product.id)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
describe('(d) Khuyến mãi và điểm thưởng', () => {
  it('áp mã WELCOME10 hợp lệ và cộng điểm sau khi PAID', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct(10, 40000);
    const order = await placeOrder(token, product.id, 3, 'welcome10'); // 120.000đ, giảm 10% = 12.000đ

    expect(order.promoCode).toBe('WELCOME10');
    expect(order.subtotal).toBe(120000);
    expect(order.discount).toBe(12000);
    expect(order.total).toBe(108000);
    expect(order.pointsEarned).toBe(0); // chưa PAID thì chưa cộng điểm

    const paid = await pay(token, order.id, uniq('pay')).expect(200);
    expect(paid.body.order.pointsEarned).toBe(10);

    const me = await request(http).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.loyaltyPoints).toBe(10);
  });

  it('mã hết hạn bị từ chối (422) và không trừ kho', async () => {
    const product = await createProduct(10);
    const res = await postOrder(customerToken, [{ productId: product.id, size: 'S', qty: 2 }], {
      promoCode: 'SUMMER25',
    }).expect(422);
    expect(res.body.message).toContain('hết hạn');
    expect(await stockOf(product.id)).toBe(10);
  });

  it('đơn chưa đạt giá trị tối thiểu bị từ chối mã', async () => {
    const product = await createProduct(10, 30000);
    await postOrder(customerToken, [{ productId: product.id, size: 'S', qty: 1 }], { promoCode: 'WELCOME10' }).expect(
      422,
    );
  });

  it('giới hạn lượt dùng mã được tôn trọng khi đặt đồng thời', async () => {
    const promoRepo = ds.getRepository(Promotion);
    await promoRepo.save(
      promoRepo.create({
        code: 'LIMIT2',
        percentOff: 5,
        maxDiscount: null,
        minOrderTotal: 0,
        startsAt: new Date('2020-01-01'),
        endsAt: new Date('2099-01-01'),
        active: true,
        usageLimit: 2,
        usedCount: 0,
      }),
    );
    const product = await createProduct(50);
    const customers = await Promise.all(Array.from({ length: 5 }, () => registerCustomer()));

    const results = await Promise.all(
      customers.map((c) => postOrder(c.token, [{ productId: product.id, size: 'S', qty: 1 }], { promoCode: 'LIMIT2' })),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect((await promoRepo.findOneByOrFail({ code: 'LIMIT2' })).usedCount).toBe(2);
    expect(await stockOf(product.id)).toBe(48); // đơn bị từ chối không giữ kho
  });

  it('barista hủy đơn đã PAID: hoàn kho, hoàn lượt mã và thu hồi điểm', async () => {
    const { token, userId } = await registerCustomer();
    const product = await createProduct(10, 50000);
    const before = (await ds.getRepository(Promotion).findOneByOrFail({ code: 'WELCOME10' })).usedCount;

    const order = await placeOrder(token, product.id, 2, 'WELCOME10'); // 100.000 - 10.000 = 90.000 -> 9 điểm
    await pay(token, order.id, uniq('pay')).expect(200);
    expect((await ds.getRepository(User).findOneByOrFail({ id: userId })).loyaltyPoints).toBe(9);

    await setStatus(order.id, 'CANCELLED').expect(200);

    expect(await stockOf(product.id)).toBe(10);
    expect((await ds.getRepository(Promotion).findOneByOrFail({ code: 'WELCOME10' })).usedCount).toBe(before);
    expect((await ds.getRepository(User).findOneByOrFail({ id: userId })).loyaltyPoints).toBe(0);
  });
});
