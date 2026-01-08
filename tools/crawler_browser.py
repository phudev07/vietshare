"""
VietShare Crawler - Tự động crawl + đăng bài lên Firebase
"""

import json
import os
import re
import time
import hashlib
import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from gemini_browser import GeminiBrowser, rewrite_with_url

# Firebase
import firebase_admin
from firebase_admin import credentials, firestore

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')
PROCESSED_FILE = os.path.join(os.path.dirname(__file__), 'processed.json')
FIREBASE_CRED = os.path.join(os.path.dirname(__file__), 'firebase-credentials.json')

# Khởi tạo Firebase
db = None
def init_firebase():
    global db
    if db:
        return db
    try:
        if os.path.exists(FIREBASE_CRED):
            cred = credentials.Certificate(FIREBASE_CRED)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("🔥 Firebase đã kết nối!")
            return db
        else:
            print("⚠️ Không tìm thấy firebase-credentials.json")
            return None
    except Exception as e:
        print(f"❌ Lỗi Firebase: {e}")
        return None

def publish_to_firebase(article):
    """Đăng bài lên Firestore"""
    global db
    if not db:
        db = init_firebase()
    if not db:
        return False
    
    try:
        # Kiểm tra slug đã tồn tại
        existing = db.collection('articles').where('slug', '==', article['slug']).limit(1).get()
        if len(list(existing)) > 0:
            print(f"    ⚠️ Slug đã tồn tại")
            return False
        
        # Thêm vào Firestore
        db.collection('articles').add(article)
        return True
    except Exception as e:
        print(f"    ❌ Lỗi đăng bài: {e}")
        return False

def get_article_images(url):
    """Lấy thumbnail và tất cả ảnh từ bài viết gốc"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        thumbnail = ''
        images = []
        
        # Thumbnail từ og:image (LUÔN CHÍNH XÁC NHẤT)
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            thumbnail = og_image['content']
        
        # Selector cụ thể cho từng trang
        # VnExpress: .fck_detail
        # Genk: .knc-content
        # 24h: .cate-24h-foot-arti-deta-info
        content_selectors = [
            '.fck_detail',           # VnExpress
            '.knc-content',          # Genk
            '.cate-24h-foot-arti-deta-info',  # 24h
            'article .content',
            '.article-content',
            '.content-detail',
            '.post-content',
            'article'
        ]
        
        content = None
        for sel in content_selectors:
            content = soup.select_one(sel)
            if content:
                break
        
        if content:
            for img in content.find_all('img'):
                src = img.get('data-src') or img.get('src') or img.get('data-original')
                if src:
                    # Bỏ qua icon, logo, avatar, quảng cáo
                    skip_keywords = ['icon', 'logo', 'avatar', 'emoji', 'pixel', 'adsense', 'tracking', 'gif', 'blank', 'lazy']
                    if any(x in src.lower() for x in skip_keywords):
                        continue
                    
                    # Fix URL
                    if not src.startswith('http'):
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            # Lấy domain từ URL gốc
                            from urllib.parse import urlparse
                            parsed = urlparse(url)
                            src = f"{parsed.scheme}://{parsed.netloc}{src}"
                        else:
                            continue
                    
                    # Chỉ lấy ảnh từ domain tin cậy
                    trusted = ['vnecdn.net', 'vnexpress', 'genk.vn', '24h.com.vn', 'quantrimang', 'kenh14', 'cafef']
                    if any(t in src.lower() for t in trusted):
                        images.append(src)
        
        # Nếu không có thumbnail, dùng ảnh đầu tiên
        if not thumbnail and images:
            thumbnail = images[0]
        
        return thumbnail, images
        
    except Exception as e:
        print(f"    ⚠️ Lỗi lấy ảnh: {e}")
        return '', []

def get_thumbnail(url):
    """Lấy ảnh thumbnail từ bài viết gốc (wrapper)"""
    thumb, _ = get_article_images(url)
    return thumb

def load_config():
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_processed():
    if os.path.exists(PROCESSED_FILE):
        with open(PROCESSED_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_processed(processed):
    with open(PROCESSED_FILE, 'w', encoding='utf-8') as f:
        json.dump(processed, f, ensure_ascii=False, indent=2)

def get_hash(url):
    return hashlib.md5(url.encode()).hexdigest()

def create_slug(title):
    """Tạo slug"""
    replacements = {
        'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
        'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
        'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
        'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
        'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
        'đ': 'd', 'Đ': 'd'
    }
    slug = title.lower()
    for vn, en in replacements.items():
        slug = slug.replace(vn, en)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    return slug[:80]

def save_articles(articles):
    """Lưu bài viết"""
    output_file = os.path.join(os.path.dirname(__file__), 'articles_to_import.json')
    existing = []
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    existing.extend(articles)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã lưu {len(articles)} bài vào {output_file}")

def run_once(gemini, config, processed):
    """Chạy một vòng crawl"""
    all_articles = []
    
    for source in config['sources']:
        print(f"\n📡 {source['name']}")
        
        try:
            feed = feedparser.parse(source['rss'])
            count = 0
            max_per_source = config['settings'].get('max_articles_per_source', 3)
            
            for entry in feed.entries:
                if count >= max_per_source:
                    break
                
                url_hash = get_hash(entry.link)
                if url_hash in processed:
                    continue
                
                print(f"  📰 {entry.title[:40]}...")
                print(f"     🔗 {entry.link}")
                
                # Lấy ảnh từ bài gốc TRƯỚC
                thumbnail, original_images = get_article_images(entry.link)
                print(f"     📸 Tìm thấy {len(original_images)} ảnh từ bài gốc")
                
                # Gửi URL cho Gemini
                result = rewrite_with_url(entry.link, source['category'], gemini)
                
                if result and result.get('title') and result.get('content'):
                    now = datetime.now()
                    
                    # Chèn ảnh gốc vào content
                    content = result['content']
                    if original_images:
                        parts = content.split('</p>')
                        if len(parts) > 1:
                            step = max(1, len(parts) // (len(original_images) + 1))
                            for i, img_url in enumerate(original_images[:5]):
                                insert_pos = min((i + 1) * step, len(parts) - 1)
                                parts[insert_pos] = parts[insert_pos] + f'<img src="{img_url}" alt="">'
                            content = '</p>'.join(parts)
                    
                    # Article cho lưu local
                    article_local = {
                        'title': result['title'],
                        'slug': create_slug(result['title']),
                        'excerpt': result.get('excerpt', ''),
                        'content': content,
                        'category': source['category'],
                        'tags': result.get('tags', []),
                        'thumbnail': thumbnail,
                        'author': 'VietShare',
                        'views': 0,
                        'status': 'published',
                        'createdAt': now.isoformat(),
                        'updatedAt': now.isoformat(),
                        'publishedAt': now.isoformat()
                    }
                    
                    # Article cho Firebase
                    article_firebase = {
                        'title': result['title'],
                        'slug': create_slug(result['title']),
                        'excerpt': result.get('excerpt', ''),
                        'content': content,
                        'category': source['category'],
                        'tags': result.get('tags', []),
                        'thumbnail': thumbnail,
                        'author': 'VietShare',
                        'views': 0,
                        'status': 'published',
                        'createdAt': firestore.SERVER_TIMESTAMP,
                        'updatedAt': firestore.SERVER_TIMESTAMP,
                        'publishedAt': firestore.SERVER_TIMESTAMP
                    }
                    
                    all_articles.append(article_local)
                    processed.append(url_hash)
                    count += 1
                    print(f"     ✅ {result['title'][:40]}...")
                    
                    # LƯU NGAY
                    save_articles([article_local])
                    save_processed(processed)
                    
                    # ĐĂNG LÊN FIREBASE
                    if publish_to_firebase(article_firebase):
                        print(f"     🔥 Đã đăng lên website!")
                    else:
                        print(f"     💾 Đã lưu local")
                else:
                    print(f"     ⚠️ Thất bại")
                
                # Delay + new chat
                time.sleep(5)
                gemini.new_chat()
                
        except Exception as e:
            print(f"  ❌ Lỗi: {e}")
    
    return len(all_articles), processed

def main():
    print("="*60)
    print("🚀 VietShare Crawler - CONTINUOUS MODE")
    print("="*60)
    
    config = load_config()
    processed = load_processed()
    
    # Khởi động Gemini
    gemini = GeminiBrowser()
    if not gemini.start():
        print("❌ Không khởi động được Gemini")
        return
    
    cycle = 0
    total_articles = 0
    
    try:
        while True:
            cycle += 1
            print(f"\n{'='*60}")
            print(f"🔄 VÒNG {cycle} - Tổng đã crawl: {total_articles} bài")
            print(f"{'='*60}")
            
            # Reload config để có thể thay đổi nguồn khi đang chạy
            config = load_config()
            
            # Chạy crawl
            new_count, processed = run_once(gemini, config, processed)
            total_articles += new_count
            
            if new_count > 0:
                print(f"\n✅ Vòng {cycle}: {new_count} bài mới")
            else:
                print(f"\n📭 Vòng {cycle}: Không có bài mới")
            
            # Kiểm tra continuous mode
            if not config['settings'].get('continuous_mode', False):
                print("\n🛑 Continuous mode OFF - Dừng lại")
                break
            
            # Đợi trước khi chạy vòng tiếp
            wait_minutes = config['settings'].get('check_interval_minutes', 15)
            print(f"\n⏳ Đợi {wait_minutes} phút trước vòng tiếp theo...")
            print(f"   (Ctrl+C để dừng)")
            
            for i in range(wait_minutes * 60):
                time.sleep(1)
                if i % 60 == 0 and i > 0:
                    print(f"   Còn {wait_minutes - i//60} phút...")
                    
    except KeyboardInterrupt:
        print("\n\n⚠️ Đã dừng bởi người dùng")
        print(f"📊 Tổng cộng đã crawl: {total_articles} bài trong {cycle} vòng")
        
    finally:
        print("\n🔒 Đóng browser...")
        gemini.close()

if __name__ == '__main__':
    main()

