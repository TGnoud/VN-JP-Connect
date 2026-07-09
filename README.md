

## 🚀 Tính năng chính (Features)

* **Job Matching:** Kết nối ứng viên Việt Nam với các nhà tuyển dụng Nhật Bản.
* **Knowledge Base:** Kho tài liệu về Visa, bảo hiểm, và các quy định pháp luật tại Nhật.
* **Language Support:** Công cụ hỗ trợ dịch thuật chuyên ngành hoặc học tiếng Nhật.
* **Community Forum:** Nơi chia sẻ kinh nghiệm sống, làm việc và học tập.
* **Real-time Update:** Cập nhật tỷ giá JPY/VND và tin tức mới nhất từ hai nước.

---

## 🛠 Hướng dẫn Setup Môi trường (Installation)

Hãy làm theo các bước sau để thiết lập dự án trên máy tính cá nhân của bạn:

### 1. Yêu cầu hệ thống (Prerequisites)
Đảm bảo bạn đã cài đặt:
* [Node.js](https://nodejs.org/) (Phiên bản v16.x hoặc mới hơn)
* [Git](https://git-scm.com/)
* Trình quản lý gói: `npm` hoặc `yarn`
* Cơ sở dữ liệu: MongoDB (hoặc SQL tùy cấu hình bạn chọn)

### 2. Tải mã nguồn về máy
```
git clone [https://github.com/TGnoud/VN-JP-Connect.git](https://github.com/TGnoud/VN-JP-Connect.git)
cd VN-JP-Connect
```
3.Cài đặt Backend: 
```
cd backend
npm install
```
4.Cài đặt Frontend: 
```
cd frontend
npm install
```
5. Cấu hình biến môi trường (.env)
Tạo file .env trong thư mục backend và điền các thông tin cần thiết:
```
Đoạn mã
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_123
```
6.Khởi chạy ứng dụng
Mở hai cửa sổ Terminal (hoặc sử dụng thư viện concurrently nếu có cấu hình):
```
6.1 Chạy Server (Backend):
```
cd backend
npm run dev
```
6.2 Chạy Giao diện (Frontend):
```
cd frontend
npm start
```
Ứng dụng sẽ mặc định chạy tại địa chỉ: http://localhost:3000

