// ============================================
// VietShare Blog - Article Page Logic
// ============================================

(function() {
  'use strict';

  const { db, formatDate, formatRelativeTime, getReadingTime, showToast, getCategoryInfo } = window.VietShare;

  const elements = {
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    menuToggle: document.getElementById('menuToggle'),
    navMenu: document.getElementById('navMenu'),
    searchBtn: document.getElementById('searchBtn'),
    searchModal: document.getElementById('searchModal'),
    searchModalClose: document.getElementById('searchModalClose'),
    articleContainer: document.getElementById('articleContainer'),
    articleLoading: document.getElementById('articleLoading'),
    relatedPosts: document.getElementById('relatedPosts'),
    backToTop: document.getElementById('backToTop'),
    readingProgress: document.getElementById('readingProgress')
  };

  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    if (!elements.themeIcon) return;
    elements.themeIcon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
  }

  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (elements.backToTop) {
      elements.backToTop.classList.toggle('visible', scrollTop > 500);
    }
    if (elements.readingProgress) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      elements.readingProgress.style.width = `${(scrollTop / docHeight) * 100}%`;
    }
  }

  function getSlugFromURL() {
    return new URLSearchParams(window.location.search).get('slug');
  }

  async function fetchArticle(slug) {
    if (!slug) { showError('Không tìm thấy bài viết'); return; }

    try {
      const snapshot = await db.collection('articles').where('slug', '==', slug).limit(1).get();
      if (snapshot.empty) {
        const demo = getDemoArticle(slug);
        if (demo) { renderArticle(demo); fetchRelatedPosts(demo.category, demo.id); }
        else showError('Bài viết không tồn tại');
        return;
      }
      const article = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      db.collection('articles').doc(article.id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
      renderArticle(article);
      fetchRelatedPosts(article.category, article.id);
    } catch (error) {
      const demo = getDemoArticle(slug);
      if (demo) { renderArticle(demo); fetchRelatedPosts(demo.category, demo.id); }
      else showError('Không thể tải bài viết');
    }
  }

  function getDemoArticle(slug) {
    const articles = {
      'huong-dan-tai-cai-dat-windows-11': {
        id: '1', title: 'Hướng dẫn tải và cài đặt Windows 11 miễn phí từ Microsoft',
        slug: 'huong-dan-tai-cai-dat-windows-11',
        content: '<h2>Yêu cầu hệ thống</h2><p>CPU 1GHz, RAM 4GB, TPM 2.0...</p><h2>Bước 1</h2><p>Tải file ISO từ Microsoft...</p>',
        category: 'cong-nghe', tags: ['Windows', 'Microsoft'],
        thumbnail: 'https://images.unsplash.com/photo-1624571409108-e9a41746af53?w=1200&q=80',
        author: 'VietShare', publishedAt: new Date(Date.now() - 86400000), views: 1250
      }
    };
    return articles[slug] || null;
  }

  function renderArticle(article) {
    if (!elements.articleContainer) return;
    if (elements.articleLoading) elements.articleLoading.style.display = 'none';

    const cat = getCategoryInfo(article.category);
    const readTime = getReadingTime(article.content);
    document.title = `${article.title} - VietShare`;

    elements.articleContainer.innerHTML = `
      <header class="article-header">
        <a href="category.html?cat=${article.category}" class="article-category">${cat.name}</a>
        <h1 class="article-title">${article.title}</h1>
        <div class="article-meta">
          <div class="article-meta-item"><i data-lucide="calendar"></i><span>${formatDate(article.publishedAt)}</span></div>
          <div class="article-meta-item"><i data-lucide="clock"></i><span>${readTime} phút đọc</span></div>
          <div class="article-meta-item"><i data-lucide="eye"></i><span>${article.views || 0} lượt xem</span></div>
        </div>
      </header>
      <img src="${article.thumbnail}" alt="${article.title}" class="article-cover">
      <div class="article-content">${article.content}</div>
      <div class="article-tags">${(article.tags || []).map(t => `<a href="category.html?tag=${t}" class="tag">#${t}</a>`).join('')}</div>
      <div class="share-section">
        <span>Chia sẻ:</span>
        <div class="share-buttons">
          <button class="share-btn facebook" onclick="window.open('https://facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank')"><i data-lucide="facebook"></i></button>
          <button class="share-btn twitter" onclick="window.open('https://twitter.com/intent/tweet?url='+encodeURIComponent(location.href),'_blank')"><i data-lucide="twitter"></i></button>
          <button class="share-btn copy" onclick="navigator.clipboard.writeText(location.href);VietShare.showToast('Đã sao chép!')"><i data-lucide="link"></i></button>
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  async function fetchRelatedPosts(category, excludeId) {
    if (!elements.relatedPosts) return;
    elements.relatedPosts.innerHTML = '<p style="color:var(--text-muted)">Đang tải...</p>';
    // Simplified - would fetch from Firestore in production
  }

  function showError(msg) {
    if (elements.articleLoading) elements.articleLoading.style.display = 'none';
    if (elements.articleContainer) {
      elements.articleContainer.innerHTML = `<div class="empty-state"><h2>${msg}</h2><a href="index.html" class="btn btn-primary">Về trang chủ</a></div>`;
    }
  }

  function init() {
    initTheme();
    elements.themeToggle?.addEventListener('click', toggleTheme);
    elements.menuToggle?.addEventListener('click', () => elements.navMenu?.classList.toggle('active'));
    elements.backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', handleScroll);
    fetchArticle(getSlugFromURL());
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
