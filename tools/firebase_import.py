"""
Firebase Import Script
Nhập bài viết đã crawl vào Firestore
"""

import json
import os
import firebase_admin
from firebase_admin import credentials, firestore

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')
ARTICLES_FILE = os.path.join(os.path.dirname(__file__), 'articles_to_import.json')

def init_firebase():
    """Khởi tạo Firebase Admin SDK"""
    config = json.load(open(CONFIG_FILE, 'r', encoding='utf-8'))
    cred_file = os.path.join(os.path.dirname(__file__), config['firebase']['credentials_file'])
    
    if not os.path.exists(cred_file):
        print(f"❌ Không tìm thấy file credentials: {cred_file}")
        print("👉 Lấy file từ: Firebase Console → Project Settings → Service Accounts → Generate new private key")
        return None
    
    cred = credentials.Certificate(cred_file)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def import_articles():
    """Import bài viết vào Firestore"""
    if not os.path.exists(ARTICLES_FILE):
        print("❌ Không có bài viết để import")
        print(f"👉 Chạy crawler.py trước để tạo file: {ARTICLES_FILE}")
        return
    
    db = init_firebase()
    if not db:
        return
    
    with open(ARTICLES_FILE, 'r', encoding='utf-8') as f:
        articles = json.load(f)
    
    if not articles:
        print("📭 File articles rỗng")
        return
    
    print(f"📦 Đang import {len(articles)} bài viết...")
    
    imported = 0
    for article in articles:
        try:
            # Kiểm tra slug đã tồn tại chưa
            existing = db.collection('articles').where('slug', '==', article['slug']).limit(1).get()
            if len(list(existing)) > 0:
                print(f"  ⚠️ Đã tồn tại: {article['title'][:40]}...")
                continue
            
            # Thêm vào Firestore
            doc_ref = db.collection('articles').add(article)
            print(f"  ✅ Đã import: {article['title'][:40]}...")
            imported += 1
            
        except Exception as e:
            print(f"  ❌ Lỗi import: {e}")
    
    print(f"\n✅ Hoàn thành! Đã import {imported}/{len(articles)} bài viết")
    
    # Xóa file sau khi import
    if imported > 0:
        os.rename(ARTICLES_FILE, ARTICLES_FILE + '.imported')
        print(f"📁 File đã được rename thành: articles_to_import.json.imported")

if __name__ == '__main__':
    import_articles()
