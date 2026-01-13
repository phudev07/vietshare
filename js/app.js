// ============================================
// VietShare Blog - Main Application Logic
// ============================================

(function() {
  'use strict';

  const { db, formatDate, formatRelativeTime, truncateText, getReadingTime, showToast, getCategoryInfo, CATEGORIES } = window.VietShare;

  // ============================================
  // DOM Elements
  // ============================================
  const elements = {
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    
    // Navigation
    menuToggle: document.getElementById('menuToggle'),
    navMenu: document.getElementById('navMenu'),
    
    // Search
    searchBtn: document.getElementById('searchBtn'),
    searchModal: document.getElementById('searchModal'),
    searchModalInput: document.getElementById('searchModalInput'),
    searchModalClose: document.getElementById('searchModalClose'),
    searchResults: document.getElementById('searchResults'),
    heroSearchForm: document.getElementById('heroSearchForm'),
    heroSearchInput: document.getElementById('heroSearchInput'),
    
    // Content
    featuredPost: document.getElementById('featuredPost'),
    postsGrid: document.getElementById('postsGrid'),
    pagination: document.getElementById('pagination'),
    popularPosts: document.getElementById('popularPosts'),
    categoriesScroll: document.getElementById('categoriesScroll'),
    
    // Misc
    backToTop: document.getElementById('backToTop'),
    readingProgress: document.getElementById('readingProgress'),
    newsletterForm: document.getElementById('newsletterForm')
  };

  // ============================================
  // State
  // ============================================
  let state = {
    articles: [],
    currentCategory: 'all',
    currentPage: 1,
    articlesPerPage: 9,
    isLoading: false
  };

  // ============================================
  // Theme Management
  // ============================================
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    if (!elements.themeIcon) return;
    elements.themeIcon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
  }

  // ============================================
  // Mobile Menu
  // ============================================
  function toggleMobileMenu() {
    elements.navMenu?.classList.toggle('active');
  }

  // ============================================
  // Search
  // ============================================
  function openSearch() {
    if (elements.searchModal) {
      elements.searchModal.style.display = 'flex';
      elements.searchModal.classList.add('active');
    }
    elements.searchModalInput?.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    if (elements.searchModal) {
      elements.searchModal.classList.remove('active');
      elements.searchModal.style.display = 'none';
    }
    document.body.style.overflow = '';
    if (elements.searchModalInput) elements.searchModalInput.value = '';
    if (elements.searchResults) elements.searchResults.innerHTML = '';
  }

  async function handleSearch(query) {
    if (!query || query.length < 2) {
      if (elements.searchResults) elements.searchResults.innerHTML = '';
      return;
    }

    const queryLower = query.toLowerCase();
    
    try {
      // Search in cached articles first
      const results = state.articles.filter(article => 
        article.title?.toLowerCase().includes(queryLower) ||
        article.excerpt?.toLowerCase().includes(queryLower) ||
        article.tags?.some(tag => tag.toLowerCase().includes(queryLower))
      ).slice(0, 5);

      renderSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  function renderSearchResults(results) {
    if (!elements.searchResults) return;

    if (results.length === 0) {
      elements.searchResults.innerHTML = `
        <div class="empty-state" style="padding: 2rem;">
          <p>Không tìm thấy kết quả</p>
        </div>
      `;
      return;
    }

    elements.searchResults.innerHTML = results.map(article => `
      <a href="article.html?slug=${article.slug}" class="search-result-item">
        <img src="${article.thumbnail || 'https://via.placeholder.com/60x45'}" alt="" class="search-result-thumb">
        <div>
          <div class="search-result-title">${article.title}</div>
          <div class="search-result-category">${getCategoryInfo(article.category).name}</div>
        </div>
      </a>
    `).join('');
  }

  // ============================================
  // Back to Top & Reading Progress
  // ============================================
  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Back to top visibility
    if (elements.backToTop) {
      elements.backToTop.classList.toggle('visible', scrollTop > 500);
    }
    
    // Reading progress
    if (elements.readingProgress) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      elements.readingProgress.style.width = `${progress}%`;
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================
  // Fetch Articles from Firestore
  // ============================================
  async function fetchArticles() {
    // Return cached data if available
    if (state.articles.length > 0) {
      renderFeaturedPost();
      renderPosts();
      renderPopularPosts();
      renderPopularTags();
      return;
    }
    
    state.isLoading = true;
    
    try {
      // Limit to 50 articles for faster initial load
      const snapshot = await db.collection('articles')
        .where('status', '==', 'published')
        .orderBy('publishedAt', 'desc')
        .limit(50)
        .get();
      
      state.articles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      updateCategoryCounts();
      renderFeaturedPost();
      renderPosts();
      renderPopularPosts();
      renderPopularTags();
      
    } catch (error) {
      console.error('Error fetching articles:', error);
      
      // Fallback: try without composite index requirement
      if (error.code === 'failed-precondition') {
        try {
          const snapshot = await db.collection('articles')
            .orderBy('publishedAt', 'desc')
            .limit(50)
            .get();
          
          state.articles = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(article => article.status !== 'draft');
          
          updateCategoryCounts();
          renderFeaturedPost();
          renderPosts();
          renderPopularPosts();
          renderPopularTags();
          return;
        } catch (e) {
          console.error('Fallback also failed:', e);
        }
      }
      
      // Show demo content if Firebase is not configured
      if (error.code === 'permission-denied' || error.message.includes('API key')) {
        loadDemoData();
      } else {
        showEmptyState('Không thể tải bài viết. Vui lòng thử lại sau.');
      }
    } finally {
      state.isLoading = false;
    }
  }

  // ============================================
  // Demo Data (for testing without Firebase)
  // ============================================
  function loadDemoData() {
    state.articles = [
      {
        id: '1',
        title: 'Hướng dẫn tải và cài đặt Windows 11 miễn phí từ Microsoft',
        slug: 'huong-dan-tai-cai-dat-windows-11',
        excerpt: 'Hướng dẫn chi tiết cách tải file ISO Windows 11 chính thức từ Microsoft và cài đặt trên máy tính của bạn một cách dễ dàng.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'cong-nghe',
        tags: ['Windows', 'Hướng dẫn', 'Microsoft'],
        thumbnail: 'https://images.unsplash.com/photo-1624571409108-e9a41746af53?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 86400000),
        views: 1250,
        featured: true
      },
      {
        id: '2',
        title: '10 ứng dụng AI miễn phí tốt nhất năm 2024',
        slug: '10-ung-dung-ai-mien-phi-2024',
        excerpt: 'Danh sách các ứng dụng trí tuệ nhân tạo miễn phí giúp tăng năng suất làm việc và học tập hàng ngày.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'cong-nghe',
        tags: ['AI', 'Ứng dụng', 'Miễn phí'],
        thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 172800000),
        views: 980,
        featured: false
      },
      {
        id: '3',
        title: 'Mẹo tiết kiệm pin iPhone hiệu quả mà ít người biết',
        slug: 'meo-tiet-kiem-pin-iphone',
        excerpt: 'Những thủ thuật đơn giản nhưng cực kỳ hiệu quả giúp kéo dài thời lượng pin iPhone của bạn.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'meo-vat',
        tags: ['iPhone', 'Pin', 'Mẹo'],
        thumbnail: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 259200000),
        views: 756,
        featured: false
      },
      {
        id: '4',
        title: 'Review chi tiết Galaxy S24 Ultra sau 1 tháng sử dụng',
        slug: 'review-galaxy-s24-ultra',
        excerpt: 'Đánh giá toàn diện Samsung Galaxy S24 Ultra với camera AI, Galaxy AI và hiệu năng thực tế.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'review',
        tags: ['Samsung', 'Galaxy', 'Review'],
        thumbnail: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 345600000),
        views: 1520,
        featured: false
      },
      {
        id: '5',
        title: '5 thói quen buổi sáng giúp tăng năng suất làm việc',
        slug: 'thoi-quen-buoi-sang-tang-nang-suat',
        excerpt: 'Những thói quen đơn giản mỗi buổi sáng có thể thay đổi hoàn toàn năng suất làm việc của bạn.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'lifestyle',
        tags: ['Lifestyle', 'Năng suất', 'Thói quen'],
        thumbnail: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 432000000),
        views: 623,
        featured: false
      },
      {
        id: '6',
        title: 'Tin nóng: Apple sắp ra mắt iPhone SE 4 với thiết kế mới',
        slug: 'apple-iphone-se-4-thiet-ke-moi',
        excerpt: 'Apple dự kiến ra mắt iPhone SE thế hệ mới với thiết kế giống iPhone 14 và chip A16 Bionic.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'tin-tuc',
        tags: ['Apple', 'iPhone', 'Tin tức'],
        thumbnail: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 518400000),
        views: 892,
        featured: false
      },
      {
        id: '7',
        title: 'Cách tải video TikTok không có logo watermark',
        slug: 'tai-video-tiktok-khong-logo',
        excerpt: 'Hướng dẫn nhiều cách tải video TikTok về điện thoại và máy tính mà không có logo chìm.',
        content: '<p>Nội dung bài viết...</p>',
        category: 'huong-dan',
        tags: ['TikTok', 'Download', 'Hướng dẫn'],
        thumbnail: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
        author: 'VietShare',
        publishedAt: new Date(Date.now() - 604800000),
        views: 2100,
        featured: false
      }
    ];

    updateCategoryCounts();
    renderFeaturedPost();
    renderPosts();
    renderPopularPosts();
    renderPopularTags();
    
    console.log('Demo data loaded. Configure Firebase to use real data.');
  }

  // ============================================
  // Update Category Counts
  // ============================================
  function updateCategoryCounts() {
    const counts = { all: state.articles.length };
    const cats = window.VietShare?.CATEGORIES || CATEGORIES;
    
    Object.keys(cats).forEach(cat => {
      counts[cat] = state.articles.filter(a => a.category === cat).length;
    });

    // Update count badges dynamically
    const countAll = document.getElementById('countAll');
    if (countAll) countAll.textContent = counts.all;
    
    Object.keys(cats).forEach(cat => {
      const countEl = document.getElementById(`count-${cat}`);
      if (countEl) {
        countEl.textContent = counts[cat] || 0;
        // Hide categories with 0 articles to avoid AdSense policy violation
        const tabEl = countEl.closest('.category-tab');
        if (tabEl) {
          tabEl.style.display = (counts[cat] || 0) > 0 ? '' : 'none';
        }
      }
    });
  }

  // ============================================
  // Render Featured Post
  // ============================================
  function renderFeaturedPost() {
    if (!elements.featuredPost) return;

    const featured = state.articles.find(a => a.featured) || state.articles[0];
    
    if (!featured) {
      elements.featuredPost.innerHTML = '<div class="empty-state">Chưa có bài viết nổi bật</div>';
      return;
    }

    const categoryInfo = getCategoryInfo(featured.category);
    
    elements.featuredPost.innerHTML = `
      <a href="article.html?slug=${featured.slug}" class="post-thumbnail">
        <img src="${featured.thumbnail || 'https://via.placeholder.com/800x500'}" alt="${featured.title}" loading="lazy" decoding="async">
        <span class="post-category-badge">${categoryInfo.name}</span>
      </a>
      <div class="post-content">
        <div class="post-meta">
          <span class="post-meta-item">
            <i data-lucide="calendar"></i>
            ${formatRelativeTime(featured.publishedAt)}
          </span>
          <span class="post-meta-item">
            <i data-lucide="clock"></i>
            ${getReadingTime(featured.content)} phút đọc
          </span>
          <span class="post-meta-item">
            <i data-lucide="eye"></i>
            ${featured.views || 0} lượt xem
          </span>
        </div>
        <h2 class="post-title">
          <a href="article.html?slug=${featured.slug}">${featured.title}</a>
        </h2>
        <p class="post-excerpt">${featured.excerpt || truncateText(featured.content, 200)}</p>
        <div class="post-footer">
          <div class="post-tags">
            ${(featured.tags || []).slice(0, 3).map(tag => `<span class="post-tag">${tag}</span>`).join('')}
          </div>
          <a href="article.html?slug=${featured.slug}" class="post-read-more">
            Đọc tiếp
            <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </div>
    `;
    
    lucide.createIcons();
  }

  // ============================================
  // Render Posts Grid
  // ============================================
  function renderPosts() {
    if (!elements.postsGrid) return;

    // Filter by category
    let filteredArticles = state.currentCategory === 'all' 
      ? state.articles 
      : state.articles.filter(a => a.category === state.currentCategory);

    // Skip featured post in grid
    const featuredId = (state.articles.find(a => a.featured) || state.articles[0])?.id;
    filteredArticles = filteredArticles.filter(a => a.id !== featuredId);

    if (filteredArticles.length === 0) {
      elements.postsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📭</div>
          <p>Chưa có bài viết trong danh mục này</p>
        </div>
      `;
      if (elements.pagination) elements.pagination.innerHTML = '';
      return;
    }

    // Pagination
    const startIndex = (state.currentPage - 1) * state.articlesPerPage;
    const paginatedArticles = filteredArticles.slice(startIndex, startIndex + state.articlesPerPage);

    elements.postsGrid.innerHTML = paginatedArticles.map(article => createPostCard(article)).join('');
    
    renderPagination(filteredArticles.length);
    lucide.createIcons();
  }

  function createPostCard(article) {
    const categoryInfo = getCategoryInfo(article.category);
    
    // List-style horizontal layout
    return `
      <article class="post-list-item">
        <a href="article.html?slug=${article.slug}" class="post-list-thumb">
          <img src="${article.thumbnail || 'https://via.placeholder.com/200x140'}" alt="${article.title}" loading="lazy">
        </a>
        <div class="post-list-content">
          <span class="post-list-category">${categoryInfo.name}</span>
          <h3 class="post-list-title">
            <a href="article.html?slug=${article.slug}">${article.title}</a>
          </h3>
          <p class="post-list-excerpt">${article.excerpt || truncateText(article.content, 150)}</p>
          <div class="post-list-meta">
            <span><i data-lucide="calendar"></i> ${formatRelativeTime(article.publishedAt)}</span>
            <span><i data-lucide="eye"></i> ${article.views || 0} lượt xem</span>
          </div>
        </div>
      </article>
    `;
  }

  // ============================================
  // Render Pagination
  // ============================================
  function renderPagination(totalItems) {
    if (!elements.pagination) return;

    const totalPages = Math.ceil(totalItems / state.articlesPerPage);
    
    if (totalPages <= 1) {
      elements.pagination.innerHTML = '';
      return;
    }

    let html = '';
    
    // Previous button
    html += `
      <button class="pagination-btn" ${state.currentPage === 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">
        <i data-lucide="chevron-left"></i>
      </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= state.currentPage - 1 && i <= state.currentPage + 1)) {
        html += `
          <button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === state.currentPage - 2 || i === state.currentPage + 2) {
        html += '<span class="pagination-btn">...</span>';
      }
    }
    
    // Next button
    html += `
      <button class="pagination-btn" ${state.currentPage === totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">
        <i data-lucide="chevron-right"></i>
      </button>
    `;
    
    elements.pagination.innerHTML = html;
    lucide.createIcons();
  }

  // ============================================
  // Render Popular Posts
  // ============================================
  function renderPopularPosts() {
    if (!elements.popularPosts) return;

    const popular = [...state.articles]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    if (popular.length === 0) {
      elements.popularPosts.innerHTML = '<p style="color: var(--text-muted);">Chưa có dữ liệu</p>';
      return;
    }

    elements.popularPosts.innerHTML = popular.map(article => `
      <a href="article.html?slug=${article.slug}" class="popular-post">
        <img src="${article.thumbnail || 'https://via.placeholder.com/80x60'}" alt="" class="popular-post-thumb" loading="lazy">
        <div class="popular-post-content">
          <h4 class="popular-post-title">${article.title}</h4>
          <span class="popular-post-meta">${article.views || 0} lượt xem</span>
        </div>
      </a>
    `).join('');
  }

  // ============================================
  // Show Empty State
  // ============================================
  function showEmptyState(message) {
    if (elements.postsGrid) {
      elements.postsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">😕</div>
          <p>${message}</p>
        </div>
      `;
    }
  }

  // ============================================
  // Category Filter
  // ============================================
  function handleCategoryClick(event) {
    const tab = event.target.closest('.category-tab');
    if (!tab) return;

    // Update active state
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update filter
    state.currentCategory = tab.dataset.category;
    state.currentPage = 1;
    renderPosts();
  }

  // ============================================
  // Pagination Handler
  // ============================================
  function handlePaginationClick(event) {
    const btn = event.target.closest('.pagination-btn');
    if (!btn || btn.disabled || btn.textContent === '...') return;

    state.currentPage = parseInt(btn.dataset.page);
    renderPosts();
    
    // Scroll to top of posts
    elements.postsGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============================================
  // Newsletter Form
  // ============================================
  function handleNewsletterSubmit(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    
    if (email) {
      showToast('Đăng ký thành công! Cảm ơn bạn.');
      event.target.reset();
    }
  }

  // ============================================
  // Event Listeners
  // ============================================
  function initEventListeners() {
    // Theme toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);
    
    // Mobile menu
    elements.menuToggle?.addEventListener('click', toggleMobileMenu);
    
    // Search
    elements.searchBtn?.addEventListener('click', openSearch);
    elements.searchModalClose?.addEventListener('click', closeSearch);
    elements.searchModal?.addEventListener('click', (e) => {
      if (e.target === elements.searchModal) closeSearch();
    });
    elements.searchModalInput?.addEventListener('input', (e) => handleSearch(e.target.value));
    
    // Hero search
    elements.heroSearchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = elements.heroSearchInput?.value;
      if (query) {
        openSearch();
        if (elements.searchModalInput) elements.searchModalInput.value = query;
        handleSearch(query);
      }
    });
    
    // Back to top
    elements.backToTop?.addEventListener('click', scrollToTop);
    
    // Scroll events
    window.addEventListener('scroll', handleScroll);
    
    // Category tabs
    elements.categoriesScroll?.addEventListener('click', handleCategoryClick);
    
    // Drag to scroll for categories (desktop)
    if (elements.categoriesScroll) {
      let isDown = false;
      let startX;
      let scrollLeft;
      
      elements.categoriesScroll.addEventListener('mousedown', (e) => {
        isDown = true;
        elements.categoriesScroll.style.cursor = 'grabbing';
        startX = e.pageX - elements.categoriesScroll.offsetLeft;
        scrollLeft = elements.categoriesScroll.scrollLeft;
      });
      
      elements.categoriesScroll.addEventListener('mouseleave', () => {
        isDown = false;
        elements.categoriesScroll.style.cursor = 'grab';
      });
      
      elements.categoriesScroll.addEventListener('mouseup', () => {
        isDown = false;
        elements.categoriesScroll.style.cursor = 'grab';
      });
      
      elements.categoriesScroll.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - elements.categoriesScroll.offsetLeft;
        const walk = (x - startX) * 2;
        elements.categoriesScroll.scrollLeft = scrollLeft - walk;
      });
      
      elements.categoriesScroll.style.cursor = 'grab';
    }
    
    // Pagination
    elements.pagination?.addEventListener('click', handlePaginationClick);
    
    // Newsletter
    elements.newsletterForm?.addEventListener('submit', handleNewsletterSubmit);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        openSearch();
      }
    });
  }

  // ============================================
  // Initialize App
  // ============================================
  async function loadNavbarCategories() {
    const navMenu = document.getElementById('navMenu');
    const categoriesScroll = document.getElementById('categoriesScroll');
    
    try {
      // Use loadCategories from firebase-config.js
      await window.VietShare.loadCategories();
      const cats = window.VietShare.CATEGORIES;
      
      // Add category links to nav (first 4 only)
      if (navMenu) {
        Object.keys(cats).slice(0, 4).forEach(key => {
          const cat = cats[key];
          const li = document.createElement('li');
          li.innerHTML = `<a href="category.html?cat=${key}" class="nav-link">${cat.name}</a>`;
          navMenu.appendChild(li);
        });
      }
      
      // Add all category tabs to categories-section
      if (categoriesScroll) {
        Object.keys(cats).forEach(key => {
          const cat = cats[key];
          const btn = document.createElement('button');
          btn.className = 'category-tab';
          btn.setAttribute('data-category', key);
          btn.innerHTML = `${cat.icon || '📁'} ${cat.name} <span class="count" id="count-${key}">0</span>`;
          categoriesScroll.appendChild(btn);
        });
        
        // Re-attach click handlers for new tabs
        categoriesScroll.querySelectorAll('.category-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            categoriesScroll.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentCategory = tab.dataset.category;
            state.currentPage = 1;
            renderPosts();
          });
        });
      }
    } catch (e) {
      console.log('Using default categories');
    }
  }

  // Render popular tags sorted by article count
  function renderPopularTags() {
    const tagsCloud = document.getElementById('tagsCloud');
    if (!tagsCloud || state.articles.length === 0) return;
    
    // Count tags (case-insensitive)
    const tagCounts = {};
    state.articles.forEach(article => {
      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          if (!tagCounts[lowerTag]) {
            tagCounts[lowerTag] = { count: 0, display: tag };
          }
          tagCounts[lowerTag].count++;
        });
      }
    });
    
    // Sort by count (descending) and take top 8
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
    
    if (sortedTags.length === 0) {
      tagsCloud.innerHTML = '<span style="color:var(--text-muted)">Chưa có thẻ</span>';
      return;
    }
    
    tagsCloud.innerHTML = sortedTags.map(([key, data]) => 
      `<a href="category.html?tag=${encodeURIComponent(key)}" class="tag">${data.display}</a>`
    ).join('');
  }

  async function init() {
    initTheme();
    initEventListeners();
    // Load categories and articles in parallel for faster startup
    await Promise.all([
      loadNavbarCategories(),
      fetchArticles()
    ]);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
