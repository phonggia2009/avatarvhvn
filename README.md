# Tạo ảnh đại diện – Xã Sơn Đồng

Website tiếng Việt ghép ảnh chân dung với khung PNG gốc cho Ngày Văn hóa Việt Nam.

## Chạy trên máy

Từ thư mục repository:

```sh
python -m http.server 4180 --directory dist
```

Mở http://localhost:4180. Không cần cài thư viện hoặc chạy build.

## Triển khai Vercel

1. Trong Vercel, chọn Add New → Project và import repository GitHub.
2. Giữ Root Directory ở gốc repository, Framework Preset là Other.
3. File `vercel.json` đã đặt Output Directory là `dist`, không cần lệnh build hoặc install.
4. Chọn Deploy.

## Chức năng

- Chọn, đổi ảnh; kéo, chụm hai ngón tay, dùng thanh thu phóng hoặc phím mũi tên để căn chỉnh.
- Căn giữa, làm lại và tải PNG 1254 × 1254 px.
- Đọc kênh alpha của khung để xác định vùng chân dung; giữ nguyên file khung.
- Xử lý ảnh hoàn toàn trong trình duyệt; không gửi ảnh chân dung lên máy chủ, không dùng lưu trữ trình duyệt.

## Cấu trúc

- `dist/index.html`: giao diện.
- `dist/style.css`: bố cục và màu sắc.
- `dist/app.js`: ghép Canvas, mặt nạ alpha, điều khiển ảnh và xuất PNG.
- `dist/frame_vh_vn.png`: khung gốc.

Khung, logo và nội dung hình ảnh được cung cấp cho dự án; repository không cấp thêm quyền sử dụng các tài nguyên này.
