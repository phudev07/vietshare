// ============================================
// VietShare Blog - Category Page Logic
// ============================================

(function() {
  'use strict';

  const { db, formatRelativeTime, getCategoryInfo, CATEGORIES } = window.VietShare;

  const elements = {
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    menuToggle: document.getElementById('menuToggle'),
    navMenu: document.getElementById('navMenu'),
    searchBtn: document.getElementById('searchBtn'),
    searchModal: document.getElementById('searchModal'),
    searchModalClose: document.getElementById('searchModalClose'),
    categoryIcon: document.getElementById('categoryIcon'),
    categoryTitle: document.getElementById('categoryTitle'),
    categoryDesc: document.getElementById('categoryDesc'),
    totalPosts: document.getElementById('totalPosts'),
    sortSelect: document.getElementById('sortSelect'),
    postsGrid: document.getElementById('postsGrid'),
    pagination: document.getElementById('pagination'),
    backToTop: document.getElementById('backToTop')
  };

  let state = {
    category: 'all',
    articles: [],
    currentPage: 1,
    perPage: 12,
    sort: 'newest'
  };

  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
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

  function getCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('cat') || 'all';
  }

  function updateCategoryHeader(cat) {
    const info = getCategoryInfo(cat);
    if (elements.categoryIcon) elements.categoryIcon.textContent = info.icon;
    if (elements.categoryTitle) elements.categoryTitle.textContent = info.name;
    if (elements.categoryDesc) elements.categoryDesc.textContent = info.desc;
    document.title = `${info.name} - VietShare`;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.href.includes(`cat=${cat}`));
    });
  }

  async function fetchArticles() {
    try {
      let query = db.collection('articles').orderBy('publishedAt', 'desc');
      if (state.category !== 'all') {
        query = query.where('category', '==', state.category);
      }
      const snapshot = await query.get();
      state.articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderPosts();
    } catch (error) {
      loadDemoData();
    }
  }

  function loadDemoData() {
    state.articles = [
      { id: '1', title: 'Hướng dẫn tải Windows 11', slug: 'huong-dan-tai-cai-dat-windows-11', category: 'cong-nghe', thumbnail: 'https://images.unsplash.com/photo-1624571409108-e9a41746af53?w=800&q=80', publishedAt: new Date(), views: 1250, author: 'VietShare' },
      { id: '2', title: '10 ứng dụng AI miễn phí 2024', slug: '10-ung-dung-ai-mien-phi-2024', category: 'cong-nghe', thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', publishedAt: new Date(), views: 980, author: 'VietShare' },
      { id: '3', title: 'Mẹo tiết kiệm pin iPhone', slug: 'meo-tiet-kiem-pin-iphone', category: 'meo-vat', thumbnail: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80', publishedAt: new Date(), views: 756, author: 'VietShare' }
    ];
    if (state.category !== 'all') {
      state.articles = state.articles.filter(a => a.category === state.category);
    }
    renderPosts();
  }

  function renderPosts() {
    if (!elements.postsGrid) return;
    
    let articles = [...state.articles];
    
    // Sort
    if (state.sort === 'oldest') articles.reverse();
    else if (state.sort === 'popular') articles.sort((a, b) => (b.views || 0) - (a.views || 0));
    
    if (elements.totalPosts) elements.totalPosts.textContent = articles.length;
    
    if (articles.length === 0) {
      elements.postsGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>Chưa có bài viết</p></div>';
      return;
    }

    const start = (state.currentPage - 1) * state.perPage;
    const paged = articles.slice(start, start + state.perPage);

    elements.postsGrid.innerHTML = paged.map(a => {
      const cat = getCategoryInfo(a.category);
      return `
        <article class="post-card">
          <a href="article.html?slug=${a.slug}" class="post-thumbnail">
            <img src="${a.thumbnail}" alt="${a.title}" loading="lazy">
            <span class="post-category-badge">${cat.name}</span>
          </a>
          <div class="post-content">
            <div class="post-meta">
              <span class="post-meta-item"><i data-lucide="calendar"></i>${formatRelativeTime(a.publishedAt)}</span>
              <span class="post-meta-item"><i data-lucide="eye"></i>${a.views || 0}</span>
            </div>
            <h3 class="post-title"><a href="article.html?slug=${a.slug}">${a.title}</a></h3>
          </div>
        </article>
      `;
    }).join('');

    renderPagination(articles.length);
    lucide.createIcons();
  }

  function renderPagination(total) {
    if (!elements.pagination) return;
    const pages = Math.ceil(total / state.perPage);
    if (pages <= 1) { elements.pagination.innerHTML = ''; return; }
    
    let html = `<button class="pagination-btn" ${state.currentPage === 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}"><i data-lucide="chevron-left"></i></button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="pagination-btn" ${state.currentPage === pages ? 'disabled' : ''} data-page="${state.currentPage + 1}"><i data-lucide="chevron-right"></i></button>`;
    elements.pagination.innerHTML = html;
    lucide.createIcons();
  }

  function init() {
    initTheme();
    state.category = getCategoryFromURL();
    updateCategoryHeader(state.category);
    
    elements.themeToggle?.addEventListener('click', toggleTheme);
    elements.menuToggle?.addEventListener('click', () => elements.navMenu?.classList.toggle('active'));
    elements.backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    elements.sortSelect?.addEventListener('change', (e) => { state.sort = e.target.value; state.currentPage = 1; renderPosts(); });
    elements.pagination?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pagination-btn');
      if (btn && !btn.disabled) { state.currentPage = parseInt(btn.dataset.page); renderPosts(); }
    });
    
    window.addEventListener('scroll', () => {
      elements.backToTop?.classList.toggle('visible', window.pageYOffset > 500);
    });

    fetchArticles();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
