"""
Generate sitemap.xml with all published articles from Firebase
Run this script periodically to update the sitemap
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

# Initialize Firebase
script_dir = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(script_dir, 'firebase-credentials.json')

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def generate_sitemap():
    """Generate sitemap.xml with all published articles"""
    
    # Static pages
    static_pages = [
        ('https://vietshare.site/', 'daily', '1.0'),
        ('https://vietshare.site/about.html', 'monthly', '0.5'),
        ('https://vietshare.site/contact.html', 'monthly', '0.5'),
        ('https://vietshare.site/privacy.html', 'yearly', '0.3'),
        ('https://vietshare.site/terms.html', 'yearly', '0.3'),
    ]
    
    # Get all published articles
    articles_ref = db.collection('articles')
    docs = articles_ref.where('status', '==', 'published').stream()
    
    articles = []
    categories_with_articles = set()
    
    for doc in docs:
        data = doc.to_dict()
        slug = data.get('slug')
        category = data.get('category')
        updated_at = data.get('updatedAt') or data.get('publishedAt')
        
        if slug:
            articles.append({
                'slug': slug,
                'updated': updated_at,
            })
            if category:
                categories_with_articles.add(category)
    
    print(f"Found {len(articles)} published articles")
    print(f"Categories with articles: {categories_with_articles}")
    
    # Generate XML
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Add static pages
    for url, changefreq, priority in static_pages:
        xml_content += f'''  <url>
    <loc>{url}</loc>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>
'''
    
    # Add category pages (only those with articles)
    for cat in categories_with_articles:
        xml_content += f'''  <url>
    <loc>https://vietshare.site/category.html?cat={cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
'''
    
    # Add article pages
    for article in articles:
        slug = article['slug']
        updated = article['updated']
        
        lastmod = ''
        if updated:
            try:
                if hasattr(updated, 'isoformat'):
                    lastmod = f'\n    <lastmod>{updated.isoformat()[:10]}</lastmod>'
            except:
                pass
        
        xml_content += f'''  <url>
    <loc>https://vietshare.site/article.html?slug={slug}</loc>{lastmod}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
'''
    
    xml_content += '</urlset>\n'
    
    # Save sitemap
    sitemap_path = os.path.join(script_dir, '..', 'sitemap.xml')
    with open(sitemap_path, 'w', encoding='utf-8') as f:
        f.write(xml_content)
    
    print(f"Sitemap saved to {sitemap_path}")
    print(f"Total URLs: {len(static_pages) + len(categories_with_articles) + len(articles)}")

if __name__ == '__main__':
    generate_sitemap()
