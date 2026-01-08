# VietShare Blog

Blog tin tức công nghệ, mẹo vặt, hướng dẫn và đời sống - Tiếng Việt.

## 🌐 Demo

[vietshare.site](https://vietshare.site)

## ✨ Tính năng

- 📱 **Responsive** - Tối ưu cho mobile, tablet, desktop
- 🌙 **Dark Mode** - Chế độ tối/sáng
- 🔥 **Firebase** - Firestore database & Authentication
- 📝 **Admin Panel** - Quản lý bài viết, danh mục
- 🏷️ **Danh mục động** - Tạo/sửa/xóa danh mục từ admin
- 🔍 **Tìm kiếm** - Tìm bài viết theo tiêu đề
- 📊 **Thống kê** - Lượt xem, bài viết nổi bật
- 💬 **SEO Ready** - Meta tags, Open Graph

## 📁 Cấu trúc

```
web_blog/
├── index.html          # Trang chủ
├── article.html        # Trang đọc bài viết
├── category.html       # Trang danh mục
├── about.html          # Giới thiệu
├── contact.html        # Liên hệ
├── privacy.html        # Chính sách bảo mật
├── terms.html          # Điều khoản sử dụng
├── css/
│   └── style.css       # Stylesheet chính
├── js/
│   ├── app.js          # JavaScript chính
│   └── firebase-config.js
├── admin/              # Trang quản trị
│   ├── index.html      # Dashboard
│   ├── articles.html   # Quản lý bài viết
│   ├── categories.html # Quản lý danh mục
│   ├── editor.html     # Viết/sửa bài
│   └── login.html      # Đăng nhập admin
└── favicon.png
```

## 🚀 Cài đặt

1. **Clone repo**
```bash
git clone https://github.com/your-username/web_blog.git
cd web_blog
```

2. **Cấu hình Firebase**
- Tạo project tại [Firebase Console](https://console.firebase.google.com)
- Bật Firestore Database và Authentication
- Sao chép config vào `js/firebase-config.js`

3. **Chạy local**
```bash
npx http-server -p 8080
```

4. **Mở trình duyệt**: http://localhost:8080

## 🔧 Firebase Config

Sửa file `js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📦 Danh mục mặc định

| Slug | Tên |
|------|-----|
| cong-nghe | Công nghệ |
| tin-tuc | Tin tức |
| meo-vat | Mẹo vặt |
| huong-dan | Hướng dẫn |
| ung-dung | Ứng dụng |
| giai-tri | Giải trí |
| doi-song | Đời sống |
| hoc-tap | Học tập |

## 📄 License

MIT License

## 👤 Tác giả

VietShare Team
