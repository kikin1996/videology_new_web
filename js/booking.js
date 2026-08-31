/* ═══════════════════════════════════════════════════════
   VIDEOLOGY.CZ — Rezervační systém (kalendář + počet kamer)
   Ukládá objednávky do Firebase Firestore.
   ═══════════════════════════════════════════════════════ */

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const MIN_LEAD_DAYS   = 1;  // nejbližší den, který lze objednat (dnes + N)
const MAX_MONTHS_AHEAD = 6; // jak daleko dopředu lze v kalendáři listovat

const MONTHS_CS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];
const WEEKDAYS_LONG_CS = [
  'neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota',
];

// ── DOM refs ───────────────────────────────────────────
const cameraOptions   = document.getElementById('cameraOptions');
const calMonthLabel   = document.getElementById('calMonthLabel');
const calGrid         = document.getElementById('calGrid');
const calPrev         = document.getElementById('calPrev');
const calNext         = document.getElementById('calNext');
const bookingSummary  = document.getElementById('bookingSummary');
const contactForm     = document.getElementById('contactForm');
const submitBtn       = document.getElementById('submitBtn');
const formNote        = document.getElementById('formNote');
const calendarEl      = document.getElementById('calendar');

if (contactForm) {

  // ── State ────────────────────────────────────────────
  const today = startOfDay(new Date());
  const minBookableDate = addDays(today, MIN_LEAD_DAYS);
  const minNavMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxNavMonth = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD, 1);

  let viewMonth      = new Date(minNavMonth);
  let selectedCameras = null;
  let selectedDate     = null;
  let availability      = new Map(); // dateStr -> cameras, pro zobrazený měsíc
  let submitting         = false;

  // ── Firebase (lazy, jen pokud je nakonfigurováno) ─────
  let db = null;
  let firestore = null;

  async function initFirebase() {
    if (!isFirebaseConfigured) return;
    try {
      const [{ initializeApp }, fs] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js'),
      ]);
      const app = initializeApp(firebaseConfig);
      firestore = fs;
      db = fs.getFirestore(app);
    } catch (err) {
      console.error('Firebase se nepodařilo inicializovat:', err);
      db = null;
    }
  }

  // ── Date helpers ───────────────────────────────────────
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function mondayFirstIndex(d) { return (d.getDay() + 6) % 7; }
  function formatLongDate(d) {
    return `${WEEKDAYS_LONG_CS[d.getDay()]} ${d.getDate()}. ${MONTHS_CS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
  }

  // ── Availability fetch ─────────────────────────────────
  async function fetchAvailability(year, month) {
    if (!db || !firestore) return new Map();
    const startStr = toDateStr(new Date(year, month, 1));
    const endStr   = toDateStr(new Date(year, month + 1, 1));
    try {
      const { collection, getDocs, query, where, documentId } = firestore;
      const q = query(
        collection(db, 'availability'),
        where(documentId(), '>=', startStr),
        where(documentId(), '<', endStr)
      );
      const snap = await getDocs(q);
      const map = new Map();
      snap.forEach(docSnap => map.set(docSnap.id, docSnap.data().cameras));
      return map;
    } catch (err) {
      console.error('Nepodařilo se načíst obsazenost termínů:', err);
      return new Map();
    }
  }

  // ── Rendering ────────────────────────────────────────
  function renderMonthLabel() {
    calMonthLabel.textContent = `${MONTHS_CS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
    calPrev.disabled = viewMonth <= minNavMonth;
    calNext.disabled = viewMonth >= maxNavMonth;
  }

  function renderCalendarGrid() {
    calGrid.innerHTML = '';
    const year  = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = mondayFirstIndex(firstDay);

    for (let i = 0; i < leadingBlanks; i++) {
      calGrid.appendChild(document.createElement('span'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = toDateStr(date);
      const isPast = date < minBookableDate;
      const isBooked = availability.has(dateStr);
      const isSelected = sameDay(date, selectedDate);
      const isToday = sameDay(date, today);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = String(day);
      if (isToday) btn.classList.add('is-today');
      if (isPast || isBooked) {
        btn.classList.add(isBooked ? 'is-booked' : 'is-disabled');
        btn.disabled = true;
        if (isBooked) btn.title = 'Tento den je již obsazený';
      } else {
        btn.addEventListener('click', () => {
          selectedDate = date;
          renderCalendarGrid();
          updateSummary();
        });
      }
      if (isSelected) btn.classList.add('is-selected');

      calGrid.appendChild(btn);
    }
  }

  async function loadMonth() {
    renderMonthLabel();
    calGrid.setAttribute('aria-busy', 'true');
    availability = await fetchAvailability(viewMonth.getFullYear(), viewMonth.getMonth());
    calGrid.removeAttribute('aria-busy');
    // pokud vybraný den mezitím zabral někdo jiný, zruš výběr
    if (selectedDate && availability.has(toDateStr(selectedDate))) {
      selectedDate = null;
      updateSummary();
    }
    renderCalendarGrid();
  }

  function updateSummary() {
    const cameraText = selectedCameras
      ? `${selectedCameras} ${selectedCameras === 1 ? 'kamera' : 'kamery'}`
      : null;
    const dateText = selectedDate ? formatLongDate(selectedDate) : null;

    if (cameraText && dateText) {
      bookingSummary.innerHTML = `Objednávka: <strong>${cameraText}</strong> · <strong>${dateText}</strong>`;
      bookingSummary.classList.add('is-complete');
    } else if (cameraText || dateText) {
      bookingSummary.textContent = `Vybráno: ${cameraText || dateText}. Doplňte prosím ${cameraText ? 'datum natáčení' : 'počet kamer'}.`;
      bookingSummary.classList.remove('is-complete');
    } else {
      bookingSummary.textContent = 'Nejprve vyberte počet kamer a datum natáčení.';
      bookingSummary.classList.remove('is-complete');
    }
  }

  function flash(el) {
    el.classList.remove('shake');
    void el.offsetWidth; // restart animace
    el.classList.add('shake');
  }

  // ── Event wiring ───────────────────────────────────────
  cameraOptions.querySelectorAll('.camera-option').forEach(btn => {
    btn.addEventListener('click', () => {
      cameraOptions.querySelectorAll('.camera-option').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedCameras = Number(btn.dataset.cameras);
      updateSummary();
    });
  });

  calPrev.addEventListener('click', () => {
    if (viewMonth <= minNavMonth) return;
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    loadMonth();
  });
  calNext.addEventListener('click', () => {
    if (viewMonth >= maxNavMonth) return;
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    loadMonth();
  });

  function setSubmitLabel(label, iconSvg) {
    submitBtn.innerHTML = `<span class="btn-label">${label}</span><span class="btn-icon">${iconSvg}</span>`;
  }

  const ICON_SEND    = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  const ICON_CHECK   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_WARNING = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>';

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;

    const name  = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();

    if (!name || !email) {
      flash(!name ? contactForm.name : contactForm.email);
      (!name ? contactForm.name : contactForm.email).focus();
      return;
    }
    if (!selectedCameras || !selectedDate) {
      flash(!selectedCameras ? cameraOptions : calendarEl);
      formNote.textContent = 'Vyberte prosím počet kamer a volný termín v kalendáři.';
      formNote.classList.add('is-error');
      return;
    }

    if (!db || !firestore) {
      formNote.textContent = isFirebaseConfigured
        ? 'Rezervační systém je momentálně nedostupný. Napište nám prosím na info@videology.cz.'
        : 'Rezervační systém zatím není napojen na databázi (náhledový režim). Napište nám prosím na info@videology.cz.';
      formNote.classList.add('is-error');
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    setSubmitLabel('Odesíláme…', ICON_SEND);
    formNote.classList.remove('is-error');

    const dateStr = toDateStr(selectedDate);
    const { doc, collection, writeBatch, serverTimestamp } = firestore;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'availability', dateStr), {
        cameras: selectedCameras,
        bookedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'bookings')), {
        date: dateStr,
        cameras: selectedCameras,
        name,
        email,
        phone: contactForm.phone.value.trim(),
        address: contactForm.address.value.trim(),
        message: contactForm.message.value.trim(),
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setSubmitLabel('Objednáno! Brzy se ozveme.', ICON_CHECK);
      formNote.textContent = `Termín ${formatLongDate(selectedDate)} (${selectedCameras} ${selectedCameras === 1 ? 'kamera' : 'kamery'}) jsme přijali. Potvrzení pošleme na e-mail do 24 hodin.`;

      availability.set(dateStr, selectedCameras);
      selectedDate = null;
      selectedCameras = null;
      cameraOptions.querySelectorAll('.camera-option').forEach(b => b.classList.remove('is-selected'));
      renderCalendarGrid();
      updateSummary();

      setTimeout(() => {
        contactForm.reset();
        setSubmitLabel('Odeslat objednávku', ICON_SEND);
        formNote.textContent = 'Odpovíme vám do 24 hodin. Termín je závazný po našem potvrzení.';
        submitBtn.disabled = false;
        submitting = false;
      }, 6000);

    } catch (err) {
      console.error('Odeslání objednávky selhalo:', err);
      setSubmitLabel('Odeslat objednávku', ICON_WARNING);
      if (err && err.code === 'permission-denied') {
        formNote.textContent = 'Tento den mezitím obsadil někdo jiný. Vyberte prosím jiný termín.';
        loadMonth();
      } else {
        formNote.textContent = 'Odeslání se nepovedlo. Zkuste to prosím znovu nebo nám napište na info@videology.cz.';
      }
      formNote.classList.add('is-error');
      submitBtn.disabled = false;
      submitting = false;
    }
  });

  // ── Init ────────────────────────────────────────────
  (async () => {
    await initFirebase();
    await loadMonth();
    if (!isFirebaseConfigured) {
      console.info('[Videology] Firebase zatím není nakonfigurován (js/firebase-config.js) — kalendář běží v náhledovém režimu bez ukládání.');
    }
  })();
}
