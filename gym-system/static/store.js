/* ==========================================================================
   Application state store (vanilla JS)
   Data is saved to the browser's localStorage so check-ins, sales and
   history survive refreshes and are still there the next day.
   (Login state is NOT saved - you sign in again after a refresh.)
   ========================================================================== */

const STORAGE_KEY = 'gladiator_sparta_gym_data_v1';
const PERSISTED_KEYS = ['sales', 'checkIns', 'products', 'members', 'memberPayments', 'counters'];

const USERS = [
  { username: 'owner', password: 'owner123', role: 'owner', name: 'Owner Admin' },
  { username: 'staff', password: 'staff123', role: 'staff', name: 'Staff Member' },
];

/* Local calendar date as "YYYY-MM-DD" (uses the computer's timezone, so a
   sale at 11 PM counts toward that day and not the next one). */
function toDateKey(value) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMembershipDuration(type) {
  switch (type) {
    case 'Weekly': return 7;
    case '2 Weeks': return 14;
    case 'Monthly': return 30;
    default: return 7;
  }
}

function getMembershipPrice(type) {
  switch (type) {
    case 'Weekly': return 100;
    case '2 Weeks': return 200;
    case 'Monthly': return 400;
    default: return 100;
  }
}

const Store = {
  state: {
    user: null,
    sales: [],
    checkIns: [],        // { id, memberId, memberName, timestamp (time in), timeOut }
    products: [],
    members: [],
    memberPayments: [],  // permanent record of membership fees collected
    counters: { member: 0, product: 0 },
  },

  listeners: [],

  /* ---------- persistence ---------- */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      PERSISTED_KEYS.forEach((key) => {
        if (key === 'counters') {
          if (saved.counters && typeof saved.counters === 'object') {
            this.state.counters = { member: 0, product: 0, ...saved.counters };
          }
        } else if (Array.isArray(saved[key])) {
          this.state[key] = saved[key];
        }
      });
    } catch (err) {
      console.warn('Could not load saved data:', err);
    }
  },

  save() {
    try {
      const data = {};
      PERSISTED_KEYS.forEach((key) => { data[key] = this.state[key]; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Could not save data:', err);
    }
  },

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },

  notify() {
    this.save();
    this.listeners.forEach((fn) => fn(this.state));
  },

  /* Next ID like M004 / P012. Uses a running counter so an ID is never
     reused after a delete (old check-ins and history still point to it). */
  nextId(prefix, counterKey, list) {
    const highestInUse = list.reduce((hi, item) => {
      const n = parseInt(String(item.id).slice(prefix.length), 10);
      return Number.isFinite(n) && n > hi ? n : hi;
    }, 0);
    const next = Math.max(this.state.counters[counterKey] || 0, highestInUse) + 1;
    this.state.counters[counterKey] = next;
    return `${prefix}${String(next).padStart(3, '0')}`;
  },

  /* ---------- auth ---------- */
  login(username, password) {
    const found = USERS.find((u) => u.username === username && u.password === password);
    if (found) {
      this.state.user = { username: found.username, role: found.role, name: found.name };
      this.notify();
      return true;
    }
    return false;
  },

  logout() {
    this.state.user = null;
    this.notify();
  },

  /* ---------- sales ---------- */
  addSale(sale) {
    const newSale = { ...sale, id: `SALE-${Date.now()}`, timestamp: new Date().toISOString() };
    this.state.sales.push(newSale);
    sale.items.forEach((item) => {
      const p = this.state.products.find((p) => p.id === item.productId);
      if (p) p.stock -= item.quantity;
    });
    this.notify();
  },

  /* ---------- check-in / time in / time out ---------- */
  addCheckIn(checkIn) {
    const record = {
      ...checkIn,
      id: `CHK-${Date.now()}`,
      timestamp: new Date().toISOString(), // time in
      timeOut: null,
    };
    this.state.checkIns.push(record);
    this.notify();
    return record;
  },

  /* Today's session for this member that has not been timed out yet */
  getOpenCheckIn(memberId) {
    const today = toDateKey(new Date());
    for (let i = this.state.checkIns.length - 1; i >= 0; i--) {
      const c = this.state.checkIns[i];
      if (c.memberId === memberId && !c.timeOut && toDateKey(c.timestamp) === today) return c;
    }
    return null;
  },

  timeOutCheckIn(checkInId) {
    const c = this.state.checkIns.find((c) => c.id === checkInId);
    if (!c || c.timeOut) return null;
    c.timeOut = new Date().toISOString();
    this.notify();
    return c;
  },

  /* ---------- products ---------- */
  addProduct(product) {
    const id = this.nextId('P', 'product', this.state.products);
    this.state.products.push({ ...product, id });
    this.notify();
  },

  updateProduct(id, updates) {
    const p = this.state.products.find((p) => p.id === id);
    if (p) Object.assign(p, updates);
    this.notify();
  },

  deleteProduct(id) {
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.notify();
  },

  /* ---------- members ---------- */
  addMember(member) {
    const joinDate = new Date();
    const expiryDate = new Date(joinDate.getTime() + getMembershipDuration(member.membershipType) * 24 * 60 * 60 * 1000);
    const price = getMembershipPrice(member.membershipType);
    const id = this.nextId('M', 'member', this.state.members);

    this.state.members.push({
      ...member,
      id,
      status: 'Active',
      joinDate: joinDate.toISOString().split('T')[0],
      joinedAt: joinDate.toISOString(),
      expiryDate: expiryDate.toISOString().split('T')[0],
      price,
    });

    // Keep a permanent record of the fee so earnings history stays correct
    // even if this member is deleted later.
    this.state.memberPayments.push({
      id: `PAY-${Date.now()}`,
      memberId: id,
      memberName: member.name,
      membershipType: member.membershipType,
      price,
      timestamp: joinDate.toISOString(),
    });

    this.notify();
  },

  updateMember(id, updates) {
    const m = this.state.members.find((m) => m.id === id);
    if (m) Object.assign(m, updates);
    this.notify();
  },

  deleteMember(id) {
    this.state.members = this.state.members.filter((m) => m.id !== id);
    this.notify();
  },
};

Store.load();
