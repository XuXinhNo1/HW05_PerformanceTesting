# Agent Skill: HW05 Performance Testing Guide

Skill dạng **bộ chỉ dẫn thực thi toàn diện** cho AI Agent, đóng gói toàn bộ quy trình, phương pháp luận kỹ thuật và bộ công cụ tự động hóa đã hoàn thiện trong bài tập HW05 để có thể áp dụng cho **bất kỳ luồng nghiệp vụ API nào khác** của hệ thống SUT EShop Backend.

---

## 1. Thông tin Skill & Cách kích hoạt

- **Tên Skill:** `hw5-performance-testing`
- **Tập tin định nghĩa:** [`skills/hw5-performance-testing/SKILL.md`](hw5-performance-testing/SKILL.md)
- **Cách sử dụng:** Người dùng chỉ cần nhập cú pháp:
  ```text
  sử dụng skill để làm luồng <tên_luồng>
  ```
  *Ví dụ:*
  - `sử dụng skill để làm luồng Quản trị viên xử lý đơn hàng (Admin Order Fulfillment)`
  - `sử dụng skill để làm luồng Khách hàng hủy đơn và hoàn tiền`
  - `sử dụng skill để làm luồng Khách hàng thẩm định mã giảm giá (Coupon Validation)`

---

## 2. Các sản phẩm đầu ra do Skill tự động sinh ra (Output Deliverables)

Khi chạy skill cho một luồng nghiệp vụ được chỉ định, Agent sẽ tự động sinh và kiểm tra đầy đủ các thành phần:

1. **Thư mục Báo cáo kết quả (`reports/`)**:
   - `reports/load/`: Chứa file log raw `results.jtl` và thư mục HTML Dashboard tương tác của bài Load Test.
   - `reports/stress/`: Chứa file log raw `results.jtl` và HTML Dashboard của bài Stress Test (kèm bằng chứng lỗi 403 Lockout và 400 State Machine).
   - `reports/spike/`: Chứa file log raw `results.jtl` và HTML Dashboard của bài Spike Test (đo nghẽn băng thông).
   - `reports/soak/`: Chứa file log raw `results.jtl`, thư mục HTML Dashboard, và file log tài nguyên phần cứng thực tế `system_resources.csv` đo định kỳ mỗi 5 giây trong suốt 15 phút.
2. **Bộ kịch bản kiểm thử JMeter (Test Plans)**:
   - `{StudentID}_Load_{YYYYMMDD}.jmx` (20 virtual users, Gaussian Think-time, Listener: Summary Report).
   - `{StudentID}_Stress_{YYYYMMDD}.jmx` (Dual Thread Groups 80 users, Listener: Aggregate Report).
   - `{StudentID}_Spike_{YYYYMMDD}.jmx` (Dual Thread Groups 120 users, Listener: View Results Tree).
   - `{StudentID}_Soak_{YYYYMMDD}.jmx` (15 users bền vững chạy trong 900 giây, Listener: Summary Report).
3. **Bộ dữ liệu tham số hóa CSV (`data/`)**:
   - `admin_credentials.csv` (Đa tài khoản admin hợp lệ).
   - `attacker_credentials.csv` (Mật khẩu sai để kích hoạt lockout).
   - `orders_dataset.csv` (10.000 bản ghi dữ liệu mẫu).
4. **Bộ script bổ trợ kỹ thuật (`scripts/`)**:
   - `seed_orders.js` & `seed_fast.py`: Tự động nạp 10.000 đơn hàng pending và 6 tài khoản admin vào SQLite.
   - `reset_lockout.js`: Tự động phục hồi và mở khóa CSDL.
   - `monitor_resources.py`: Tự động bắt PID Backend `node.exe` và đo CPU %, RAM MB theo thời gian thực.
   - `run_soak_test.py`: Điều phối tự động chạy song song JMeter CLI và script đo tài nguyên trong 15 phút.
5. **Bộ tài liệu báo cáo học thuật**:
   - `Main_Report.md`: Báo cáo chính bao gồm Task 1 (số liệu thực tế), Task 2 (Săn lỗi diễn giải sai của AI & thẩm định tối ưu), Task 3 (Continuous Performance Testing đề xuất cho CI/CD kèm sơ đồ Mermaid).
   - `README.md`: Bảng tự đánh giá 100/100 chuẩn Mục 15 đề bài.
   - `AI_Audit_Report.md`: Báo cáo kiểm toán AI với mô hình Gemini 3.8 Flash High.
   - `AI_Critique.md`: Phê bình AI đạt chuẩn 200–300 từ.

---

## 3. Cấu trúc Thư mục Skill

```text
skills/
├── README.md                                # Tài liệu hướng dẫn tổng quan về Agent Skill
└── hw5-performance-testing/
    ├── SKILL.md                             # Bộ chỉ dẫn lõi cho AI Agent (YAML frontmatter)
    └── references/
        ├── workload-modeling.md             # Kỹ thuật Mô hình hóa Tải kép (Dual Thread Groups)
        ├── monitoring-and-soak.md           # Hướng dẫn chạy Soak Test 15 phút & đo tài nguyên
        └── misinterpretation-hunt.md        # Các bẫy ảo giác AI thường gặp & cách phản biện
```

---

## 4. Bảng đối chiếu các tình huống thực tế đã được đóng gói vào Skill

| Tình huống thực tế gặp phải | Giải pháp kỹ thuật đã tích hợp vào Skill |
|---|---|
| Dùng 1 tài khoản bị khóa gây sập dây chuyền toàn bài test | Bắt buộc kiến trúc **Dual Thread Group**: TG01 xoay vòng đa tài khoản, TG02 gửi pass sai vào tài khoản nạn nhân riêng. |
| Chạy Soak test 15 phút bị cạn kiệt đơn hàng gây lỗi HTTP 400 | Nạp sẵn **10.000 đơn hàng pending** vào CSDL trước khi chạy test. |
| AI ảo giác quy chụp lỗi HTTP 400 thành lỗi 500 SQLite Lock | Bắt buộc đọc trực tiếp cột `responseCode` trong file raw `.jtl` để đối chiếu và phản biện. |
| CSDL bị reset về mặc định chỉ còn 2 tài khoản | Script `reset_lockout.js` được trang bị cơ chế tự phục hồi (Self-Healing) tự bù đắp tài khoản thiếu. |
| Cần số liệu RAM/CPU thực tế cho bài Soak test | Script `monitor_resources.py` chạy song song bắt PID tiến trình `node.exe` ghi log thực tế mỗi 5s. |
