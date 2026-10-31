/**
 * Test tích hợp phân quyền 3 vai trò (Khách / Nhân viên quầy / Quản lý) và API quản lý.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Product } from '../src/products/product.entity';

type Http = ReturnType<INestApplication['getHttpServer']>;

let app: INestApplication;
let http: Http;
let ds: DataSource;
let customerToken: string;
let staffToken: string;
let managerToken: string;
let managerId: string;
let seq = 0;

const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function login(email: string, password: string) {
  const res = await request(http).post('/auth/login').send({ email, password }).expect(200);
  return res.body as { accessToken: string; user: { id: string; role: string } };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  http = app.getHttpServer();
  ds = app.get(DataSource);

  customerToken = (await login('demo@brewlite.vn', 'demo1234')).accessToken;
  staffToken = (await login('barista@brewlite.vn', 'barista123')).accessToken;
  const manager = await login('manager@brewlite.vn', 'manager123');
  managerToken = manager.accessToken;
  managerId = manager.user.id;
  expect(manager.user.role).toBe('MANAGER');
});

afterAll(async () => {
  await app?.close();
});

describe('Phân quyền theo vai trò', () => {
  it('đăng ký công khai luôn tạo tài khoản khách hàng, không tự chọn vai trò được', async () => {
    const ok = await request(http)
      .post('/auth/register')
      .send({ email: `${uniq('kh')}@test.vn`, password: 'matkhau123', fullName: 'Khách' })
      .expect(201);
    expect(ok.body.user.role).toBe('CUSTOMER');

    await request(http)
      .post('/auth/register')
      .send({ email: `${uniq('hack')}@test.vn`, password: 'matkhau123', fullName: 'X', role: 'MANAGER' })
      .expect(400);
  });

  it.each([
    ['khách hàng', () => customerToken],
    ['nhân viên quầy', () => staffToken],
  ])('%s không vào được API quản lý (403)', async (_label, token) => {
    for (const path of ['/admin/stats', '/admin/orders', '/admin/products', '/admin/promotions', '/admin/users']) {
      await request(http).get(path).set(auth(token())).expect(403);
    }
  });

  it('chưa đăng nhập thì 401', async () => {
    await request(http).get('/admin/stats').expect(401);
  });

  it('khách không xem được màn hình quầy; nhân viên và quản lý thì được', async () => {
    await request(http).get('/orders/active').set(auth(customerToken)).expect(403);
    await request(http).get('/orders/active').set(auth(staffToken)).expect(200);
    await request(http).get('/orders/active').set(auth(managerToken)).expect(200);
  });
});

describe('Quản lý tài khoản', () => {
  it('quản lý tạo tài khoản nhân viên; nhân viên đăng nhập và xử lý đơn được', async () => {
    const email = `${uniq('nv')}@brewlite.vn`;
    const created = await request(http)
      .post('/admin/users')
      .set(auth(managerToken))
      .send({ email, fullName: 'Nhân viên mới', password: 'nhanvien1', role: 'STAFF' })
      .expect(201);
    expect(created.body.role).toBe('STAFF');
    expect(created.body).not.toHaveProperty('passwordHash');

    const staff = await login(email, 'nhanvien1');
    await request(http).get('/orders/active').set(auth(staff.accessToken)).expect(200);
    await request(http).get('/admin/stats').set(auth(staff.accessToken)).expect(403);
  });

  it('khóa tài khoản: không đăng nhập được và token đang dùng bị từ chối ngay', async () => {
    const email = `${uniq('kh')}@test.vn`;
    const reg = await request(http)
      .post('/auth/register')
      .send({ email, password: 'matkhau123', fullName: 'Sẽ bị khóa' })
      .expect(201);
    const token = reg.body.accessToken;

    await request(http)
      .patch(`/admin/users/${reg.body.user.id}`)
      .set(auth(managerToken))
      .send({ isActive: false })
      .expect(200);

    await request(http).get('/auth/me').set(auth(token)).expect(401);
    const res = await request(http).post('/auth/login').send({ email, password: 'matkhau123' }).expect(401);
    expect(res.body.message).toContain('khóa');

    await request(http).patch(`/admin/users/${reg.body.user.id}`).set(auth(managerToken)).send({ isActive: true }).expect(200);
    await request(http).post('/auth/login').send({ email, password: 'matkhau123' }).expect(200);
  });

  it('đổi vai trò có hiệu lực ngay với token cũ', async () => {
    const email = `${uniq('kh')}@test.vn`;
    const reg = await request(http).post('/auth/register').send({ email, password: 'matkhau123', fullName: 'Lên nhân viên' });
    await request(http).get('/orders/active').set(auth(reg.body.accessToken)).expect(403);

    await request(http).patch(`/admin/users/${reg.body.user.id}`).set(auth(managerToken)).send({ role: 'STAFF' }).expect(200);
    await request(http).get('/orders/active').set(auth(reg.body.accessToken)).expect(200);
  });

  it('quản lý không thể tự khóa hoặc tự hạ quyền mình', async () => {
    await request(http).patch(`/admin/users/${managerId}`).set(auth(managerToken)).send({ isActive: false }).expect(400);
    await request(http).patch(`/admin/users/${managerId}`).set(auth(managerToken)).send({ role: 'STAFF' }).expect(400);
  });

  it('lọc danh sách theo vai trò', async () => {
    const res = await request(http).get('/admin/users?role=STAFF').set(auth(managerToken)).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((u: { role: string }) => u.role === 'STAFF')).toBe(true);
  });

  it('khách đổi tên và mật khẩu của mình', async () => {
    const email = `${uniq('kh')}@test.vn`;
    const reg = await request(http).post('/auth/register').send({ email, password: 'matkhau123', fullName: 'Tên cũ' });
    const token = reg.body.accessToken;

    const me = await request(http).patch('/auth/me').set(auth(token)).send({ fullName: 'Tên mới' }).expect(200);
    expect(me.body.fullName).toBe('Tên mới');

    await request(http)
      .post('/auth/change-password')
      .set(auth(token))
      .send({ currentPassword: 'sai-mat-khau', newPassword: 'moi123456' })
      .expect(400);
    await request(http)
      .post('/auth/change-password')
      .set(auth(token))
      .send({ currentPassword: 'matkhau123', newPassword: 'moi123456' })
      .expect(200);
    await request(http).post('/auth/login').send({ email, password: 'moi123456' }).expect(200);
  });
});

describe('Quản lý menu & tồn kho', () => {
  it('thêm món, ẩn món thì khách không thấy trên menu', async () => {
    const created = await request(http)
      .post('/admin/products')
      .set(auth(managerToken))
      .send({ name: uniq('Cold brew'), category: 'Cà phê', price: 48000, stock: 20 })
      .expect(201);
    const id = created.body.id;

    let menu = await request(http).get('/products').expect(200);
    expect(menu.body.some((p: { id: number }) => p.id === id)).toBe(true);

    await request(http).patch(`/admin/products/${id}`).set(auth(managerToken)).send({ isActive: false }).expect(200);
    menu = await request(http).get('/products').expect(200);
    expect(menu.body.some((p: { id: number }) => p.id === id)).toBe(false);
    await request(http).get(`/products/${id}`).expect(404);
  });

  it('nhập thêm và trừ tồn kho; không cho kho âm', async () => {
    const repo = ds.getRepository(Product);
    const product = await repo.save(repo.create({ name: uniq('Ly test'), price: 30000, stock: 5, category: 'Test' }));

    const up = await request(http)
      .post(`/admin/products/${product.id}/stock`)
      .set(auth(managerToken))
      .send({ delta: 15 })
      .expect(201);
    expect(up.body.stock).toBe(20);

    await request(http).post(`/admin/products/${product.id}/stock`).set(auth(managerToken)).send({ delta: -21 }).expect(409);
    const down = await request(http)
      .post(`/admin/products/${product.id}/stock`)
      .set(auth(managerToken))
      .send({ delta: -20 })
      .expect(201);
    expect(down.body.stock).toBe(0);
  });

  it('validate dữ liệu món', async () => {
    await request(http)
      .post('/admin/products')
      .set(auth(managerToken))
      .send({ name: '', category: 'Cà phê', price: -1 })
      .expect(400);
  });
});

describe('Quản lý khuyến mãi', () => {
  it('tạo mã, khách dùng được; tắt mã thì bị từ chối', async () => {
    const code = `T${Date.now().toString(36).toUpperCase()}`.slice(0, 12);
    await request(http)
      .post('/admin/promotions')
      .set(auth(managerToken))
      .send({ code, percentOff: 15, startsAt: '2020-01-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z' })
      .expect(201);

    const repo = ds.getRepository(Product);
    const product = await repo.save(repo.create({ name: uniq('Ly test'), price: 40000, stock: 10, category: 'Test' }));
    const items = [{ productId: product.id, size: 'S', qty: 1 }];

    const quote = await request(http).post('/orders/quote').set(auth(customerToken)).send({ items, promoCode: code }).expect(200);
    expect(quote.body.discount).toBe(6000);

    await request(http).patch(`/admin/promotions/${code}`).set(auth(managerToken)).send({ active: false }).expect(200);
    await request(http).post('/orders').set(auth(customerToken)).send({ items, promoCode: code }).expect(422);
  });

  it('ngày kết thúc phải sau ngày bắt đầu; mã trùng bị từ chối', async () => {
    await request(http)
      .post('/admin/promotions')
      .set(auth(managerToken))
      .send({ code: 'NGUOCNGAY', percentOff: 10, startsAt: '2027-01-02T00:00:00Z', endsAt: '2027-01-01T00:00:00Z' })
      .expect(400);
    await request(http)
      .post('/admin/promotions')
      .set(auth(managerToken))
      .send({ code: 'WELCOME10', percentOff: 10, startsAt: '2027-01-01T00:00:00Z', endsAt: '2027-02-01T00:00:00Z' })
      .expect(409);
  });
});

describe('Tổng quan & đơn hàng', () => {
  it('doanh thu hôm nay tính đơn đã thanh toán; danh sách đơn lọc được theo trạng thái', async () => {
    const repo = ds.getRepository(Product);
    const product = await repo.save(repo.create({ name: uniq('Ly doanh thu'), price: 50000, stock: 10, category: 'Test' }));

    const before = (await request(http).get('/admin/stats?days=7').set(auth(managerToken)).expect(200)).body;

    const order = await request(http)
      .post('/orders')
      .set(auth(customerToken))
      .send({ items: [{ productId: product.id, size: 'S', qty: 2 }] })
      .expect(201);
    await request(http)
      .post('/payments')
      .set(auth(customerToken))
      .set('Idempotency-Key', uniq('pay'))
      .send({ orderId: order.body.id, method: 'CARD' })
      .expect(200);

    const after = (await request(http).get('/admin/stats?days=7').set(auth(managerToken)).expect(200)).body;
    expect(after.today.revenue - before.today.revenue).toBe(100000);
    expect(after.today.paidOrders - before.today.paidOrders).toBe(1);
    expect(after.series).toHaveLength(7);
    expect(after.queue.PAID).toBeGreaterThanOrEqual(1);

    const list = await request(http).get(`/admin/orders?status=PAID&q=%23${order.body.id}`).set(auth(managerToken)).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].customer.email).toBe('demo@brewlite.vn');

    await request(http).get('/admin/stats?days=5').set(auth(managerToken)).expect(400);
  });

  it('quản lý chuyển trạng thái đơn như nhân viên quầy', async () => {
    const repo = ds.getRepository(Product);
    const product = await repo.save(repo.create({ name: uniq('Ly'), price: 30000, stock: 10, category: 'Test' }));
    const order = await request(http)
      .post('/orders')
      .set(auth(customerToken))
      .send({ items: [{ productId: product.id, size: 'S', qty: 1 }] })
      .expect(201);
    await request(http)
      .post('/payments')
      .set(auth(customerToken))
      .set('Idempotency-Key', uniq('pay'))
      .send({ orderId: order.body.id, method: 'WALLET' })
      .expect(200);

    await request(http).patch(`/orders/${order.body.id}/status`).set(auth(managerToken)).send({ status: 'PREPARING' }).expect(200);
    await request(http).patch(`/orders/${order.body.id}/status`).set(auth(managerToken)).send({ status: 'COMPLETED' }).expect(409);
  });
});
