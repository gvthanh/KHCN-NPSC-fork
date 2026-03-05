# Hệ thống Quản lý Đề tài, Sáng kiến KHCN

Hệ thống quản lý đề tài KHCN, sáng kiến cải tiến kỹ thuật theo kiến trúc **Single-Tenant**. Mỗi tổ chức/công ty khi sử dụng sẽ triển khai một bản sao riêng của hệ thống này, kết nối với cơ sở dữ liệu Firebase và API AI riêng biệt của họ, đảm bảo tính bảo mật và độc lập dữ liệu.

## Các tính năng chính
- **Quản lý Sáng kiến**: Đăng ký, xét duyệt, và lưu trữ các sáng kiến cải tiến kỹ thuật.
- **Danh mục KHCN**: Quản lý các đề tài nghiên cứu khoa học.
- **Tìm kiếm AI**: Tìm kiếm tài liệu, sáng kiến với sự hỗ trợ của AI (Google Gemini).
- **Phân đoạn dữ liệu**: Mỗi người dùng chỉ xem được các dữ liệu được phép (tùy theo role admin/user).

## Hướng dẫn triển khai
Vui lòng xem file [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) để biết hướng dẫn chi tiết từng bước triển khai hệ thống lên dịch vụ Vercel hoặc tự host.

## Cách chạy cục bộ (Local Development)

### 1. Yêu cầu Cài đặt
- Node.js (phiên bản khuyến nghị: 18.x hoặc 20.x)
- Tài khoản Firebase (để tạo project và cấu hình database)
- Tài khoản Google AI Studio (để lấy API key cho Gemini)

### 2. Cài đặt các thư viện (Dependencies)
```bash
npm install
```

### 3. Cấu hình Biến môi trường
Copy file mẫu cấu hình và điền các thông số thích hợp:
```bash
cp .env.example .env.local
```
Mở file `.env.local` và điền:
- Các thông số config Firebase (`VITE_FIREBASE_...`)
- Gemini API Key (`VITE_GEMINI_API_KEY`)
- Telegram Bot Setup (Tuỳ chọn: `VITE_TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_CHAT_ID`)

### 4. Chạy ứng dụng (Dev Server)
```bash
npm run dev
```
Mở trình duyệt tại địa chỉ hiển thị trong terminal (thường là http://localhost:5173).

## Cấu trúc mã nguồn
- `src/`: Thư mục chính chứa mã nguồn React (Vite).
- `src/pages/`: Các trang giao diện chính.
- `src/components/`: Các component tái sử dụng.
- `src/lib/`: Các tiện ích, Firebase config, AI service.
- `firestore.rules` & `storage.rules`: Các quy định phân quyền của Firebase.
