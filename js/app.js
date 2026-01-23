// VietShare - Main Application JavaScript
import { db, collection, getDocs, query, where, orderBy, limit, doc, getDoc, updateDoc } from './firebase-config.js';

// Category labels
const CATEGORY_LABELS = {
  'loi': 'Lỗi',
  'vi-sao': 'Vì sao',
  'meo': 'Mẹo',
  'huong-dan': 'Hướng dẫn'
};

// ========== DOM Ready ==========
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// ========== Initialize App ==========
async function initApp() {
  const path = window.location.pathname;
  
  if (path === '/' || path === '/index.html' || path.endsWith('/index.html')) {
    await loadHomePage();
  } else if (path.includes('/article.html')) {
    await loadArticlePage();
  }
  
  initSearch();
}

// ========== Home Page ==========
async function loadHomePage() {
  await Promise.all([
    loadArticlesByCategory('errorArticles', 'loi'),
    loadArticlesByCategory('tipsArticles', 'meo'),
    loadLatestArticles('latestArticles')
  ]);
}

async function loadArticlesByCategory(containerId, category) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  try {
    const articlesRef = collection(db, 'articles');
    const q = query(
      articlesRef,
      where('category', '==', category),
      where('status', '==', 'published'),
      limit(5)
    );
    
    const snapshot = await getDocs(q);
    const articles = [];
    
    snapshot.forEach(doc => {
      articles.push({ id: doc.id, ...doc.data() });
    });
    
    renderArticleList(container, articles);
  } catch (error) {
    console.error('Error loading articles:', error);
    container.innerHTML = '<p class="text-muted">Không thể tải bài viết.</p>';
  }
}

async function loadLatestArticles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  try {
    const articlesRef = collection(db, 'articles');
    const q = query(
      articlesRef,
      where('status', '==', 'published'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    const articles = [];
    
    snapshot.forEach(doc => {
      articles.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by createdAt
    articles.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    renderArticleList(container, articles.slice(0, 5));
  } catch (error) {
    console.error('Error loading latest articles:', error);
    container.innerHTML = '<p class="text-muted">Không thể tải bài viết.</p>';
  }
}

// ========== Article Page ==========
async function loadArticlePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  const slug = urlParams.get('slug');
  
  // Handle old slug URLs
  if (slug && !articleId) {
    showArticleError('Bài viết này đã bị xóa hoặc chuyển sang địa chỉ mới. Vui lòng tìm kiếm bài viết tương tự trên trang chủ.');
    return;
  }
  
  if (!articleId) {
    showArticleError('Không tìm thấy bài viết.');
    return;
  }
  
  try {
    const articleRef = doc(db, 'articles', articleId);
    const snapshot = await getDoc(articleRef);
    
    if (!snapshot.exists()) {
      showArticleError('Bài viết không tồn tại.');
      return;
    }
    
    const article = { id: snapshot.id, ...snapshot.data() };
    renderArticle(article);
    
    // Increment view count
    incrementViews(articleRef, article.views || 0);
    
    // Load related articles
    await loadRelatedArticles(article.category, articleId);
  } catch (error) {
    console.error('Error loading article:', error);
    showArticleError('Không thể tải bài viết.');
  }
}

// Increment views (fire and forget)
async function incrementViews(articleRef, currentViews) {
  try {
    await updateDoc(articleRef, {
      views: (currentViews || 0) + 1
    });
  } catch (error) {
    // Silently fail - view count is not critical
    console.warn('Could not increment views:', error);
  }
}

async function loadRelatedArticles(category, excludeId) {
  const container = document.getElementById('relatedArticles');
  if (!container) return;
  
  try {
    const articlesRef = collection(db, 'articles');
    const q = query(
      articlesRef,
      where('category', '==', category),
      where('status', '==', 'published'),
      limit(4)
    );
    
    const snapshot = await getDocs(q);
    const articles = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== excludeId) {
        articles.push({ id: doc.id, ...doc.data() });
      }
    });
    
    if (articles.length > 0) {
      renderArticleList(container, articles.slice(0, 3));
    } else {
      container.innerHTML = '<p class="text-muted">Chưa có bài viết liên quan.</p>';
    }
  } catch (error) {
    console.error('Error loading related articles:', error);
    container.innerHTML = '<p class="text-muted">Không thể tải bài viết liên quan.</p>';
  }
}

// ========== Render Functions ==========
function renderArticleList(container, articles) {
  if (articles.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <p class="no-data-text">Chưa có bài viết nào.</p>
      </div>
    `;
    return;
  }
  
  // Default placeholder image if no heroImage
  const defaultThumb = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="140" height="95" fill="%23E2E8F0"%3E%3Crect width="140" height="95"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394A3B8" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
  
  container.innerHTML = articles.map(article => {
    const thumbSrc = (article.heroImage && article.heroImage.trim()) ? article.heroImage : defaultThumb;
    const categoryLabel = CATEGORY_LABELS[article.category] || article.category || 'Bài viết';
    
    return `
      <a href="/article.html?id=${article.id}" class="article-card">
        <div class="article-card-thumb-wrap">
          <img src="${thumbSrc}" alt="${escapeHtml(article.title)}" class="article-card-thumb" loading="lazy">
          <span class="article-card-category">${categoryLabel}</span>
        </div>
        <div class="article-card-body">
          <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
          ${article.description ? `<p class="article-card-desc">${escapeHtml(article.description)}</p>` : ''}
        </div>
      </a>
    `;
  }).join('');
}


function renderArticle(article) {
  // Update page title and meta
  const pageTitleEl = document.getElementById('pageTitle');
  const pageDescEl = document.getElementById('pageDescription');
  const pageCanonicalEl = document.getElementById('pageCanonical');
  
  const articleTitle = `${article.title} | VietShare`;
  const articleDesc = article.description || '';
  const articleUrl = `https://vietshare.site/article.html?id=${article.id}`;
  const articleImage = article.heroImage || 'https://vietshare.site/assets/og-image.png';
  
  if (pageTitleEl) pageTitleEl.textContent = articleTitle;
  if (pageDescEl) pageDescEl.content = articleDesc;
  if (pageCanonicalEl) pageCanonicalEl.href = articleUrl;
  
  // Update Open Graph meta tags
  const ogUrl = document.getElementById('ogUrl');
  const ogTitle = document.getElementById('ogTitle');
  const ogDescription = document.getElementById('ogDescription');
  const ogImage = document.getElementById('ogImage');
  
  if (ogUrl) ogUrl.content = articleUrl;
  if (ogTitle) ogTitle.content = articleTitle;
  if (ogDescription) ogDescription.content = articleDesc;
  if (ogImage) ogImage.content = articleImage;
  
  // Update Twitter meta tags
  const twitterUrl = document.getElementById('twitterUrl');
  const twitterTitle = document.getElementById('twitterTitle');
  const twitterDescription = document.getElementById('twitterDescription');
  const twitterImage = document.getElementById('twitterImage');
  
  if (twitterUrl) twitterUrl.content = articleUrl;
  if (twitterTitle) twitterTitle.content = articleTitle;
  if (twitterDescription) twitterDescription.content = articleDesc;
  if (twitterImage) twitterImage.content = articleImage;
  
  // Update document title
  document.title = articleTitle;
  
  // Update article header
  const categoryEl = document.getElementById('articleCategory');
  const titleEl = document.getElementById('articleTitle');
  const metaEl = document.getElementById('articleMeta');
  
  if (categoryEl) categoryEl.textContent = CATEGORY_LABELS[article.category] || article.category;
  if (titleEl) titleEl.textContent = article.title;
  // Hide date on public page (only show in admin)
  if (metaEl) metaEl.style.display = 'none';
  
  // Update hero image
  const heroImg = document.getElementById('articleHero');
  if (heroImg && article.heroImage) {
    heroImg.src = article.heroImage;
    heroImg.alt = article.title;
    heroImg.style.display = 'block';
  }
  
  // Update content
  const contentContainer = document.getElementById('articleContent');
  if (contentContainer) {
    if (article.content && article.content.trim()) {
      contentContainer.innerHTML = article.content;
    } else {
      contentContainer.innerHTML = `
        <div class="info-box warning-box">
          <p class="info-box-title">Nội dung đang được cập nhật</p>
          <p>Bài viết này chưa có nội dung. Vui lòng quay lại sau.</p>
        </div>
      `;
    }
  }
  
  // Generate TOC
  generateTOC();
  
  // Update schema
  updateArticleSchema(article);
}

function generateTOC() {
  const content = document.getElementById('articleContent');
  const tocContainer = document.getElementById('tocContainer');
  const tocList = document.getElementById('tocList');
  
  if (!content || !tocContainer || !tocList) return;
  
  const headings = content.querySelectorAll('h2');
  
  if (headings.length === 0) {
    tocContainer.style.display = 'none';
    return;
  }
  
  let tocHTML = '';
  headings.forEach((heading, index) => {
    const id = `section-${index}`;
    heading.id = id;
    tocHTML += `<li><a href="#${id}">${heading.textContent}</a></li>`;
  });
  
  tocList.innerHTML = tocHTML;
  tocContainer.style.display = 'block';
}

function updateArticleSchema(article) {
  const schemaEl = document.getElementById('articleSchema');
  if (!schemaEl) return;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": article.title,
    "description": article.description || '',
    "image": article.heroImage || '',
    "datePublished": formatISODate(article.createdAt),
    "dateModified": formatISODate(article.updatedAt || article.createdAt),
    "author": {
      "@type": "Organization",
      "name": "VietShare"
    }
  };
  
  schemaEl.textContent = JSON.stringify(schema);
}

// ========== Search ==========
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
      }
    }
  });
}

// ========== Utilities ==========
function formatDate(timestamp) {
  if (!timestamp) return 'Mới cập nhật';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Mới cập nhật';
  }
}

function formatISODate(timestamp) {
  if (!timestamp) return new Date().toISOString();
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showArticleError(message) {
  const titleEl = document.getElementById('articleTitle');
  const contentEl = document.getElementById('articleContent');
  const categoryEl = document.getElementById('articleCategory');
  
  if (titleEl) titleEl.textContent = 'Lỗi';
  if (categoryEl) categoryEl.style.display = 'none';
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="info-box error-box">
        <p class="info-box-title">Không thể tải bài viết</p>
        <p>${message}</p>
        <a href="/" class="btn btn-primary mt-md">← Về trang chủ</a>
      </div>
    `;
  }
}

// Dark mode is handled by js/dark-mode.js
