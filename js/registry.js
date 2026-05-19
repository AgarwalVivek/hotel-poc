/**
 * registry.js — Public Event Registry Logic
 */

// ── Mobile nav ───────────────────────────────────────────
document.getElementById('burger').addEventListener('click', () => {
  document.querySelector('.nav__links').classList.toggle('open');
});

// ── Render events and registry ───────────────────────────
function renderRegistry() {
  const events = DB.events.getAll();
  const container = document.getElementById('events-container');

  if (events.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:4rem 1rem">
        <p style="font-family:var(--ff-serif);font-size:1.8rem;color:var(--dark);margin-bottom:0.5rem">No Events Yet</p>
        <p style="color:var(--muted)">Check back soon for upcoming celebrations and their gift registries.</p>
      </div>`;
    return;
  }

  container.innerHTML = events.map(evt => {
    const items = DB.registry.getByEvent(evt.id);
    const dateStr = evt.date
      ? new Date(evt.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const availableCount = items.filter(i => i.status === 'available').length;

    return `
      <div class="registry-event">
        <div class="registry-event__header">
          <div>
            <h2 class="registry-event__title">${evt.name}</h2>
            ${dateStr ? `<p class="registry-event__date">📅 ${dateStr}</p>` : ''}
            ${evt.description ? `<p class="registry-event__desc">${evt.description}</p>` : ''}
          </div>
          <div class="registry-event__stats">
            <span class="registry-stat">${items.length} gifts</span>
            <span class="registry-stat registry-stat--avail">${availableCount} available</span>
          </div>
        </div>

        ${items.length === 0
          ? '<p style="color:var(--muted);padding:1rem 0;font-size:0.9rem">No gifts added to this registry yet.</p>'
          : `<div class="registry-grid">
              ${items.map(item => renderProductCard(item)).join('')}
            </div>`
        }
      </div>
    `;
  }).join('');
}

function renderProductCard(item) {
  const isGone = item.status === 'gone';

  return `
    <div class="registry-card ${isGone ? 'registry-card--gone' : ''}">
      <div class="registry-card__img">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="registry-card__img-fallback" style="display:none">🎁</div>`
          : '<div class="registry-card__img-fallback">🎁</div>'
        }
        ${isGone ? '<div class="registry-card__gone-badge">GONE</div>' : ''}
      </div>
      <div class="registry-card__body">
        <h3 class="registry-card__name">${item.name}</h3>
        ${item.price ? `<p class="registry-card__price">${item.price}</p>` : ''}
        <div class="registry-card__actions">
          <a href="${item.amazonUrl}" target="_blank" rel="noopener" class="btn btn--outline registry-card__link">
            View on Amazon
          </a>
          ${isGone
            ? '<span class="registry-card__claimed">✓ Claimed</span>'
            : `<button class="btn btn--dark registry-card__book" onclick="openBookModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')">Claim Gift</button>`
          }
        </div>
      </div>
    </div>
  `;
}

// ── Booking Modal ────────────────────────────────────────
const bookOverlay = document.getElementById('book-modal-overlay');
const bookForm = document.getElementById('book-form');

function openBookModal(itemId, itemName) {
  document.getElementById('book-item-id').value = itemId;
  document.getElementById('book-product-name').textContent = itemName;
  document.getElementById('book-success').style.display = 'none';
  bookForm.reset();
  document.getElementById('book-item-id').value = itemId;
  bookOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBookModal() {
  bookOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('book-modal-close').addEventListener('click', closeBookModal);
bookOverlay.addEventListener('click', e => { if (e.target === bookOverlay) closeBookModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBookModal(); });

bookForm.addEventListener('submit', function(e) {
  e.preventDefault();

  const itemId = document.getElementById('book-item-id').value;
  const name = document.getElementById('book-name').value.trim();
  const email = document.getElementById('book-email').value.trim();

  if (!name || !email) return;

  const result = DB.registry.book(itemId, name, email);

  if (result) {
    document.getElementById('book-success').style.display = 'block';
    bookForm.querySelector('button[type="submit"]').disabled = true;
    setTimeout(() => {
      closeBookModal();
      bookForm.querySelector('button[type="submit"]').disabled = false;
      renderRegistry();
    }, 1200);
  } else {
    alert('This gift has already been claimed by someone else.');
    closeBookModal();
    renderRegistry();
  }
});

// ── Init ─────────────────────────────────────────────────
renderRegistry();
