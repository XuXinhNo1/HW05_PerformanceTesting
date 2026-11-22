# Hướng dẫn Kỹ thuật: Mô hình hóa Tải kép (Dual Workload Modeling)

## 1. Vấn đề Sập dây chuyền (Cascading Failure) khi Lockout

Trong kiểm thử hiệu năng có yêu cầu kích hoạt cơ chế khóa tài khoản:
- Hệ thống backend EShop cài đặt quy tắc: Khi người dùng đăng nhập sai mật khẩu $\ge 3$ lần, tài khoản bị gán `locked_until = now + 3 phút` và mọi yêu cầu sau bị trả về `HTTP 403 Forbidden`.
- **Nếu kịch bản chỉ sử dụng 1 tài khoản duy nhất:** Sau khi tài khoản bị khóa, sampler `POST /api/login` thất bại và không trích xuất được `ADMIN_TOKEN`. Toàn bộ các sampler tiếp theo trong luồng (`GET /api/admin/orders` và `PUT /api/admin/orders/:id/status`) sẽ lập tức bị lỗi `401 Unauthorized`.
- Hậu quả: Toàn bộ bài test bị biến dạng, không thể đo được tải của thao tác đọc (Read-heavy) và ghi (Transactional).

---

## 2. Kiến trúc Giải pháp: Workload Kép (Dual Thread Groups)

Để vừa thỏa mãn yêu cầu đề bài (kích hoạt lỗi lockout), vừa đo tải chính xác, test plan JMeter phải được tách thành **2 Thread Group chạy song song**:

```text
Test Plan
├── HTTP Request Defaults (localhost:3000)
├── HTTP Header Manager (Content-Type: application/json)
│
├── TG01: Legitimate Admin Workload (Đo tải chính — 75/115 threads)
│   ├── CSV Data Set Config (data/admin_credentials.csv, recycle=true)
│   ├── CSV Data Set Config (data/orders_dataset.csv, recycle=false)
│   ├── Gaussian Random Timer (1200ms ± 500ms)
│   ├── T01_Admin_Login (POST /api/login) -> Trích xuất ADMIN_TOKEN
│   ├── T02_Get_Admin_Orders (GET /api/admin/orders, Bearer Token)
│   └── T03_Update_Order_Status (PUT /api/admin/orders/${order_id}/status)
│
└── TG02: Brute-Force Attacker (Giả lập tấn công — 5 threads)
    ├── CSV Data Set Config (data/attacker_credentials.csv)
    └── T00_BruteForce_Login_Lockout (POST /api/login với pass sai liên tục)
        └── Response Assertion (Kiểm tra mã 401 hoặc 403 Forbidden)
```

---

## 3. Cấu hình CSV Data Set Config chuẩn

| Thuộc tính | `admin_credentials.csv` | `attacker_credentials.csv` | `orders_dataset.csv` |
|---|---|---|---|
| **Mục đích** | Đa tài khoản hợp lệ | Mật khẩu sai cho victim | ID đơn hàng và trạng thái mới |
| **Recycle on EOF** | `True` (xoay vòng liên tục) | `True` (bắn sai liên tục) | `False` (mỗi ID chỉ dùng 1 lần) |
| **Stop thread on EOF** | `False` | `False` | `False` |
| **Sharing mode** | `All threads` | `All threads` | `All threads` |
