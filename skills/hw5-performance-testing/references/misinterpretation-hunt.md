# Hướng dẫn Kỹ thuật: Săn lỗi Diễn giải Sai của AI (AI Misinterpretation Hunt)

Hoạt động trọng tâm của Task 2 là sinh viên đóng vai trò phản biện (Critical Reviewer), phát hiện các điểm AI phân tích sai lệch và đối chiếu lại với số liệu từ file raw log `.jtl`.

---

## 1. Bẫy số 1: Ngụy biện số trung bình (The Average Flaw)

- **Nhận định sai lệch của AI:** *"Độ trễ trung bình (Mean Latency) 29.4ms phản ánh hệ thống đáp ứng cực kỳ nhanh và mượt mà dưới tải Stress 80 users."*
- **Sự thật từ file `.jtl`:**
  - $p95$ Latency lên tới **119.0 ms**, $p99$ đạt **240.0 ms**, và Max Latency là **456.0 ms**.
  - Tỷ lệ lỗi toàn hệ thống lên tới **19.11%**.
- **Bản chất sai lệch:** AI chỉ nhìn vào con số trung bình số học bị kéo thấp bởi các request đọc cache nhanh ở giai đoạn đầu, hoàn toàn phớt lờ các phân vị đuôi dài (Tail Latency $p95/p99$) và tỷ lệ lỗi nghiêm trọng.

---

## 2. Bẫy số 2: Ảo giác quy chụp nguyên nhân lỗi (Fault Misattribution)

- **Nhận định sai lệch của AI:** *"856 lỗi ở thao tác PUT status trong bài Stress Test là do quá tải CSDL SQLite bị khóa file (SQLITE_BUSY 500)."*
- **Sự thật từ file `.jtl`:**
  - Cột `responseCode` của 856 lỗi này đều là **HTTP 400 Bad Request**.
  - Cột `responseMessage` ghi rõ: `{"error": "Invalid state transition from confirmed to confirmed"}`.
  - Hoàn toàn **không có mã lỗi 500 hay SQLITE_BUSY** nào xuất hiện trong file `.jtl`.
- **Bản chất sai lệch:** AI máy móc áp dụng lý thuyết sách giáo khoa ("ghi đồng thời vào SQLite sẽ bị SQLite Busy") mà không hề đọc mã phản hồi HTTP thực tế trong dữ liệu thô. Lỗi thực tế xuất phát từ logic máy trạng thái State Machine của ứng dụng.

---

## 3. Bẫy số 3: Thẩm định giải pháp tối ưu hóa (Feasible vs Hallucinated)

| Đề xuất của AI | Phân loại | Cơ sở phản biện kỹ thuật |
|---|:---:|---|
| **Tăng Connection Pool cho SQLite lên 50** | ❌ **HALLUCINATED** | SQLite là CSDL dạng tệp tin không có máy chủ (serverless embedded file). SQLite không hỗ trợ connection pooling như MySQL hay PostgreSQL. Mở nhiều kết nối vào một file SQLite chỉ làm tăng tranh chấp khóa của hệ điều hành. |
| **Bật chế độ Write-Ahead Logging (WAL)** | ✅ **FEASIBLE** | Thực thi `PRAGMA journal_mode = WAL;` cho phép nhiều luồng đọc đồng thời với 1 luồng ghi, giảm thiểu xung đột. |
| **Bổ sung Phân trang (`LIMIT / OFFSET`) cho API đọc** | ✅ **FEASIBLE** | Giảm kích thước payload từ 180 KB xuống < 10 KB, triệt tiêu việc nghẽn băng thông 18.1 MB/s trên localhost. |
| **Tạo Index cho khóa ngoại `orders.user_id`** | ✅ **FEASIBLE** | Tối ưu hóa câu truy vấn `LEFT JOIN` từ quét toàn bảng (Full Table Scan) sang Index Lookup $O(\log N)$. |
