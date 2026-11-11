(() => {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Trading hours are read from the hours table in index.html, so that table is the only place to edit them.
  const hours = {};
  document.querySelectorAll('.hours tr[data-day]').forEach((tr) => {
    const { day, open, close } = tr.dataset;
    hours[day] = open ? { open: toMinutes(open), close: toMinutes(close) } : null;
  });

  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function label(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
  }

  function sydneyNow() {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney', weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return { day: DAY_NAMES.indexOf(get('weekday')), mins: Number(get('hour')) * 60 + Number(get('minute')) };
  }

  function updateStatus() {
    const { day, mins } = sydneyNow();
    const today = hours[day];
    let text;
    let open = false;

    if (today && mins >= today.open && mins < today.close) {
      open = true;
      text = `Open now until ${label(today.close)}`;
    } else if (today && mins < today.open) {
      text = `Closed now. Opens today at ${label(today.open)}`;
    } else {
      for (let i = 1; i <= 7; i++) {
        const next = (day + i) % 7;
        if (hours[next]) {
          const when = i === 1 ? 'tomorrow' : DAY_NAMES[next];
          text = `Closed now. Opens ${when} at ${label(hours[next].open)}`;
          break;
        }
      }
    }

    document.querySelectorAll('[data-status]').forEach((el) => {
      el.textContent = text;
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
    });
    document.querySelectorAll('.hours tr[data-day]').forEach((tr) => {
      tr.classList.toggle('is-today', Number(tr.dataset.day) === day);
    });
  }

  if (Object.keys(hours).length) {
    updateStatus();
    setInterval(updateStatus, 60000);
  }

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Order docket: a read-it-out list for phone orders. Nothing leaves the device.
  const dialog = document.querySelector('[data-docket]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const tab = document.querySelector('[data-docket-open]');
  const list = document.querySelector('[data-docket-list]');
  const order = new Map();
  const money = (n) => `$${n.toFixed(2)}`;

  document.querySelectorAll('.item').forEach((item) => {
    const name = item.querySelector('h4').textContent.trim();
    const price = parseFloat(item.querySelector('.price').textContent.replace('$', '')) || 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add';
    btn.textContent = '+';
    btn.setAttribute('aria-label', `Add ${name} to my order`);
    btn.addEventListener('click', () => {
      const line = order.get(name) || { price, qty: 0 };
      line.qty += 1;
      order.set(name, line);
      btn.classList.add('is-added');
      setTimeout(() => btn.classList.remove('is-added'), 350);
      render();
    });
    item.querySelector('.row').append(btn);
  });

  function render() {
    let count = 0;
    let total = 0;
    list.replaceChildren();

    order.forEach((line, name) => {
      count += line.qty;
      total += line.qty * line.price;

      const li = document.createElement('li');
      const title = document.createElement('span');
      title.textContent = name;

      const qty = document.createElement('span');
      qty.className = 'qty';
      const minus = stepper('−', `Remove one ${name}`, () => change(name, -1));
      const n = document.createElement('span');
      n.textContent = line.qty;
      const plus = stepper('+', `Add one more ${name}`, () => change(name, 1));
      qty.append(minus, n, plus);

      const cost = document.createElement('span');
      cost.textContent = line.price ? money(line.qty * line.price) : 'Free';
      li.append(title, qty, cost);
      list.append(li);
    });

    if (!count) {
      const empty = document.createElement('li');
      empty.className = 'docket-empty';
      empty.style.display = 'block';
      empty.textContent = 'Nothing here yet. Tap the plus beside a menu item to add it.';
      list.append(empty);
    }

    document.querySelectorAll('[data-docket-total]').forEach((el) => { el.textContent = money(total); });
    document.querySelector('[data-docket-count]').textContent = count;
    tab.hidden = count === 0;
  }

  function stepper(text, aria, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', onClick);
    return b;
  }

  function change(name, delta) {
    const line = order.get(name);
    line.qty += delta;
    if (line.qty <= 0) order.delete(name);
    render();
  }

  tab.addEventListener('click', () => dialog.showModal());
  document.querySelector('[data-docket-close]').addEventListener('click', () => dialog.close());
  document.querySelector('[data-docket-clear]').addEventListener('click', () => { order.clear(); render(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  render();
})();
