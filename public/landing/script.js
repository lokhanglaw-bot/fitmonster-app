/* ============================================
   My Fit Monster — Landing Page Scripts
   ============================================ */

// Language state
let currentLang = 'en';

// Toggle language
function toggleLang() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  applyLang();
  localStorage.setItem('mfm-lang', currentLang);
}

// Apply language to all elements with data-en/data-zh attributes
function applyLang() {
  const html = document.documentElement;
  html.setAttribute('data-lang', currentLang);
  html.setAttribute('lang', currentLang === 'zh' ? 'zh-Hant' : 'en');

  // Update all translatable elements
  document.querySelectorAll('[data-en][data-zh]').forEach(el => {
    const text = el.getAttribute(`data-${currentLang}`);
    if (text) el.textContent = text;
  });

  // Update language toggle labels
  const nextLang = currentLang === 'en' ? '中文' : 'EN';
  const langLabel = document.getElementById('langLabel');
  const langLabelMobile = document.getElementById('langLabelMobile');
  if (langLabel) langLabel.textContent = nextLang;
  if (langLabelMobile) langLabelMobile.textContent = nextLang;

  // Update page title
  document.title = currentLang === 'zh'
    ? 'My Fit Monster — 你的健身冒險旅程'
    : 'My Fit Monster — Your Fitness Adventure Awaits';
}

// Mobile menu
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('mobileMenuBtn');
  menu.classList.toggle('open');
  btn.classList.toggle('active');
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('mobileMenuBtn');
  menu.classList.remove('open');
  btn.classList.remove('active');
}

// Navbar scroll effect
function handleScroll() {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

// Intersection Observer for fade-in animations
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Add fade-in class to animatable elements
  const animatableSelectors = [
    '.feature-card',
    '.step-card',
    '.monster-card',
    '.evolution-showcase',
    '.screenshot-item',
    '.download-content',
    '.section-header'
  ];

  animatableSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('fade-in');
      el.style.transitionDelay = `${i * 0.08}s`;
      observer.observe(el);
    });
  });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80; // navbar height
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved language
  const savedLang = localStorage.getItem('mfm-lang');
  if (savedLang) {
    currentLang = savedLang;
  } else {
    // Auto-detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang && (browserLang.startsWith('zh') || browserLang.startsWith('ZH'))) {
      currentLang = 'zh';
    }
  }
  applyLang();

  // Setup event listeners
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Init features
  initAnimations();
  initSmoothScroll();
  handleScroll();
});
