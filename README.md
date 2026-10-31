# ☕ BrewLite

Ứng dụng **đặt cà phê không dùng tiền mặt** – bài tập lớn môn Công nghệ Phần mềm (Trường ĐH Sài Gòn, HK I 2026–2027).

> “BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.”

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js 15 (React, TypeScript), TailwindCSS, React Query, Zustand (giỏ hàng) |
| Backend | NestJS 11 (TypeScript), REST, class-validator, JWT (Passport), bcrypt |
| CSDL | PostgreSQL 16 + TypeORM |
| Thanh toán | Mock Payment Gateway (mô phỏng Ví điện tử / Thẻ) |
| DevOps | Docker Compose, Git |

```
brewlite/
├── backend/            NestJS REST API  (http://localhost:4000)
│   ├── src/
│   │   ├── auth/       đăng ký, đăng nhập, JWT, guard
│   │   ├── products/   menu, topping
│   │   ├── orders/     tạo đơn, lịch sử đơn
│   │   ├── payments/   thanh toán + cổng giả lập
│   │   ├── admin/      API quản lý (doanh thu, menu, khuyến mãi, tài khoản)
│   │   ├── domain/     quy tắc nghiệp vụ thuần (giá, trạng thái đơn…)
│   │   └── database/   cấu hình TypeORM, dữ liệu mẫu
│   └── test/           test tích hợp (cần PostgreSQL)
├── frontend/           Next.js        (http://localhost:3000)
│   └── src/app/
│       ├── (shop)/     khách: /, /products/[id], /cart, /checkout, /orders, /orders/[id], /account, /login, /register
│       ├── staff/      nhân viên quầy: /staff
│       └── admin/      quản lý: /admin, /admin/orders, /admin/menu, /admin/promotions, /admin/accounts
└── docker-compose.yml  db + backend + frontend
```

## 🚀 Chạy bằng Docker (khuyến nghị)

Yêu cầu: Docker Desktop.

```bash
cp .env.example .env          # có thể giữ nguyên giá trị mặc định
docker compose up --build
```

- Mở **http://localhost:3000** để dùng ứng dụng.
- API: **http://localhost:4000** (GET `/` trả “Hello BrewLite”).
- Lần đầu chạy, backend tự tạo bảng và nạp dữ liệu mẫu (8 đồ uống, 4 topping, 2 tài khoản).

| Tài khoản demo | Mật khẩu | Vai trò | Vào được |
| --- | --- | --- | --- |
| `demo@brewlite.vn` | `demo1234` | Khách hàng (CUSTOMER) | đặt món, thanh toán, vé lấy nước, tài khoản |
| `barista@brewlite.vn` | `barista123` | Nhân viên quầy (STAFF) | `/staff` – màn hình quầy pha chế |
| `manager@brewlite.vn` | `manager123` | Quản lý (MANAGER) | `/admin` – tổng quan, đơn hàng, menu, khuyến mãi, tài khoản (và `/staff`) |

Trang đăng nhập có sẵn 3 nút đăng nhập nhanh bằng tài khoản demo.

## 👥 Phân quyền

| | Khách hàng | Nhân viên quầy | Quản lý |
| --- | :-: | :-: | :-: |
| Tự đăng ký | ✓ | – (quản lý tạo) | – (quản lý tạo) |
| Đặt món, thanh toán, xem đơn của mình | ✓ | ✓ | ✓ |
| Màn hình quầy: chuyển trạng thái pha chế, hủy đơn đã trả | – | ✓ | ✓ |
| Doanh thu, danh sách mọi đơn | – | – | ✓ |
| Thêm/sửa/ẩn món, topping, nhập kho | – | – | ✓ |
| Tạo/tắt mã khuyến mãi | – | – | ✓ |
| Tạo tài khoản nhân viên, đổi vai trò, khóa tài khoản, đặt lại mật khẩu | – | – | ✓ |

- Quyền được kiểm tra ở **backend** (`RolesGuard`); frontend chỉ điều hướng.
- JWT đọc lại tài khoản từ CSDL ở mỗi request nên **khóa tài khoản hoặc đổi vai trò có hiệu lực ngay**, token cũ bị từ chối.
- Quản lý không thể tự khóa hay tự hạ quyền mình (tránh cửa hàng mất tài khoản quản lý).

Xóa sạch dữ liệu để chạy lại từ đầu: `docker compose down -v`.

## 🛠️ Chạy từng phần (khi phát triển)

Yêu cầu: Node.js 20+ (khuyến nghị 22), PostgreSQL 16 (hoặc chỉ chạy DB bằng `docker compose up db`).

```bash
# 1) CSDL
docker compose up -d db

# 2) Backend
cd backend
cp .env.example .env
npm install
npm run start:dev             # http://localhost:4000

# 3) Frontend (terminal khác)
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

## 🔌 API chính

| Endpoint | Chức năng | Xác thực |
| --- | --- | --- |
| `GET /products` | Danh sách sản phẩm (menu) | – |
| `GET /products/:id` | Chi tiết + tùy chọn size, topping | – |
| `POST /auth/register` | Đăng ký, trả JWT | – |
| `POST /auth/login` | Đăng nhập, trả JWT | – |
| `GET /auth/me` | Thông tin tài khoản, điểm tích lũy | JWT |
| `PATCH /auth/me` | Đổi họ tên | JWT |
| `POST /auth/change-password` | Đổi mật khẩu | JWT |
| `POST /orders` | Tạo đơn (PENDING), giữ tồn kho; header `Idempotency-Key` tùy chọn | JWT |
| `POST /orders/quote` | Xem trước tổng tiền + mã giảm giá | JWT |
| `GET /orders/me` | Lịch sử đơn của user | JWT |
| `GET /orders/:id` | Chi tiết/xác nhận đơn | JWT |
| `POST /orders/:id/cancel` | Khách hủy đơn chưa thanh toán | JWT |
| `POST /payments` | Thanh toán (idempotent, **bắt buộc** header `Idempotency-Key`) | JWT |
| `GET /orders/active` | Đơn cần pha chế | JWT (STAFF, MANAGER) |
| `PATCH /orders/:id/status` | Chuyển trạng thái theo máy trạng thái | JWT (STAFF, MANAGER) |
| `GET /admin/stats?days=7\|14\|30` | Doanh thu hôm nay, theo ngày, món bán chạy, sắp hết hàng | JWT (MANAGER) |
| `GET /admin/orders?status=&q=&page=` | Mọi đơn, lọc theo trạng thái / mã đơn / email | JWT (MANAGER) |
| `GET/POST /admin/products`, `PATCH /admin/products/:id` | Quản lý đồ uống (ẩn/hiện) | JWT (MANAGER) |
| `POST /admin/products/:id/stock` | Nhập thêm / trừ tồn kho (`{ "delta": 20 }`) | JWT (MANAGER) |
| `GET/POST /admin/toppings`, `PATCH /admin/toppings/:id` | Quản lý topping | JWT (MANAGER) |
| `GET/POST /admin/promotions`, `PATCH /admin/promotions/:code` | Quản lý mã giảm giá | JWT (MANAGER) |
| `GET/POST /admin/users`, `PATCH /admin/users/:id` | Tạo nhân viên, đổi vai trò, khóa, đặt lại mật khẩu | JWT (MANAGER) |

Gửi JWT qua header `Authorization: Bearer <accessToken>`.

Ví dụ:

```bash
TOKEN=$(curl -s localhost:4000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@brewlite.vn","password":"demo1234"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

curl -s localhost:4000/orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":4,"size":"M","toppingIds":[1],"qty":1}]}'

curl -s localhost:4000/payments -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: thanh-toan-don-1-lan-1' -d '{"orderId":1,"method":"WALLET"}'
```

## 🧭 Luồng demo end-to-end

1. Mở menu → chọn **Cappuccino** → chọn size **M**, topping → **Thêm vào giỏ**.
2. Vào **Giỏ hàng** → đổi số lượng → **Thanh toán** (chưa đăng nhập thì sang trang đăng nhập rồi quay lại).
3. Chọn **Ví điện tử** hoặc **Thẻ ngân hàng** → **Xác nhận trả**.
4. Màn hình **Đặt hàng thành công** hiển thị mã đơn và trạng thái `PAID`.
5. Thử lỗi: tick **“Mô phỏng thanh toán lỗi”** → đơn chuyển `PAYMENT_FAILED`, giỏ hàng giữ nguyên, bỏ tick và bấm lại để thanh toán thành công.
6. Nhập mã **WELCOME10** (giảm 10% cho đơn từ 50.000đ) ở trang thanh toán; thử **SUMMER25** để thấy mã hết hạn bị từ chối.
7. **Đơn của tôi** để xem lịch sử và điểm tích lũy.
8. Đăng nhập **barista@brewlite.vn** → màn hình **Quầy pha chế** để chuyển đơn `PAID → PREPARING → READY → COMPLETED`; vé lấy nước của khách tự cập nhật (chuyển vàng khi sẵn sàng).
9. Đăng nhập **manager@brewlite.vn** → **Tổng quan** xem doanh thu; **Menu & tồn kho** thêm món, nhập kho; **Khuyến mãi** tạo mã; **Tài khoản** tạo nhân viên mới hoặc khóa tài khoản.

## ⚙️ Task 10 – Nghiệp vụ backend

| Yêu cầu | Cách làm | Mã nguồn |
| --- | --- | --- |
| **Order State Machine** | Bảng chuyển tiếp `ORDER_TRANSITIONS` đúng sơ đồ 9.1; mọi thay đổi trạng thái đi qua `assertTransition`, sai luồng → HTTP 409. `COMPLETED`, `CANCELLED` là trạng thái kết thúc. | `backend/src/domain/order-status.ts` |
| **Thanh toán idempotent** | Client gửi `Idempotency-Key`. Cột `payments.idempotencyKey` là UNIQUE và được ghi **trước** khi gọi cổng thanh toán, trong transaction có khóa dòng đơn (`SELECT … FOR UPDATE`). Gửi lại cùng khóa → trả đúng kết quả cũ (header `Idempotent-Replayed: true`), không trừ tiền lần 2. Đơn đã `PAID` thì máy trạng thái chặn mọi lần trả tiền khác. `POST /orders` cũng hỗ trợ `Idempotency-Key` (UNIQUE theo user). | `backend/src/payments/payments.service.ts` |
| **Tồn kho khi đặt đồng thời** | Trong transaction: đọc `version`, rồi `UPDATE products SET stock = stock - n, version = version + 1 WHERE id = ? AND version = ? AND stock >= n`. Không cập nhật được dòng nào → có giao dịch khác vừa sửa → chạy lại (`withRetry`, có jitter). Khóa sản phẩm theo id tăng dần để tránh deadlock. Hủy đơn hoàn lại kho. | `backend/src/orders/orders.service.ts` (`reserveStock`) |
| **Khuyến mãi & điểm thưởng** | Mã giảm giá kiểm tra: còn hiệu lực, đang bật, đạt giá trị tối thiểu, còn lượt (tăng `usedCount` nguyên tử). Khi đơn chuyển `PAID`: cộng 1 điểm / 10.000đ trong cùng transaction thanh toán. Hủy đơn đã PAID thì thu hồi điểm và trả lại lượt mã. | `backend/src/domain/promotion.ts` |

Mã khuyến mãi mẫu: `WELCOME10` (10%, đơn từ 50.000đ, tối đa 20.000đ), `BREW20` (20%, đơn từ 100.000đ, tối đa 30.000đ, 100 lượt), `SUMMER25` (đã hết hạn).

## 🧪 Kiểm thử

**Unit test** (không cần CSDL) – máy trạng thái (đủ 49 cặp trạng thái), khuyến mãi, điểm thưởng, tính giá, cơ chế retry:

```bash
cd backend
npm test
```

**Integration test** (cần PostgreSQL; dùng CSDL riêng `brewlite_test`, bị xóa sạch mỗi lần chạy):

```bash
docker compose up -d db          # volume mới sẽ tự tạo sẵn DB brewlite_test
cd backend
npm run test:e2e
```

> Nếu volume Postgres đã tồn tại từ trước khi có file `backend/test/init-test-db.sql`, tạo DB test thủ công:
> `docker compose exec db createdb -U brewlite brewlite_test`
> Có thể trỏ sang DB khác bằng biến `TEST_DATABASE_URL`.

| Tiêu chí chấm | Test chứng minh (`backend/test/order-flow.e2e-spec.ts`) |
| --- | --- |
| (a) chặn chuyển trạng thái sai | `PENDING → PREPARING`, `PAID → READY`, `COMPLETED → CANCELLED`… đều trả 409; luồng đúng đi tới `COMPLETED` |
| (b) 2 lần cùng Idempotency-Key chỉ tạo 1 đơn | gửi lặp lại tuần tự và **5 request đồng thời** cùng khóa → 1 payment, cổng chỉ trừ tiền 1 lần, điểm cộng 1 lần; `POST /orders` lặp lại → 1 đơn, kho trừ 1 lần |
| (c) đặt đồng thời không vượt tồn kho | **10 khách** cùng đặt khi kho còn 5 → đúng 5 đơn thành công, kho = 0; 12 đơn nhiều sản phẩm đặt chéo thứ tự → không âm kho, không deadlock |
| Khuyến mãi & điểm | áp mã hợp lệ, từ chối mã hết hạn/chưa đạt mức tối thiểu, giới hạn lượt khi đặt đồng thời, hủy đơn hoàn kho/lượt mã/điểm |

> Nếu trước đó bạn đã chạy bản cũ (trước Task 10), hãy `docker compose down -v` để tạo lại bảng với các cột mới.

## 📋 Product Backlog ↔ commit

| # | Task | Sprint |
| --- | --- | --- |
| 1 | Khởi tạo dự án và cấu trúc | 1 |
| 2 | API danh sách sản phẩm | 1 |
| 3 | Trang Menu | 1 |
| 4 | Chi tiết và tùy chọn sản phẩm | 1 |
| 5 | Giỏ hàng | 2 |
| 6 | API tạo đơn hàng | 2 |
| 7 | Đăng ký / Đăng nhập (JWT) | 2 |
| 8 | Thanh toán không tiền mặt | 3 |
| 9 | Xác nhận, lịch sử đơn & bàn giao | 3 |
| 10 | Nghiệp vụ backend | 3 |

Mỗi task là một commit riêng (`git log --oneline`).
