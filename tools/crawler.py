"""
VietShare Article Crawler & AI Rewriter Tool
Tự động crawl bài viết từ RSS, dùng AI rewrite, và đăng lên Firebase
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
import google.generativeai as genai

# Load config
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')
PROCESSED_FILE = os.path.join(os.path.dirname(__file__), 'processed.json')

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

def get_article_hash(url):
    return hashlib.md5(url.encode()).hexdigest()

def fetch_full_content(url):
    """Lấy nội dung đầy đủ từ URL bài viết"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Tìm nội dung chính (các selector phổ biến)
        content_selectors = [
            'article', '.article-content', '.content-detail', 
            '.fck_detail', '.the-article-body', '.post-content',
            '#content', '.entry-content'
        ]
        
        content = None
        for selector in content_selectors:
            content = soup.select_one(selector)
            if content:
                break
        
        if not content:
            content = soup.find('body')
        
        # Lấy text và làm sạch
        paragraphs = content.find_all('p')
        text_content = '\n\n'.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
        
        # Lấy ảnh
        images = []
        for img in content.find_all('img'):
            src = img.get('src') or img.get('data-src')
            if src and not 'logo' in src.lower() and not 'icon' in src.lower():
                if not src.startswith('http'):
                    src = 'https:' + src if src.startswith('//') else src
                images.append(src)
        
        return text_content, images[:5]  # Max 5 ảnh
        
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None, []

def rewrite_with_ai(title, content, config, retry_count=0):
    """Dùng Gemini AI để viết lại tiêu đề và nội dung"""
    models = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest']
    
    for model_name in models:
        try:
            genai.configure(api_key=config['gemini_api_key'])
            model = genai.GenerativeModel(model_name)
            
            prompt = f"""Bạn là một nhà báo công nghệ chuyên nghiệp. Hãy viết lại bài viết sau thành một bài viết MỚI HOÀN TOÀN, KHÁC 100% về câu từ nhưng giữ nguyên ý chính.

TIÊU ĐỀ GỐC: {title}

NỘI DUNG GỐC:
{content[:3000]}

YÊU CẦU:
1. Viết tiêu đề MỚI hấp dẫn, SEO-friendly, khác hoàn toàn tiêu đề gốc
2. Viết lại nội dung với giọng văn tự nhiên, dễ đọc
3. Giữ các thông tin quan trọng nhưng KHÔNG copy nguyên văn
4. Thêm các heading h2, h3 phù hợp
5. Độ dài tương đương hoặc dài hơn bài gốc
6. Format HTML cho nội dung (dùng <p>, <h2>, <h3>, <ul>, <li>)

TRẢ VỀ ĐÚNG FORMAT JSON:
{{
  "title": "tiêu đề mới",
  "excerpt": "tóm tắt ngắn 1-2 câu", 
  "content": "nội dung HTML đầy đủ",
  "tags": ["tag1", "tag2", "tag3"]
}}
"""
            
            response = model.generate_content(prompt)
            response_text = response.text
            
            # Parse JSON từ response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
                print(f"    🤖 Dùng model: {model_name}")
                return result
            
        except Exception as e:
            error_str = str(e)
            if '429' in error_str or 'quota' in error_str.lower():
                print(f"    ⏳ Rate limit với {model_name}, thử model khác...")
                time.sleep(5)
                continue
            else:
                print(f"    ❌ Lỗi {model_name}: {e}")
                continue
    
    # Nếu tất cả model đều fail, đợi và retry
    if retry_count < 2:
        print(f"    ⏳ Đợi 60s rồi thử lại...")
        time.sleep(60)
        return rewrite_with_ai(title, content, config, retry_count + 1)
    
    return None


def generate_image_prompt(title, content):
    """Tạo prompt để generate ảnh từ nội dung bài"""
    prompt = f"""Create a modern, professional blog thumbnail image for this article:
Title: {title}
Topic: Technology/Tips
Style: Clean, minimalist, tech-focused, vibrant colors, no text in image
"""
    return prompt

def create_slug(title):
    """Tạo slug từ tiêu đề"""
    # Bỏ dấu tiếng Việt
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
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    
    return slug[:100]

def process_rss_feed(source, config, processed):
    """Xử lý một RSS feed"""
    print(f"\n📡 Đang crawl: {source['name']}")
    
    try:
        feed = feedparser.parse(source['rss'])
        new_articles = []
        
        for entry in feed.entries[:config['settings']['max_articles_per_run']]:
            article_hash = get_article_hash(entry.link)
            
            if article_hash in processed:
                continue
            
            print(f"  📰 Đang xử lý: {entry.title[:50]}...")
            
            # Lấy nội dung đầy đủ
            content, images = fetch_full_content(entry.link)
            
            if not content or len(content) < 200:
                print(f"    ⚠️ Không lấy được nội dung")
                continue
            
            # AI rewrite
            rewritten = rewrite_with_ai(entry.title, content, config)
            
            if not rewritten:
                print(f"    ⚠️ AI rewrite thất bại")
                continue
            
            # Tạo article object
            article = {
                'title': rewritten['title'],
                'slug': create_slug(rewritten['title']),
                'excerpt': rewritten.get('excerpt', ''),
                'content': rewritten['content'],
                'category': source['category'],
                'tags': rewritten.get('tags', []),
                'thumbnail': images[0] if images else '',
                'original_images': images,
                'source_url': entry.link,
                'source_name': source['name'],
                'publishedAt': datetime.now().isoformat(),
                'views': 0,
                'status': 'published' if config['settings']['auto_publish'] else 'draft'
            }
            
            new_articles.append(article)
            processed.append(article_hash)
            
            print(f"    ✅ Đã rewrite: {rewritten['title'][:50]}...")
            
            # Delay để tránh rate limit
            time.sleep(2)
        
        return new_articles
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return []

def save_articles_to_json(articles):
    """Lưu bài viết vào file JSON để import vào Firebase"""
    output_file = os.path.join(os.path.dirname(__file__), 'articles_to_import.json')
    
    existing = []
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    
    existing.extend(articles)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Đã lưu {len(articles)} bài vào: {output_file}")
    return output_file

def main():
    print("=" * 50)
    print("🚀 VietShare Article Crawler & AI Rewriter")
    print("=" * 50)
    
    config = load_config()
    processed = load_processed()
    
    if config['gemini_api_key'] == 'YOUR_GEMINI_API_KEY_HERE':
        print("\n❌ Lỗi: Chưa cấu hình Gemini API key!")
        print("👉 Mở file tools/config.json và thêm API key")
        print("👉 Lấy key tại: https://aistudio.google.com/app/apikey")
        return
    
    all_articles = []
    
    for source in config['sources']:
        articles = process_rss_feed(source, config, processed)
        all_articles.extend(articles)
    
    save_processed(processed)
    
    if all_articles:
        output_file = save_articles_to_json(all_articles)
        print(f"\n✅ Hoàn thành! Đã crawl {len(all_articles)} bài viết mới")
        print(f"📁 File output: {output_file}")
    else:
        print("\n📭 Không có bài viết mới để xử lý")

if __name__ == '__main__':
    main()
