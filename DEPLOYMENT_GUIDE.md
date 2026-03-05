# KHCN Web Application - Hướng Dẫn Triển Khai Cho Từng Công Ty (Single-Tenant)

Tài liệu này hướng dẫn cách triển khai một bản sao của ứng dụng KHCN cho một công ty mới. Ứng dụng được thiết kế theo kiến trúc Single-Tenant: mỗi công ty sẽ có một project Firebase riêng, một API Key Gemini riêng và một Vercel Project riêng, dùng chung một mã nguồn từ GitHub.

## Các bước chuẩn bị

### 1. Tạo project Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Tạo một project mới cho công ty.
3. Bật dịch vụ **Authentication** (Email/Password).
4. Bật dịch vụ **Firestore Database**.
5. Đăng ký một Web App trong project Firebase để lấy thông hiện cấu hình (`config`).
6. Update Security Rules cho Firestore (có thể copy từ mã nguồn `firestore.rules`).

### 2. Lấy Google Gemini API Key
1. Truy cập [Google AI Studio](https://aistudio.google.com/).
2. Tạo một API key mới.

### 3. Tạo Telegram Bot (Tùy chọn, dùng để nhận thông báo đăng ký user mới)
1. Chat với `@BotFather` trên Telegram để tạo bot và lấy `Bot Token`.
2. Lấy `Chat ID` của group hoặc user nhận thông báo.

---

## Các bước triển khai lên Vercel

1. **Fork/Clone mã nguồn:** 
   Công ty (hoặc admin triển khai) tạo một tài khoản Vercel và kết nối với repository GitHub chứa mã nguồn ứng dụng này. Đảm bảo rằng mỗi khi code chính được cập nhật trên repo gốc, các project Vercel được link tới đó cũng sẽ tự động build lại (nếu chung config).

2. **Cấu hình Environment Variables:**
   Trong trang quản trị của project trên Vercel, chọn **Settings** > **Environment Variables**. Thêm các biến môi trường sau dựa trên thông tin đã lấy ở phần Chuẩn bị:

   **Firebase Config:**
   * `VITE_FIREBASE_API_KEY`
   * `VITE_FIREBASE_AUTH_DOMAIN`
   * `VITE_FIREBASE_PROJECT_ID`
   * `VITE_FIREBASE_MESSAGING_SENDER_ID`
   * `VITE_FIREBASE_APP_ID`

   **Gemini AI:**
   * `VITE_GEMINI_API_KEY`

   **Telegram (Tùy chọn):**
   * `VITE_TELEGRAM_BOT_TOKEN`
   * `VITE_TELEGRAM_CHAT_ID`

3. **Deploy:**
   Sau khi lưu các biến môi trường, tiến hành Deploy ứng dụng. Lấy domain được Vercel cấp.

4. **Thêm Authorized Domain trong Firebase:**
   Quay lại Firebase Console > Authentication > Settings > Authorized domains. Thêm domain Vercel vừa được cấp để cho phép đăng nhập từ domain đó.

---

## Cấu hình Tài khoản Admin đầu tiên

Hệ thống cho phép người dùng tự đăng ký. Tuy nhiên, để phê duyệt các người dùng khác, bạn cần tạo một tài khoản Admin.

1. Truy cập web vừa deploy và Đăng ký một tài khoản mới bất kỳ.
2. Vào **Firebase Console** > **Firestore Database**.
3. Tìm collection `users`, tìm document ID ứng với tài khoản vừa tạo.
4. Sửa field `role` từ `user` thành `admin` và `status` từ `pending` thành `approved`.
5. Đăng nhập lại bằng tài khoản vừa sửa để bắt đầu quản trị hệ thống.
