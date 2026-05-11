/**
 * db.js — Local Database Layer (Phase 1: localStorage)
 *
 * PHASE UPGRADE PATH:
 * Phase 2: Replace localStorage calls with fetch() to a hosted API (Supabase / JSONBin)
 * Phase 3: Replace with Azure Functions + Cosmos DB / Azure SQL API calls
 *
 * The rest of the app only calls DB.rooms.getAll(), DB.enquiries.add(), etc.
 * So swapping the backend only requires changing THIS file.
 */

const DB = (() => {
  const ROOMS_KEY     = 'goldensun_rooms';
  const ENQUIRIES_KEY = 'goldensun_enquiries';

  // ── Default seed data ────────────────────────────────────
  const DEFAULT_ROOMS = [
    {
      id: 'r001',
      name: 'Classic Heritage Room',
      type: 'standard',
      price: 4500,
      currency: 'INR',
      size: '28 sqm',
      capacity: 2,
      beds: '1 King',
      icon: '🛏️',
      image: 'images/room-r001.jpg',
      description: 'Elegant standard rooms blending colonial heritage with modern comfort. Overlooking the lush garden courtyard, each room features hand-crafted wooden furniture and premium Egyptian cotton linens.',
      inclusions: ['Breakfast for 2', 'Wi-Fi', 'Daily housekeeping', 'Welcome drink'],
      features: ['King Bed', 'Garden View', 'Air Conditioning', 'Mini Bar'],
      available: true
    },
    {
      id: 'r002',
      name: 'Deluxe Pool View Room',
      type: 'deluxe',
      price: 7500,
      currency: 'INR',
      size: '38 sqm',
      capacity: 2,
      beds: '1 King',
      icon: '🌊',
      image: 'images/room-r002.jpg',
      description: 'Spacious deluxe rooms with breathtaking views of the heated pool and landscaped gardens. Features a private balcony, premium bathroom with rainfall shower, and curated local art.',
      inclusions: ['Breakfast & Evening Tea', 'Wi-Fi', 'Daily housekeeping', 'Welcome hamper', 'Pool access'],
      features: ['King Bed', 'Pool View', 'Private Balcony', 'Rainfall Shower', 'Mini Bar'],
      available: true
    },
    {
      id: 'r003',
      name: 'Deluxe City View Room',
      type: 'deluxe',
      price: 6500,
      currency: 'INR',
      size: '35 sqm',
      capacity: 2,
      beds: '2 Queen',
      icon: '🏙️',
      image: 'images/room-r003.jpg',
      description: 'Modern deluxe rooms on upper floors offering panoramic views of Bhubaneswar skyline. Twin queen beds make this ideal for families or colleagues travelling together.',
      inclusions: ['Breakfast for 2', 'Wi-Fi', 'Daily housekeeping', 'City tour map'],
      features: ['2 Queen Beds', 'City View', 'Air Conditioning', 'Work Desk', 'Mini Bar'],
      available: true
    },
    {
      id: 'r004',
      name: 'Royal Suite',
      type: 'suite',
      price: 18000,
      currency: 'INR',
      size: '75 sqm',
      capacity: 3,
      beds: '1 King + Sofa',
      icon: '👑',
      image: 'images/room-r004.jpg',
      description: 'The pinnacle of luxury. A full living suite with separate bedroom, lounge, and private dining area. Handpicked antique décor, butler service, and exclusive spa credits included.',
      inclusions: ['All Meals', 'Butler Service', 'Airport Transfer', 'Spa Credit ₹2000', 'Premium Minibar', 'Wi-Fi'],
      features: ['King Bed', 'Living Room', 'Dining Area', 'Butler Service', 'Jacuzzi', 'Terrace'],
      available: true,
      badge: 'Most Popular'
    },
    {
      id: 'r005',
      name: 'Presidential Suite',
      type: 'suite',
      price: 32000,
      currency: 'INR',
      size: '120 sqm',
      capacity: 4,
      beds: '1 King + 2 Single',
      icon: '🏛️',
      image: 'images/room-r005.jpg',
      description: 'Our grandest accommodation — a two-room suite fit for royalty. Private terrace overlooking the city, dedicated concierge, and personalized chef service. An experience beyond compare.',
      inclusions: ['All Meals + Room Service', 'Dedicated Concierge', 'Airport Transfer (both ways)', 'Full Spa Day', 'Premium Cellar Access'],
      features: ['Master Bedroom', 'Second Bedroom', 'Private Terrace', 'Concierge', 'Chef Service', 'Pool View'],
      available: true,
      badge: 'Signature'
    },
    {
      id: 'r006',
      name: 'Standard Twin Room',
      type: 'standard',
      price: 3800,
      currency: 'INR',
      size: '25 sqm',
      capacity: 2,
      beds: '2 Single',
      icon: '🛏️',
      image: 'images/room-r006.jpg',
      description: 'Comfortable twin rooms ideal for business travellers and friends. Clean, well-appointed spaces with all essential amenities and quick access to conference facilities.',
      inclusions: ['Breakfast', 'Wi-Fi', 'Daily housekeeping'],
      features: ['2 Single Beds', 'Work Desk', 'Air Conditioning', 'Smart TV'],
      available: true
    }
  ];

  // ── Initialise DB with seed data if empty ────────────────
  function _init() {
    if (!localStorage.getItem(ROOMS_KEY)) {
      localStorage.setItem(ROOMS_KEY, JSON.stringify(DEFAULT_ROOMS));
    }
    if (!localStorage.getItem(ENQUIRIES_KEY)) {
      localStorage.setItem(ENQUIRIES_KEY, JSON.stringify([]));
    }
  }

  // ── Rooms API ────────────────────────────────────────────
  const rooms = {
    getAll() {
      _init();
      return JSON.parse(localStorage.getItem(ROOMS_KEY)) || [];
    },
    getById(id) {
      return this.getAll().find(r => r.id === id);
    },
    getByType(type) {
      if (type === 'all') return this.getAll();
      return this.getAll().filter(r => r.type === type);
    },
    add(room) {
      const all = this.getAll();
      room.id = 'r' + Date.now();
      all.push(room);
      localStorage.setItem(ROOMS_KEY, JSON.stringify(all));
      return room;
    },
    update(id, updates) {
      const all = this.getAll();
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates };
      localStorage.setItem(ROOMS_KEY, JSON.stringify(all));
      return all[idx];
    },
    delete(id) {
      const all = this.getAll().filter(r => r.id !== id);
      localStorage.setItem(ROOMS_KEY, JSON.stringify(all));
    },
    reset() {
      localStorage.setItem(ROOMS_KEY, JSON.stringify(DEFAULT_ROOMS));
    }
  };

  // ── Enquiries API ────────────────────────────────────────
  const enquiries = {
    getAll() {
      _init();
      return JSON.parse(localStorage.getItem(ENQUIRIES_KEY)) || [];
    },
    add(enquiry) {
      const all = this.getAll();
      enquiry.id = 'e' + Date.now();
      enquiry.date = new Date().toISOString();
      enquiry.status = 'new';
      all.unshift(enquiry);
      localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(all));
      return enquiry;
    },
    updateStatus(id, status) {
      const all = this.getAll();
      const idx = all.findIndex(e => e.id === id);
      if (idx !== -1) {
        all[idx].status = status;
        localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(all));
      }
    },
    delete(id) {
      const all = this.getAll().filter(e => e.id !== id);
      localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(all));
    }
  };

  return { rooms, enquiries };
})();
