/**
 * main.js — Hotel Website Frontend Logic
 */

// ── Nav scroll effect ────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ── Mobile nav ───────────────────────────────────────────
document.getElementById('burger').addEventListener('click', () => {
  document.querySelector('.nav__links').classList.toggle('open');
});

// ── Render rooms ─────────────────────────────────────────
function formatPrice(price) {
  return '₹' + price.toLocaleString('en-IN');
}

function roomImgHTML(room, height) {
  if (room.image) {
    return `
      <img
        src="${room.image}"
        alt="${room.name}"
        style="width:100%;height:${height}px;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <div class="room-card__img-fallback" style="display:none;height:${height}px;">
        <span>${room.icon || '🛏️'}</span>
      </div>`;
  }
  return `<div class="room-card__img-fallback" style="height:${height}px;"><span>${room.icon || '🛏️'}</span></div>`;
}

function renderRooms(type = 'all') {
  const grid = document.getElementById('rooms-grid');
  const rooms = DB.rooms.getByType(type).filter(r => r.available);

  if (rooms.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#7A7468;grid-column:1/-1;padding:3rem">No rooms found in this category.</p>';
    return;
  }

  grid.innerHTML = rooms.map(room => `
    <div class="room-card" data-id="${room.id}" onclick="openModal('${room.id}')">
      <div class="room-card__img-wrap" style="position:relative;overflow:hidden;">
        ${roomImgHTML(room, 220)}
        ${room.badge ? `<span class="room-card__badge">${room.badge}</span>` : ''}
      </div>
      <div class="room-card__body">
        <p class="room-card__type">${room.type}</p>
        <h3 class="room-card__name">${room.name}</h3>
        <div class="room-card__features">
          ${(room.features || []).slice(0, 3).map(f =>
            `<span class="room-card__feat">✦ ${f}</span>`
          ).join('')}
        </div>
        <div class="room-card__footer">
          <div class="room-card__price">
            <div class="room-card__price-amount">${formatPrice(room.price)}</div>
            <div class="room-card__price-unit">per night</div>
          </div>
          <button class="btn btn--outline" style="padding:0.5rem 1.25rem;font-size:0.7rem" onclick="openModal('${room.id}');event.stopPropagation()">Details</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Filter buttons ───────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRooms(btn.dataset.filter);
  });
});

// ── Modal ────────────────────────────────────────────────
const overlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');

function openModal(roomId) {
  const room = DB.rooms.getById(roomId);
  if (!room) return;

  modalContent.innerHTML = `
    <div class="modal__photo-wrap">
      ${room.image ? `
        <img src="${room.image}" alt="${room.name}"
          style="width:100%;height:280px;object-fit:cover;display:block;"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="modal__icon" style="display:none;">${room.icon || '🛏️'}</div>
      ` : `<div class="modal__icon">${room.icon || '🛏️'}</div>`}
    </div>
    <div style="padding: 0 2.5rem 2.5rem">
      <p class="modal__type">${room.type}</p>
      <h2 class="modal__name">${room.name}</h2>
      <p class="modal__desc">${room.description}</p>
      <div class="modal__specs">
        <div class="modal__spec">
          <div class="modal__spec-val">${room.size}</div>
          <div class="modal__spec-key">Size</div>
        </div>
        <div class="modal__spec">
          <div class="modal__spec-val">${room.beds}</div>
          <div class="modal__spec-key">Beds</div>
        </div>
        <div class="modal__spec">
          <div class="modal__spec-val">${room.capacity}</div>
          <div class="modal__spec-key">Guests</div>
        </div>
      </div>
      <div class="modal__inclusions">
        <h4>Inclusions</h4>
        <ul>${(room.inclusions || []).map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
      <div class="modal__price-line">
        <div>
          <div class="modal__price-tag">${formatPrice(room.price)}</div>
          <div class="modal__price-sub">per night, taxes included</div>
        </div>
        <a href="#contact" class="btn btn--dark" style="width:auto;padding:0.75rem 1.75rem" onclick="overlay.classList.remove('open');document.getElementById('room-type').value='${room.type}'">Book Now</a>
      </div>
    </div>
  `;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Contact form ─────────────────────────────────────────
document.getElementById('contact-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const enquiry = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    checkin: document.getElementById('checkin').value,
    checkout: document.getElementById('checkout').value,
    roomType: document.getElementById('room-type').value,
    message: document.getElementById('message').value
  };

  DB.enquiries.add(enquiry);

  const successMsg = document.getElementById('form-success');
  successMsg.style.display = 'block';
  this.reset();

  setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
});

// ── Set min date for date inputs ─────────────────────────
const today = new Date().toISOString().split('T')[0];
document.getElementById('checkin').min = today;
document.getElementById('checkout').min = today;

document.getElementById('checkin').addEventListener('change', function() {
  document.getElementById('checkout').min = this.value;
});

// ── Init ─────────────────────────────────────────────────
renderRooms('all');
