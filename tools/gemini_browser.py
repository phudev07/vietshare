"""
Gemini Browser Chat - Gửi link cho Gemini tự đọc và rewrite
"""

import time
import json
import re
import subprocess
import shutil
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import os

class GeminiBrowser:
    def __init__(self):
        self.driver = None
        self.profile_dir = os.path.join(os.path.dirname(__file__), 'selenium_chrome_data')
        
    def kill_chrome(self):
        """Đóng Chrome"""
        subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], capture_output=True, check=False)
        subprocess.run(['taskkill', '/F', '/IM', 'chromedriver.exe'], capture_output=True, check=False)
        time.sleep(3)
        
    def start(self):
        """Mở trình duyệt"""
        print("⚠️  Đang đóng Chrome cũ...")
        self.kill_chrome()
        
        # Xóa profile lỗi
        if os.path.exists(self.profile_dir):
            try:
                shutil.rmtree(self.profile_dir)
            except:
                pass
        os.makedirs(self.profile_dir, exist_ok=True)
        
        options = Options()
        options.add_argument(f'--user-data-dir={self.profile_dir}')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--start-maximized')
        options.add_argument('--remote-debugging-port=9222')
        options.add_argument('--disable-extensions')
        options.add_argument('--no-first-run')
        options.add_experimental_option('excludeSwitches', ['enable-automation', 'enable-logging'])
        
        try:
            print("🌐 Đang mở Chrome...")
            self.driver = webdriver.Chrome(options=options)
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False
        
        print("🌐 Mở Gemini...")
        self.driver.get('https://gemini.google.com/app')
        time.sleep(5)
        
        if 'accounts.google.com' in self.driver.current_url:
            print("\n⚠️  ĐĂNG NHẬP GOOGLE trong cửa sổ Chrome")
            input("Nhấn Enter sau khi xong...")
            time.sleep(2)
        
        print("✅ Sẵn sàng!")
        return True
        
    def send_and_wait(self, message):
        """Gửi tin nhắn và đợi trả lời"""
        try:
            # Tìm input
            time.sleep(2)
            input_box = None
            for sel in ['div[contenteditable="true"]', 'p[data-placeholder]', '.ql-editor']:
                try:
                    els = self.driver.find_elements(By.CSS_SELECTOR, sel)
                    for el in els:
                        if el.is_displayed():
                            input_box = el
                            break
                    if input_box:
                        break
                except:
                    continue
            
            if not input_box:
                print("    ❌ Không thấy ô input")
                return None
            
            # Nhập
            input_box.click()
            time.sleep(0.3)
            self.driver.execute_script("arguments[0].innerText = arguments[1]", input_box, message)
            time.sleep(0.5)
            
            # Gửi
            try:
                btn = self.driver.find_element(By.CSS_SELECTOR, 'button[aria-label*="Send"], button[aria-label*="Gửi"]')
                btn.click()
            except:
                input_box.send_keys(Keys.ENTER)
            
            print("    📤 Đã gửi, đợi trả lời...")
            
            # Đợi response hoàn tất (tối đa 90 giây)
            time.sleep(10)  # Đợi Gemini bắt đầu
            
            last_len = 0
            stable = 0
            for _ in range(40):  # 40 x 2s = 80s max
                try:
                    body_text = self.driver.find_element(By.TAG_NAME, 'body').text
                    current_len = len(body_text)
                    
                    if current_len == last_len:
                        stable += 1
                        if stable >= 3:  # Ổn định 6 giây
                            # Tìm JSON
                            match = re.search(r'\{["\']?title["\']?\s*:\s*["\'][^"\']+["\'][\s\S]*?\}', body_text)
                            if match:
                                return match.group()
                            break
                    else:
                        stable = 0
                        last_len = current_len
                    
                    time.sleep(2)
                except:
                    time.sleep(2)
            
            # Lấy bất kỳ JSON nào tìm được
            try:
                body_text = self.driver.find_element(By.TAG_NAME, 'body').text
                match = re.search(r'\{[\s\S]*?"title"[\s\S]*?"content"[\s\S]*?\}', body_text)
                if match:
                    return match.group()
            except:
                pass
            
            return None
            
        except Exception as e:
            print(f"    ❌ Lỗi: {e}")
            return None
    
    def new_chat(self):
        """Chat mới"""
        self.driver.get('https://gemini.google.com/app')
        time.sleep(4)
    
    def close(self):
        if self.driver:
            self.driver.quit()


def rewrite_with_url(url, category, gemini):
    """Gửi URL cho Gemini để đọc và viết lại - TỐI ƯU SEO"""
    
    prompt = f"""Đọc bài viết từ link: {url}

Viết lại bài này TỐI ƯU CHO SEO với YÊU CẦU:

📌 SEO TITLE:
- Chứa từ khóa chính ở đầu tiêu đề
- Độ dài 50-60 ký tự
- Hấp dẫn, thu hút click

📌 SEO EXCERPT (mô tả):
- 150-160 ký tự
- Chứa từ khóa chính
- Mô tả ngắn gọn, cuốn hút

📌 SEO CONTENT:
- GIỮ NGUYÊN độ dài như bài gốc
- Heading H2/H3 có từ khóa liên quan
- Đoạn mở đầu chứa từ khóa chính
- Dùng danh sách <ul><li> khi phù hợp
- Liên kết nội bộ tự nhiên
- Kết bài có CTA (kêu gọi hành động)

📌 TAGS:
- 3-5 tags liên quan
- Từ khóa chính + từ khóa phụ

📌 GIỮ NGUYÊN:
- Tất cả ảnh <img src="...">
- Độ dài bài viết
- Cấu trúc heading

Trả về JSON:
{{"title":"tiêu đề SEO 50-60 ký tự","excerpt":"mô tả 150-160 ký tự chứa từ khóa","content":"<h2>Heading có từ khóa</h2><p>Đoạn mở đầu với từ khóa chính...</p><img src='URL'><h2>...</h2><p>...</p><h3>Kết luận</h3><p>CTA...</p>","tags":["từ khóa chính","từ khóa phụ","tag3"]}}

CHỈ JSON."""

    response = gemini.send_and_wait(prompt)
    
    if response:
        try:
            # Clean JSON
            response = response.replace('\n', ' ').strip()
            # Tìm JSON hợp lệ
            match = re.search(r'\{[^{}]*"title"[^{}]*"content"[^{}]*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group())
            # Thử parse trực tiếp
            return json.loads(response)
        except Exception as e:
            print(f"    ⚠️ Parse lỗi: {e}")
            # Thử sửa JSON
            try:
                fixed = re.sub(r'```json\s*|\s*```', '', response)
                return json.loads(fixed)
            except:
                pass
    
    return None


if __name__ == '__main__':
    print("🧪 Test gửi URL")
    g = GeminiBrowser()
    if g.start():
        result = rewrite_with_url(
            "https://vnexpress.net/iphone-16e-lo-cau-hinh-4841147.html",
            "cong-nghe",
            g
        )
        print(f"\nKết quả: {json.dumps(result, ensure_ascii=False, indent=2) if result else 'Thất bại'}")
        input("Enter để đóng...")
        g.close()
