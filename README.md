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
│   │   ├── domain/     quy tắc nghiệp vụ thuần (giá, trạng thái đơn…)
│   │   └── database/   cấu hình TypeORM, dữ liệu mẫu
│   └── test/           test tích hợp (cần PostgreSQL)
├── frontend/           Next.js        (http://localhost:3000)
│   └── src/app/        /, /products/[id], /cart, /checkout, /orders, /orders/[id], /login, /register
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

| Tài khoản demo | Mật khẩu | Vai trò |
| --- | --- | --- |
| `demo@brewlite.vn` | `demo1234` | Khách hàng |
| `barista@brewlite.vn` | `barista123` | Nhân viên quầy (STAFF) |

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
| `POST /orders` | Tạo đơn (PENDING) | JWT |
| `GET /orders/me` | Lịch sử đơn của user | JWT |
| `GET /orders/:id` | Chi tiết/xác nhận đơn | JWT |
| `POST /payments` | Thanh toán đơn (Ví/Thẻ) | JWT |

Gửi JWT qua header `Authorization: Bearer <accessToken>`.

Ví dụ:

```bash
TOKEN=$(curl -s localhost:4000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@brewlite.vn","password":"demo1234"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

curl -s localhost:4000/orders -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":4,"size":"M","toppingIds":[1],"qty":1}]}'

curl -s localhost:4000/payments -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"orderId":1,"method":"WALLET"}'
```

## 🧭 Luồng demo end-to-end

1. Mở menu → chọn **Cappuccino** → chọn size **M**, topping → **Thêm vào giỏ**.
2. Vào **Giỏ hàng** → đổi số lượng → **Thanh toán** (chưa đăng nhập thì sang trang đăng nhập rồi quay lại).
3. Chọn **Ví điện tử** hoặc **Thẻ ngân hàng** → **Xác nhận trả**.
4. Màn hình **Đặt hàng thành công** hiển thị mã đơn và trạng thái `PAID`.
5. Thử lỗi: tick **“Mô phỏng thanh toán lỗi”** → đơn chuyển `PAYMENT_FAILED`, giỏ hàng giữ nguyên, bỏ tick và bấm lại để thanh toán thành công.
6. **Đơn của tôi** để xem lịch sử.

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
