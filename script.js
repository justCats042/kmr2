/* -------------------------
   Refactored Calendar JS (shorter, delegated)
   - Keeps full feature set (multi-day events, notes, edit/delete/delete-all)
   - Uses templates and event delegation to reduce repeated listeners
   ------------------------- */

/* Carousel & Navigation */
const container = document.querySelector('.carousel-container');
const sections = document.querySelectorAll('.carousel-section');
const leftBtn = document.querySelector('.nav-arrow.left');
const rightBtn = document.querySelector('.nav-arrow.right');
const navLinks = document.querySelectorAll('.nav-links a');
let index = 0;
const updateCarousel = () => container.style.transform = `translateX(-${index * 100}vw)`;
const updateScheduleVisibility = () => document.body.classList.toggle('show-schedule', index === Array.from(sections).findIndex(s => s.id === 'schedule'));
const updateCarouselAndVisibility = () => { updateCarousel(); updateScheduleVisibility(); };
updateScheduleVisibility();
rightBtn && (rightBtn.onclick = () => { index = (index + 1) % sections.length; updateCarouselAndVisibility(); });
leftBtn && (leftBtn.onclick = () => { index = (index - 1 + sections.length) % sections.length; updateCarouselAndVisibility(); });
navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); index = Number(link.dataset.index); updateCarouselAndVisibility(); }));

// Delegate clicks for any element with a data-index (e.g., home buttons, service boxes)
document.addEventListener('click', e => {
    const el = e.target.closest('[data-index]');
    if (!el) return;
    // if it's inside the navbar links we already handle it
    if (el.closest('.nav-links')) return;
    e.preventDefault();
    const idx = Number(el.dataset.index);
    if (!isNaN(idx)) { index = idx; updateCarouselAndVisibility(); }
});

/* Calendar / Schedule (refactored) */
if (document.querySelector('.calendar-grid')) {
    const calendarGrid = document.querySelector('.calendar-grid');
    const monthYear = document.querySelector('.month-year');
    const prevBtn = document.querySelector('.prev-month');
    const nextBtn = document.querySelector('.next-month');
    const eventsList = document.querySelector('.events-list');
    const selectedDateEl = document.querySelector('.selected-date');
    const addEventBtn = document.querySelector('.add-event-btn');
    const modal = document.getElementById('event-modal');
    const modalForm = document.getElementById('event-form');
    const modalDateHeading = document.getElementById('modal-date-heading');
    const noteTextarea = document.getElementById('date-note');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const clearNoteBtn = document.getElementById('clear-note-btn');

    let current = new Date();
    let selectedDate = null;

    // load and normalize storage
    const raw = JSON.parse(localStorage.getItem('site_events') || '{}');
    const events = {};
    Object.keys(raw).forEach(k => events[k] = Array.isArray(raw[k]) ? { items: raw[k], notes: '' } : raw[k]);

    const pad = n => n < 10 ? '0' + n : '' + n;
    const fmt = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
    const save = () => localStorage.setItem('site_events', JSON.stringify(events));
    const cleanup = d => { const o = events[d]; if (!o) return; if ((!o.items || !o.items.length) && (!o.notes || !o.notes.trim())) delete events[d]; };

    const renderCalendar = () => {
        calendarGrid.innerHTML = '';
        const y = current.getFullYear(), m = current.getMonth();
        monthYear.textContent = current.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        const first = new Date(y, m, 1).getDay();
        const days = new Date(y, m + 1, 0).getDate();
        for (let i = 0; i < 42; i++) {
            const cell = document.createElement('div'); cell.className = 'calendar-cell';
            const dn = i - first + 1;
            if (dn < 1 || dn > days) cell.classList.add('empty');
            else {
                const ds = fmt(y, m, dn); cell.dataset.date = ds;
                cell.innerHTML = `<div class="day-num">${dn}</div>` + ((events[ds] && events[ds].items && events[ds].items.length) ? '<div class="event-dot"></div>' : '');
                const t = new Date(); if (t.getFullYear() === y && t.getMonth() === m && t.getDate() === dn) cell.classList.add('today');
                cell.addEventListener('click', () => selectDate(ds));
                cell.addEventListener('dblclick', () => openModal(ds));
            }
            calendarGrid.appendChild(cell);
        }
    };

    const renderEvents = date => {
        const list = events[date] && events[date].items ? events[date].items : [];
        if (!list.length) return eventsList.innerHTML = '<li>No events</li>';
        eventsList.innerHTML = list.map((ev, i) => `
            <li>
                <strong>${ev.time ? ev.time + ' — ' : ''}${ev.title}</strong>
                <div>${ev.desc || ''}</div>
                <div class="event-actions">
                    <button data-action="edit" data-index="${i}">Edit</button>
                    <button data-action="delete" data-index="${i}">Delete</button>
                    <button data-action="deleteAll" data-index="${i}">Delete All</button>
                </div>
            </li>
        `).join('');
    };

    function selectDate(date) { selectedDate = date; selectedDateEl.textContent = date; renderEvents(date); if (noteTextarea) noteTextarea.value = events[date] && events[date].notes ? events[date].notes : ''; }

    function openModal(date, eventId) {
        modal.classList.remove('hidden'); modalDateHeading.textContent = `${eventId ? 'Edit' : 'Add'} Event — ${date}`;
        modalForm.title.value = modalForm.time.value = modalForm.desc.value = '';
        modalForm.start.value = modalForm.end.value = date; modalForm.dataset.date = date;
        if (eventId) {
            modalForm.dataset.eventId = eventId; let found = null;
            for (const d in events) (events[d].items || []).forEach(it => { if (it.id == eventId && !found) found = it; });
            if (found) { modalForm.title.value = found.title || ''; modalForm.time.value = found.time || ''; modalForm.desc.value = found.desc || ''; modalForm.start.value = found.start || date; modalForm.end.value = found.end || found.start || date; }
        } else delete modalForm.dataset.eventId;
    }

    function closeModal() { modal.classList.add('hidden'); }

    prevBtn && prevBtn.addEventListener('click', () => { current.setMonth(current.getMonth() - 1); renderCalendar(); });
    nextBtn && nextBtn.addEventListener('click', () => { current.setMonth(current.getMonth() + 1); renderCalendar(); });
    addEventBtn && addEventBtn.addEventListener('click', () => { if (!selectedDate) { const t = new Date(); selectedDate = fmt(t.getFullYear(), t.getMonth(), t.getDate()); selectedDateEl.textContent = selectedDate; } openModal(selectedDate); });

    // events-list delegation
    eventsList.addEventListener('click', e => {
        const btn = e.target.closest('button[data-action]'); if (!btn) return;
        const act = btn.dataset.action, idx = Number(btn.dataset.index); const list = events[selectedDate] && events[selectedDate].items ? events[selectedDate].items : [];
        if (act === 'edit') openModal(selectedDate, list[idx] && list[idx].id);
        else if (act === 'delete') { list.splice(idx, 1); cleanup(selectedDate); save(); renderCalendar(); renderEvents(selectedDate); }
        else if (act === 'deleteAll') { const ev = list[idx]; if (!ev || !ev.id) return; if (!confirm('Delete this event for all dates?')) return; const id = ev.id; for (const d in events) { events[d].items = (events[d].items || []).filter(it => it.id != id); cleanup(d); } save(); renderCalendar(); renderEvents(selectedDate); }
    });

    modalForm.addEventListener('submit', e => {
        e.preventDefault(); const title = modalForm.title.value.trim(), time = modalForm.time.value, desc = modalForm.desc.value.trim();
        const start = modalForm.start.value, end = modalForm.end.value; if (!start || !end) return alert('Please choose start and end dates'); if (new Date(end) < new Date(start)) return alert('End date must be same or after start date');
        const id = modalForm.dataset.eventId || ('e' + Date.now());
        if (modalForm.dataset.eventId) { for (const d in events) events[d].items = (events[d].items || []).filter(it => it.id != id), cleanup(d); }
        for (let dt = new Date(start); dt <= new Date(end); dt.setDate(dt.getDate() + 1)) {
            const ds = `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}`;
            if (!events[ds]) events[ds] = { items: [], notes: '' };
            events[ds].items.push({ id, title, time, desc, start, end });
        }
        save(); closeModal(); renderCalendar(); renderEvents(modalForm.start.value);
    });

    saveNoteBtn && saveNoteBtn.addEventListener('click', () => { if (!selectedDate) return alert('Select a date first'); if (!events[selectedDate]) events[selectedDate] = { items: [], notes: '' }; events[selectedDate].notes = noteTextarea.value; cleanup(selectedDate); save(); renderCalendar(); });
    clearNoteBtn && clearNoteBtn.addEventListener('click', () => { if (!selectedDate) return; if (events[selectedDate]) events[selectedDate].notes = ''; noteTextarea.value = ''; cleanup(selectedDate); save(); renderCalendar(); renderEvents(selectedDate); });

    document.querySelectorAll('.cancel-btn').forEach(b => b.addEventListener('click', closeModal));
    document.querySelectorAll('.delete-all-btn').forEach(b => b.addEventListener('click', () => { const id = modalForm.dataset.eventId; if (!id) return alert('No event selected to delete across all dates.'); if (!confirm('Delete all instances of this event?')) return; for (const d in events) events[d].items = (events[d].items || []).filter(it => it.id != id), cleanup(d); save(); closeModal(); renderCalendar(); if (selectedDate) renderEvents(selectedDate); }));

    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // init
    renderCalendar(); const t = new Date(); selectDate(fmt(t.getFullYear(), t.getMonth(), t.getDate()));
}
