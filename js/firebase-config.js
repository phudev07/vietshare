// ============================================
// Firebase Configuration
// ============================================

// IMPORTANT: Replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBu3-PVLRzBTUr1hRtVyfdGUNtmHtH6dKA",
  authDomain: "web-blog-c753e.firebaseapp.com",
  projectId: "web-blog-c753e",
  storageBucket: "web-blog-c753e.firebasestorage.app",
  messagingSenderId: "198710672936",
  appId: "1:198710672936:web:6daac34add3ef15ab1ff1d",
  measurementId: "G-T3XL4RCMKT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence for faster loading
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.log('Persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.log('Persistence not supported by browser');
  }
});

// ============================================
// Cloudinary Configuration
// ============================================

// IMPORTANT: Replace with your Cloudinary config
const cloudinaryConfig = {
  cloudName: "dzppvmhyt",
  uploadPreset: "vietshare_blog" // Create an unsigned upload preset in Cloudinary
};

// ============================================
// Helper Functions
// ============================================

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return date.toLocaleDateString('vi-VN', options);
}

/**
 * Format relative time (e.g., "2 ngày trước")
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return formatDate(timestamp);
}

/**
 * Create slug from title
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 150) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get reading time estimate
 */
function getReadingTime(content) {
  if (!content) return 1;
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('visible');
  
  setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}

/**
 * Category mapping (default)
 */
let CATEGORIES = {
  'cong-nghe': { name: 'Công nghệ', icon: '🖥️', desc: 'Tin tức, hướng dẫn và review về công nghệ, phần mềm' },
  'tin-tuc': { name: 'Tin tức', icon: '📰', desc: 'Cập nhật tin tức mới nhất trong và ngoài nước' },
  'meo-vat': { name: 'Mẹo vặt', icon: '💡', desc: 'Mẹo hay và thủ thuật hữu ích cho cuộc sống' },
  'lifestyle': { name: 'Lifestyle', icon: '🌿', desc: 'Lối sống, sức khỏe và phong cách sống' },
  'huong-dan': { name: 'Hướng dẫn', icon: '📚', desc: 'Hướng dẫn chi tiết từ A đến Z' },
  'review': { name: 'Review', icon: '⭐', desc: 'Đánh giá sản phẩm, dịch vụ và trải nghiệm' }
};

/**
 * Load categories from Firestore (merge with defaults)
 */
async function loadCategories() {
  try {
    const snapshot = await db.collection('categories').get();
    snapshot.docs.forEach(doc => {
      CATEGORIES[doc.id] = doc.data();
    });
  } catch (e) {
    console.log('Using default categories');
  }
  return CATEGORIES;
}

/**
 * Get category info
 */
function getCategoryInfo(slug) {
  return CATEGORIES[slug] || { name: slug, icon: '📁', desc: '' };
}

/**
 * Article status constants
 */
const ARTICLE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published'
};

// ============================================
// Export for use in other files
// ============================================

window.VietShare = {
  db,
  auth,
  cloudinaryConfig,
  formatDate,
  formatRelativeTime,
  createSlug,
  truncateText,
  getReadingTime,
  showToast,
  getCategoryInfo,
  loadCategories,
  CATEGORIES,
  ARTICLE_STATUS
};

