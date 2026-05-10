/**
 * admin.js — Admin Panel Logic
 */

// ── Cosmos DB enquiries cache ────────────────────────────
let _cosmosEnquiries = null;
let _cosmosLoading = false;

async function fetchCosmosEnquiries(forceRefresh = false) {
  if (_cosmosEnquiries && !forceRefresh) return _cosmosEnquiries;
  if (_cosmosLoading) return _cosmosEnquiries || [];

  _cosmosLoading = true;
  try {
    const res = await fetch('/api/enquiries');
    const data = await res.json();
    if (data.success && Array.isArray(data.enquiries)) {
      _cosmosEnquiries = data.enquiries;
    } else {
      console.warn('Cosmos fetch failed, falling back to localStorage');
      _cosmosEnquiries = null;
    }
  } catch (err) {
    console.warn('Could not reach API, falling back to localStorage:', err.message);
    _cosmosEnquiries = null;
  } finally {
    _cosmosLoading = false;
  }
  return _cosmosEnquiries;
}

function getEnquiries() {
  return _cosmosEnquiries || DB.enquiries.getAll();
}

// Fetch from Cosmos DB immediately on admin load
fetchCosmosEnquiries().then(() => loadDashboard());

// ── Tab navigation ───────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');

  if (name === 'dashboard') loadDashboard();
  if (name === 'rooms') loadRoomsTab();
  if (name === 'enquiries') { fetchCosmosEnquiries(true).then(() => loadEnquiriesTab()); }
}

document.querySelectorAll('.sidebar__link').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// ── Dashboard ────────────────────────────────────────────
function loadDashboard() {
  const rooms = DB.rooms.getAll();
  const enquiries = getEnquiries();
  const newEnq = enquiries.filter(e => e.status === 'new');
  const avgPrice = rooms.length
    ? Math.round(rooms.reduce((s, r) => s + r.price, 0) / rooms.length)
    : 0;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-card__num">${rooms.length}</div>
      <div class="stat-card__label">Total Rooms</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num stat-card__accent">${rooms.filter(r => r.available).length}</div>
      <div class="stat-card__label">Available</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num">${enquiries.length}</div>
      <div class="stat-card__label">Enquiries</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num stat-card__accent">${newEnq.length}</div>
      <div class="stat-card__label">New Enquiries</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__num">₹${avgPrice.toLocaleString('en-IN')}</div>
      <div class="stat-card__label">Avg. Rate / Night</div>
    </div>
  `;

  const recent = enquiries.slice(0, 5);
  document.getElementById('recent-enquiries').innerHTML =
    recent.length === 0
      ? '<p style="color:var(--muted);font-size:0.875rem">No enquiries yet.</p>'
      : recent.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:0.75rem 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:500;font-size:0.9rem">${e.name}</div>
            <div style="font-size:0.8rem;color:var(--muted)">
              ${e.email} — ${e.roomType || 'any room'}
            </div>
            <div style="font-size:0.8rem;color:var(--muted)">
              📅 ${e.checkin || '—'} → ${e.checkout || '—'}
            </div>
            ${e.message ? `
              <div style="margin-top:0.35rem;font-size:0.82rem;color:#333;font-style:italic;">
                "${e.message}"
              </div>
            ` : ''}
          </div>
          <span class="badge badge--${e.status}">${e.status}</span>
        </div>
      `).join('');
}

// ── Rooms Tab ────────────────────────────────────────────
function hardResetRooms() {
  if (confirm('This will reload all room data and restore photo links. Any custom rooms you added will be removed. Continue?')) {
    DB.rooms.reset();
    loadRoomsTab();

    const msg = document.getElementById('reset-msg');
    msg.style.display = 'block';

    setTimeout(() => {
      msg.style.display = 'none';
    }, 8000);
  }
}

function loadRoomsTab() {
  const rooms = DB.rooms.getAll();
  const container = document.getElementById('rooms-admin-list');

  if (rooms.length === 0) {
    container.innerHTML =
      '<div class="admin-card"><p style="color:var(--muted)">No rooms yet.</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="admin-card" style="padding:0;overflow:hidden">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Type</th>
            <th>Price / Night</th>
            <th>Capacity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rooms.map(r => `
            <tr>
              <td><strong>${r.icon || ''} ${r.name}</strong></td>
              <td><span class="badge badge--${r.type}">${r.type}</span></td>
              <td>₹${r.price.toLocaleString('en-IN')}</td>
              <td>${r.capacity} guests</td>
              <td>
                <span class="badge ${r.available ? 'badge--read' : 'badge--closed'}">
                  ${r.available ? 'Available' : 'Unavailable'}
                </span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="action-btn" onclick="editRoom('${r.id}')">Edit</button>
                  <button class="action-btn" onclick="toggleAvailability('${r.id}', ${!r.available})">
                    ${r.available ? 'Disable' : 'Enable'}
                  </button>
                  <button class="action-btn action-btn--danger" onclick="deleteRoom('${r.id}')">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleAvailability(id, val) {
  DB.rooms.update(id, { available: val });
  loadRoomsTab();
}

function deleteRoom(id) {
  if (confirm('Delete this room? This cannot be undone.')) {
    DB.rooms.delete(id);
    loadRoomsTab();
  }
}

function editRoom(id) {
  const r = DB.rooms.getById(id);
  if (!r) return;

  document.getElementById('edit-id').value = r.id;
  document.getElementById('r-name').value = r.name;
  document.getElementById('r-type').value = r.type;
  document.getElementById('r-price').value = r.price;
  document.getElementById('r-size').value = r.size || '';
  document.getElementById('r-beds').value = r.beds || '';
  document.getElementById('r-capacity').value = r.capacity || '';
  document.getElementById('r-icon').value = r.icon || '';
  document.getElementById('r-desc').value = r.description || '';
  document.getElementById('r-features').value = (r.features || []).join(', ');
  document.getElementById('r-inclusions').value = (r.inclusions || []).join(', ');
  document.getElementById('r-badge').value = r.badge || '';
  document.getElementById('r-available').checked = r.available;

  showTab('add-room');
}

// ── Add / Edit Room form ─────────────────────────────────
document.getElementById('room-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const splitByComma = val =>
    val.split(',').map(s => s.trim()).filter(Boolean);

  const data = {
    name: document.getElementById('r-name').value,
    type: document.getElementById('r-type').value,
    price: parseInt(document.getElementById('r-price').value),
    size: document.getElementById('r-size').value,
    beds: document.getElementById('r-beds').value,
    capacity: parseInt(document.getElementById('r-capacity').value) || 2,
    icon: document.getElementById('r-icon').value || '🛏️',
    description: document.getElementById('r-desc').value,
    features: splitByComma(document.getElementById('r-features').value),
    inclusions: splitByComma(document.getElementById('r-inclusions').value),
    badge: document.getElementById('r-badge').value || null,
    available: document.getElementById('r-available').checked
  };

  const editId = document.getElementById('edit-id').value;

  if (editId) {
    DB.rooms.update(editId, data);
  } else {
    DB.rooms.add(data);
  }

  const msg = document.getElementById('room-save-msg');
  msg.style.display = 'block';

  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);

  clearRoomForm();
});

function clearRoomForm() {
  document.getElementById('room-form').reset();
  document.getElementById('edit-id').value = '';
}

// ── Enquiries Tab ────────────────────────────────────────
function loadEnquiriesTab() {
  const enquiries = getEnquiries();
  const container = document.getElementById('enquiries-list');

  if (enquiries.length === 0) {
    container.innerHTML =
      '<div class="admin-card"><p style="color:var(--muted)">No enquiries yet. They will appear here when guests submit the contact form.</p></div>';
    return;
  }

  container.innerHTML = enquiries.map(e => {
    const date = new Date(e.createdAt || e.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return `
      <div class="enquiry-item">
        <div class="enquiry-item__header">
          <div>
            <span class="enquiry-item__name">${e.name}</span>
            <span class="badge badge--${e.status}" style="margin-left:0.75rem">
              ${e.status}
            </span>
          </div>

          <div class="action-btns">
            <button class="action-btn" onclick="DB.enquiries.updateStatus('${e.id}','read');loadEnquiriesTab()">
              Mark Read
            </button>
            <button class="action-btn" onclick="DB.enquiries.updateStatus('${e.id}','closed');loadEnquiriesTab()">
              Close
            </button>
            <button class="action-btn action-btn--danger" onclick="DB.enquiries.delete('${e.id}');loadEnquiriesTab()">
              Delete
            </button>
          </div>
        </div>

        <div class="enquiry-item__meta">
          📧 <a href="mailto:${e.email}" style="color:inherit">${e.email}</a>
          &nbsp;|&nbsp; 📅 Check-in: ${e.checkin || '—'} → ${e.checkout || '—'}
          &nbsp;|&nbsp; 🛏️ ${e.roomType || 'Any room'}
          &nbsp;|&nbsp; Received: ${date}
        </div>

        ${e.message
          ? `<div class="enquiry-item__msg">"${e.message}"</div>`
          : ''}
      </div>
    `;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────
// Initial loadDashboard is triggered by fetchCosmosEnquiries().then() at the top