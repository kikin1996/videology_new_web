/* ═══════════════════════════════════════════════════════
   VIDEOLOGY.CZ — Main JS
   ═══════════════════════════════════════════════════════ */

// ── Hero background video (force autoplay) ────────────
const heroVideo = document.querySelector('.hero-video');

if (heroVideo) {
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;

  const tryPlay = () => heroVideo.play().catch(() => {});

  tryPlay();
  heroVideo.addEventListener('loadedmetadata', tryPlay);
  heroVideo.addEventListener('canplay', tryPlay);
  document.addEventListener('click', tryPlay, { once: true });
}


// ── Navbar scroll effect ──────────────────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 24);
}, { passive: true });


// ── Nav dropdown (Služby) ──────────────────────────────
document.querySelectorAll('.nav-dropdown-trigger').forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.preventDefault();
    const dropdown = trigger.closest('.nav-dropdown');
    const wasOpen = dropdown.classList.contains('open');
    document.querySelectorAll('.nav-dropdown.open').forEach(dd => dd.classList.remove('open'));
    if (!wasOpen) dropdown.classList.add('open');
  });
});

document.addEventListener('click', e => {
  document.querySelectorAll('.nav-dropdown.open').forEach(dd => {
    if (!dd.contains(e.target)) dd.classList.remove('open');
  });
});


// ── Mobile menu toggle ────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    document.body.style.overflow = '';
  });
});


// ── Smooth scroll for anchor links ───────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});


// ── Scroll-reveal (fade-up) ───────────────────────────
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));


// ── Counter animation ─────────────────────────────────
function animateCounter(el) {
  const target   = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const fps      = 60;
  const steps    = Math.round(duration / (1000 / fps));
  let current    = 0;
  let frame      = 0;

  const tick = () => {
    frame++;
    const progress = frame / steps;
    // easeOutExpo
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    current = Math.round(ease * target);
    el.textContent = current;
    if (frame < steps) requestAnimationFrame(tick);
    else el.textContent = target;
  };
  requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-number').forEach(animateCounter);
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) statsObserver.observe(statsSection);


// ── Contact form ──────────────────────────────────────
const contactForm   = document.getElementById('contactForm');
const submitBtn     = document.getElementById('submitBtn');
const packageSelect = document.getElementById('packageSelect');

// "Objednat" buttons on the package rows (this page or Ceník) pre-select
// the matching package in the contact form below / on the next page.
document.querySelectorAll('.plan-order-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pkg = btn.dataset.package;
    if (!pkg) return;
    if (packageSelect) packageSelect.value = pkg;
    else sessionStorage.setItem('videology_package', pkg);
  });
});
if (packageSelect) {
  const pendingPackage = sessionStorage.getItem('videology_package');
  if (pendingPackage) {
    packageSelect.value = pendingPackage;
    sessionStorage.removeItem('videology_package');
  }
}

// ── Booking calendar (month view + time slots, no live availability check) ──
const calGrid        = document.getElementById('calGrid');
const calTitle       = document.getElementById('calTitle');
const calPrev        = document.getElementById('calPrev');
const calNext        = document.getElementById('calNext');
const bookingTimesEl = document.getElementById('bookingTimes');
const bookingSummary = document.getElementById('bookingSummary');
const bookingInput   = document.getElementById('bookingTerminInput');

const MONTH_FULL_CZ = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
const BOOKING_TIME_SLOTS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00'];
const BOOKING_MONTHS_AHEAD = 5;

let calViewYear, calViewMonth, selectedDate = null;

function bookingStartOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function renderCalendar() {
  const today = bookingStartOfToday();
  const first = new Date(calViewYear, calViewMonth, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

  calTitle.textContent = `${MONTH_FULL_CZ[calViewMonth]} ${calViewYear}`;
  calGrid.innerHTML = '';

  for (let i = 0; i < offset; i++) {
    const blank = document.createElement('span');
    blank.className = 'cal-empty';
    calGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(calViewYear, calViewMonth, day);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    btn.textContent = day;
    if (date < today) btn.disabled = true;
    if (date.getTime() === today.getTime()) btn.classList.add('is-today');
    if (selectedDate && date.getTime() === selectedDate.getTime()) btn.classList.add('is-selected');
    btn.addEventListener('click', () => selectBookingDay(date));
    calGrid.appendChild(btn);
  }

  calPrev.disabled = calViewYear === today.getFullYear() && calViewMonth === today.getMonth();
  const monthsFromNow = (calViewYear - today.getFullYear()) * 12 + (calViewMonth - today.getMonth());
  calNext.disabled = monthsFromNow >= BOOKING_MONTHS_AHEAD;
}

function selectBookingDay(date) {
  selectedDate = date;
  bookingInput.value = '';
  bookingSummary.textContent = 'Vyberte prosím čas natáčení.';
  bookingSummary.classList.remove('is-set', 'is-error');
  renderCalendar();

  const label = `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
  bookingTimesEl.innerHTML = '';
  bookingTimesEl.hidden = false;
  BOOKING_TIME_SLOTS.forEach(time => {
    const timeBtn = document.createElement('button');
    timeBtn.type = 'button';
    timeBtn.className = 'booking-time';
    timeBtn.textContent = time;
    timeBtn.addEventListener('click', () => {
      bookingTimesEl.querySelectorAll('.booking-time').forEach(b => b.classList.remove('is-selected'));
      timeBtn.classList.add('is-selected');
      bookingInput.value = `${label} v ${time}`;
      bookingSummary.textContent = `Vybraný termín: ${label} v ${time}`;
      bookingSummary.classList.add('is-set');
      bookingSummary.classList.remove('is-error');
    });
    bookingTimesEl.appendChild(timeBtn);
  });
}

function resetBooking() {
  selectedDate = null;
  bookingInput.value = '';
  bookingTimesEl.innerHTML = '';
  bookingTimesEl.hidden = true;
  bookingSummary.textContent = 'Nejprve vyberte den.';
  bookingSummary.classList.remove('is-set', 'is-error');
  const now = new Date();
  calViewYear = now.getFullYear();
  calViewMonth = now.getMonth();
  renderCalendar();
}

if (calGrid) {
  const now = new Date();
  calViewYear = now.getFullYear();
  calViewMonth = now.getMonth();
  renderCalendar();

  calPrev.addEventListener('click', () => {
    calViewMonth--;
    if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    calViewMonth++;
    if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
    renderCalendar();
  });
}

// ── Form validation ──────────────────────────────────
const FIELD_RULES = {
  name(v) {
    const words = v.trim().split(/\s+/).filter(Boolean);
    const letters = (v.match(/\p{L}/gu) || []).length;
    if (!v.trim()) return 'Zadejte své jméno a příjmení.';
    if (words.length < 2 || letters < 3) return 'Zadejte jméno i příjmení.';
    if (!/^[\p{L}\p{M}\s'’.\-]+$/u.test(v.trim())) return 'Jméno může obsahovat jen písmena.';
    return '';
  },
  email(v) {
    v = v.trim();
    if (!v) return 'Zadejte svůj e-mail.';
    if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(v) || v.includes('..')) return 'Zadejte platný e-mail, např. jmeno@email.cz.';
    return '';
  },
  phone(v) {
    const s = v.replace(/[\s\-().]/g, '');
    if (!s) return 'Zadejte své telefonní číslo.';
    const ok = /^(\+|00)420[2-9]\d{8}$/.test(s)   // +420 777 123 456
            || /^[2-9]\d{8}$/.test(s)              // 777123456
            || /^(\+|00)(?!420)[1-9]\d{7,14}$/.test(s); // zahraniční číslo
    return ok ? '' : 'Zadejte platné telefonní číslo, např. 777 123 456.';
  },
  address(v) {
    v = v.trim();
    if (!v) return 'Zadejte adresu nemovitosti.';
    if (v.length < 5 || !/\p{L}/u.test(v)) return 'Zadejte adresu nemovitosti (obec, ulice, číslo).';
    return '';
  }
};

function setFieldError(el, message) {
  const wrap = el.closest('.form-field');
  if (!wrap) return;
  const box = wrap.querySelector('.field-error');
  wrap.classList.toggle('has-error', !!message);
  if (box) box.textContent = message || '';
}

function validateField(el) {
  const rule = FIELD_RULES[el.name];
  const message = rule ? rule(el.value) : '';
  setFieldError(el, message);
  return !message;
}

if (contactForm) {
  ['name', 'email', 'phone', 'address'].forEach(n => {
    const el = contactForm.elements[n];
    if (!el) return;
    el.addEventListener('blur', () => { if (el.value.trim()) validateField(el); });
    el.addEventListener('input', () => {
      if (el.closest('.form-field').classList.contains('has-error')) validateField(el);
    });
  });
  if (packageSelect) {
    packageSelect.addEventListener('change', () => setFieldError(packageSelect, ''));
  }
}

if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    // Validate everything at once and show every problem
    const invalid = [];
    ['name', 'email', 'phone', 'address'].forEach(n => {
      if (!validateField(contactForm.elements[n])) invalid.push(contactForm.elements[n]);
    });
    if (packageSelect) {
      if (!packageSelect.value) {
        setFieldError(packageSelect, 'Vyberte balíček (když si nejste jistí, zvolte „Nejsem si jistý/á“).');
        invalid.push(packageSelect);
      } else {
        setFieldError(packageSelect, '');
      }
    }
    if (invalid.length) {
      invalid.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      invalid[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (invalid[0].focus && invalid[0].tagName !== 'DIV') invalid[0].focus({ preventScroll: true });
      return;
    }

    const idleHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Objednat';

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Odesíláme…';

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(contactForm)
    })
      // Web3Forms normally replies with JSON, but can fall back to an HTML
      // success page depending on the request — treat any 2xx as success then.
      .then(res => res.json().catch(() => ({ success: res.ok })))
      .then(data => {
        if (!data.success) throw new Error(data.message || 'send failed');

        submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Odesláno! Brzy se ozveme.';
        submitBtn.style.background = '#16a34a';
        contactForm.reset();
        if (calGrid) resetBooking();

        setTimeout(() => {
          submitBtn.innerHTML = idleHTML;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 5000);
      })
      .catch(() => {
        submitBtn.innerHTML = 'Nepodařilo se odeslat, zkuste to znovu';
        submitBtn.style.background = '#ef4444';
        setTimeout(() => {
          submitBtn.innerHTML = idleHTML;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 4000);
      });
  });
}

function shakeField(input) {
  input.style.borderColor = '#ef4444';
  input.style.animation = 'none';
  input.focus();
  setTimeout(() => { input.style.borderColor = ''; }, 1800);
}


// ── Brands ticker (seamless infinite scroll) ──────────
// The loop translates by the width of exactly one copy of the item list,
// so there always need to be enough copies in the DOM to cover at least
// 2x the wrapper's width — otherwise, on a wide viewport, the track runs
// out of items before the loop point and a blank gap appears on the right.
// We rebuild the track from a single base set and clone it as many times
// as the current viewport needs, then measure the real pixel width of one
// set (not a "-50%" guess) so the loop lines up exactly, with no drift.
document.querySelectorAll('.ticker-track').forEach(track => {
  const wrapper = track.closest('.ticker-wrapper') || track.parentElement;
  const baseCount = Array.from(track.children).length / 2;
  const baseItems = Array.from(track.children).slice(0, baseCount);
  if (!baseItems.length) return;
  const baseHTML = baseItems.map(el => el.outerHTML).join('');

  const rebuild = () => {
    track.classList.remove('running');
    track.innerHTML = baseHTML;

    const oneSetWidth = track.scrollWidth;
    const targetWidth = wrapper.clientWidth * 2;
    while (track.scrollWidth < targetWidth) {
      track.insertAdjacentHTML('beforeend', baseHTML);
    }

    track.style.setProperty('--ticker-distance', `${oneSetWidth}px`);
    track.classList.add('running');
  };

  rebuild();
  window.addEventListener('resize', rebuild);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(rebuild);
  }
});


// ── Video gallery hover-to-preview ────────────────────
// The real src is stashed in data-src and only attached while hovering.
// On mouseleave we fully drop the src (not just pause) so the browser
// actually aborts the in-flight download — otherwise several paused-but-
// still-buffering previews can exhaust the per-host connection limit and
// later videos spin forever waiting for a free connection.
document.querySelectorAll('.video-card video').forEach(video => {
  const card = video.closest('.video-card');
  video.dataset.src = video.getAttribute('src');
  video.removeAttribute('src');
  let hoverTimer = null;

  card.addEventListener('mouseenter', () => {
    // Small dwell delay so quickly passing the cursor over several cards
    // doesn't fire off a batch of downloads that are cancelled a moment later.
    hoverTimer = setTimeout(() => {
      video.setAttribute('src', video.dataset.src);
      video.load();
      video.play().catch(() => {});
    }, 150);
  });
  card.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    video.pause();
    video.removeAttribute('src');
    video.load();
  });
});


// ── Video gallery click-to-play lightbox ──────────────
const videoLightbox = document.getElementById('videoLightbox');
const videoLightboxPlayer = document.getElementById('videoLightboxPlayer');
const videoLightboxClose = document.getElementById('videoLightboxClose');

if (videoLightbox && videoLightboxPlayer) {
  const closeVideoLightbox = () => {
    videoLightbox.classList.remove('open');
    videoLightboxPlayer.pause();
    videoLightboxPlayer.removeAttribute('src');
    videoLightboxPlayer.load();
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.video-card').forEach(card => {
    const source = card.querySelector('video');
    if (!source) return;
    card.addEventListener('click', () => {
      // Stop this card's own hover-preview download first so it doesn't
      // keep competing with the lightbox for a connection slot.
      source.pause();
      source.removeAttribute('src');
      source.load();

      videoLightboxPlayer.src = source.dataset.src;
      videoLightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      videoLightboxPlayer.muted = false;
      videoLightboxPlayer.play().catch(() => {});
    });
  });

  videoLightboxClose.addEventListener('click', closeVideoLightbox);
  videoLightbox.addEventListener('click', e => {
    if (e.target === videoLightbox) closeVideoLightbox();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeVideoLightbox();
  });
}


// ── Video grid pagination (Videoprohlídka page) ───────
function initVideoPagination(trackId, prevId, nextId, countId, paginationId) {
  const track = document.getElementById(trackId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  const countEl = document.getElementById(countId);
  const paginationEl = document.getElementById(paginationId);
  if (!track || !prevBtn || !nextBtn) return;

  const cards = Array.from(track.querySelectorAll('.video-card'));
  const pageCount = cards.reduce((max, c) => Math.max(max, parseInt(c.dataset.page, 10) || 0), 0) + 1;
  let page = 0;

  const render = () => {
    cards.forEach(c => { c.hidden = (parseInt(c.dataset.page, 10) || 0) !== page; });
    if (countEl) countEl.textContent = `${page + 1}/${pageCount}`;
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page === pageCount - 1;
  };

  if (paginationEl) paginationEl.hidden = pageCount <= 1;
  prevBtn.addEventListener('click', () => { if (page > 0) { page--; render(); } });
  nextBtn.addEventListener('click', () => { if (page < pageCount - 1) { page++; render(); } });
  render();
}

initVideoPagination('videoTrackWide', 'videoWidePrev', 'videoWideNext', 'videoWideCount', 'videoWidePagination');
initVideoPagination('videoTrackReels', 'videoReelsPrev', 'videoReelsNext', 'videoReelsCount', 'videoReelsPagination');


// ── Results carousel (toggle Reels / Videoprohlídky) ──
const resultsToggleBtns = document.querySelectorAll('.results-toggle-btn');
const resultsPrev = document.getElementById('resultsPrev');
const resultsNext = document.getElementById('resultsNext');
const resultsTracks = {
  reels: document.getElementById('resultsTrackReels'),
  wide: document.getElementById('resultsTrackWide'),
  photos: document.getElementById('resultsTrackPhotos')
};
const resultsMoreLink = document.getElementById('resultsMoreLink');
const resultsMoreHrefs = { reels: 'videoprohlidka.html', wide: 'videoprohlidka.html', photos: 'fotogalerie.html' };

if (resultsPrev && resultsNext && (resultsTracks.reels || resultsTracks.wide || resultsTracks.photos)) {
  let activeTrack = resultsTracks.reels || resultsTracks.wide || resultsTracks.photos;

  const scrollByCard = dir => {
    const card = activeTrack.querySelector('.result-card');
    const gap  = parseFloat(getComputedStyle(activeTrack).gap) || 16;
    const amount = card ? card.getBoundingClientRect().width + gap : 300;
    activeTrack.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  const updateArrows = () => {
    const maxScroll = activeTrack.scrollWidth - activeTrack.clientWidth - 2;
    resultsPrev.style.opacity = activeTrack.scrollLeft <= 2 ? '0.35' : '1';
    resultsPrev.style.pointerEvents = activeTrack.scrollLeft <= 2 ? 'none' : 'auto';
    resultsNext.style.opacity = activeTrack.scrollLeft >= maxScroll ? '0.35' : '1';
    resultsNext.style.pointerEvents = activeTrack.scrollLeft >= maxScroll ? 'none' : 'auto';
  };

  resultsPrev.addEventListener('click', () => scrollByCard(-1));
  resultsNext.addEventListener('click', () => scrollByCard(1));

  Object.values(resultsTracks).forEach(track => {
    if (track) track.addEventListener('scroll', updateArrows, { passive: true });
  });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  resultsToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.track;
      const nextTrack = resultsTracks[key];
      if (!nextTrack || nextTrack === activeTrack) return;

      resultsToggleBtns.forEach(b => b.classList.toggle('active', b === btn));
      Object.values(resultsTracks).forEach(track => {
        if (track) track.hidden = track !== nextTrack;
      });
      activeTrack = nextTrack;
      activeTrack.scrollLeft = 0;
      activeTrack.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
      updateArrows();
      if (resultsMoreLink && resultsMoreHrefs[key]) resultsMoreLink.href = resultsMoreHrefs[key];
    });
  });
}
