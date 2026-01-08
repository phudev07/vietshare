"""
Auto Runner - Chạy crawler tự động theo interval
Dùng để schedule crawling định kỳ
"""

import time
import subprocess
import sys
import os
import json
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, 'config.json')

def load_config():
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_crawler():
    """Chạy crawler script"""
    print(f"\n{'='*50}")
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}")
    
    crawler_script = os.path.join(SCRIPT_DIR, 'crawler.py')
    result = subprocess.run([sys.executable, crawler_script], cwd=SCRIPT_DIR)
    
    return result.returncode == 0

def run_import():
    """Chạy import script"""
    import_script = os.path.join(SCRIPT_DIR, 'firebase_import.py')
    
    # Kiểm tra có file articles không
    articles_file = os.path.join(SCRIPT_DIR, 'articles_to_import.json')
    if not os.path.exists(articles_file):
        return
    
    result = subprocess.run([sys.executable, import_script], cwd=SCRIPT_DIR)
    return result.returncode == 0

def main():
    print("🤖 VietShare Auto Crawler")
    print("=" * 50)
    
    config = load_config()
    interval = config['settings']['check_interval_minutes']
    
    print(f"⏰ Chế độ: Tự động chạy mỗi {interval} phút")
    print(f"📦 Max bài/lần: {config['settings']['max_articles_per_run']}")
    print(f"🔄 Auto publish: {config['settings']['auto_publish']}")
    print(f"\n👉 Nhấn Ctrl+C để dừng\n")
    
    while True:
        try:
            # Chạy crawler
            run_crawler()
            
            # Chạy import nếu có file
            run_import()
            
            # Đợi interval
            print(f"\n💤 Đợi {interval} phút cho lần crawl tiếp theo...")
            time.sleep(interval * 60)
            
        except KeyboardInterrupt:
            print("\n\n🛑 Đã dừng auto crawler")
            break
        except Exception as e:
            print(f"\n❌ Lỗi: {e}")
            print("⏳ Thử lại sau 5 phút...")
            time.sleep(300)

if __name__ == '__main__':
    main()
