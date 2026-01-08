# VietShare Article Crawler Tool

Tool tự động crawl bài viết từ các website công nghệ, dùng AI viết lại hoàn toàn, và đăng lên Firebase.

## Cài đặt

```bash
cd tools
pip install -r requirements.txt
```

## Cấu hình

### 1. Gemini API Key (BẮT BUỘC)
1. Truy cập https://aistudio.google.com/app/apikey
2. Tạo API key
3. Mở `config.json`, thay `YOUR_GEMINI_API_KEY_HERE` bằng key của bạn

### 2. Firebase Credentials (cho auto import)
1. Vào Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Lưu file JSON vào thư mục `tools/` với tên `firebase-credentials.json`

## Sử dụng

### Chạy thủ công (1 lần)
```bash
python crawler.py
```

### Chạy tự động (liên tục)
```bash
python auto_run.py
```
Sẽ tự động crawl mỗi 30 phút (có thể thay đổi trong config.json)

### Import vào Firebase
```bash
python firebase_import.py
```

## Cấu hình config.json

```json
{
  "settings": {
    "check_interval_minutes": 30,  // Thời gian giữa các lần crawl
    "max_articles_per_run": 5,     // Số bài tối đa mỗi lần
    "auto_publish": true           // Tự động publish hay để draft
  }
}
```

## Nguồn crawl

Tool hiện crawl từ:
- VnExpress Số Hóa
- Genk
- 24h Công nghệ
- Quantrimang

Có thể thêm nguồn mới trong `config.json` → `sources`

## Output

- `articles_to_import.json` - Bài viết đã rewrite, sẵn sàng import
- `processed.json` - Danh sách URL đã xử lý (tránh trùng lặp)
