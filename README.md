# VietShare

Trang web hướng dẫn sử dụng Zalo, khắc phục lỗi và mẹo hay cho Zalo PC, Web, Mobile.

🌐 **Live**: [vietshare.site](https://vietshare.site)

## Features

- 📝 **Bài viết** - Hướng dẫn chi tiết về Zalo
- 🔍 **Tìm kiếm** - Fuzzy search với Fuse.js
- 🌙 **Dark Mode** - Hỗ trợ chế độ tối
- 📱 **Responsive** - Tối ưu cho mobile
- ⚡ **Fast** - Static HTML, no framework
- 🔐 **Admin Panel** - Quản lý bài viết

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Images**: Cloudinary CDN
- **Hosting**: GitHub Pages
- **Analytics**: Firebase Analytics
- **Ads**: Google AdSense

## Structure

```
├── index.html          # Homepage
├── article.html        # Article page
├── category.html       # Category listing
├── search.html         # Search page
├── admin/              # Admin panel
│   ├── index.html      # Dashboard
│   ├── editor.html     # Article editor
│   └── quick-editor.html # Quick paste tool
├── js/
│   ├── app.js          # Main application
│   ├── firebase-config.js
│   └── dark-mode.js
└── assets/
    └── css/style.css
```

## License

© 2026 VietShare. All rights reserved.
