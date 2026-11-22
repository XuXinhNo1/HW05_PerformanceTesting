# Hướng dẫn Kỹ thuật: Thực thi Soak Test 15 phút & Giám sát Tài nguyên Thực tế

## 1. Mục tiêu của Soak Test (Endurance Testing)

Theo tiêu chuẩn kiểm thử hiệu năng và mục 1 (trang 5) của đề bài HW05:
- Mục tiêu là chạy tải liên tục ở **mức tải bền vững (around 10–15 minutes at sustained load)** để tìm ra ngưỡng chịu đựng thực tế của phần cứng, phát hiện rò rỉ bộ nhớ (Memory Leak) và suy thoái độ trễ qua thời gian.
- **Thời lượng chuẩn:** 900 giây (15 phút).
- **Mức tải chuẩn:** 15 virtual users, Gaussian Think-time 1200ms ± 500ms, Throughput đạt ~13–15 req/s.

---

## 2. Tránh lỗi cạn kiệt đơn hàng (Order Starvation)

- Khi chạy 15 phút với Throughput 13.7 req/s: có khoảng 4.5 request/s là thao tác cập nhật đơn hàng.
- Tổng số thao tác cập nhật trong 15 phút: $900 \times 4.5 \approx 4,100$ requests.
- Nếu CSDL chỉ có 1.000 đơn hàng pending ban đầu, sau phút thứ 3.5 toàn bộ đơn hàng đều chuyển sang `confirmed`, và 11.5 phút còn lại sẽ bị sập lỗi `HTTP 400 Bad Request: Invalid state transition`.
- **Giải pháp bắt buộc:** Nạp sẵn **10.000 đơn hàng pending** vào CSDL trước khi chạy Soak Test bằng script `seed_fast.py` hoặc `seed_orders.js`.

---

## 3. Đo đạc Tài nguyên Hệ thống Tự động (`monitor_resources.py`)

Script sử dụng thư viện `psutil` để thu thập các chỉ số thời gian thực:
- **Tần suất ghi:** 5 giây/lần.
- **Tiến trình Backend Node.js:** Lấy theo PID đang lắng nghe cổng 3000 (`Get-NetTCPConnection -LocalPort 3000`).
- **File nhật ký:** `reports/soak/system_resources.csv`.

### Tiêu chuẩn đánh giá rò rỉ bộ nhớ (Memory Leak Criteria):
1. **Bình thường (Healthy):** Bộ nhớ RAM của Node.js tăng dần trong vài phút đầu để nạp cache, đạt đỉnh (Peak), sau đó cơ chế Garbage Collection (GC) của V8 Engine định kỳ dọn dẹp và giữ mức RAM dao động ổn định (Plateau).
2. **Rò rỉ bộ nhớ (Memory Leak):** Đồ thị RAM tăng tuyến tính liên tục với độ dốc dương lớn, không có đáy thu hồi sau chu kỳ GC, và tiến trình bị sập do `JavaScript heap out of memory`.
