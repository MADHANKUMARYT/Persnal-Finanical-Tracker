

(function () {
  const LS_KEY = 'pf_tracker_tx_v1';


  const form = document.getElementById('tx-form');
  const txType = document.getElementById('tx-type');
  const txAmount = document.getElementById('tx-amount');
  const txCategory = document.getElementById('tx-category');
  const txDate = document.getElementById('tx-date');
  const txDesc = document.getElementById('tx-desc');
  const addBtn = document.getElementById('add-tx');
  const clearAll = document.getElementById('clear-all');
  const filterMonth = document.getElementById('filter-month');
  const searchInput = document.getElementById('search');
  const exportCsvBtn = document.getElementById('export-csv');
  const importSampleBtn = document.getElementById('import-sample');

  const balanceEl = document.getElementById('balance');
  const incomeEl = document.getElementById('total-income');
  const expenseEl = document.getElementById('total-expense');
  const txList = document.getElementById('tx-list');
  const countEl = document.getElementById('count');

  const chartCanvas = document.getElementById('monthlyChart');
  let chartInstance = null;


  let txs = loadTxs();
  let filtered = [];


  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatMoney(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }


  txDate.value = todayISO();


  function loadTxs() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse txs', e);
      return [];
    }
  }

  function saveTxs() {
    localStorage.setItem(LS_KEY, JSON.stringify(txs));
  }

  // add tx
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const type = txType.value;
    const amount = parseFloat(txAmount.value);
    const cat = txCategory.value;
    const date = txDate.value;
    const desc = txDesc.value.trim();

    if (!amount || amount <= 0) {
      alert('Enter a valid amount');
      return;
    }
    if (!date) {
      alert('Choose a date');
      return;
    }

    const t = {
      id: id(),
      type: type,
      amount: Math.round(amount * 100) / 100,
      category: cat,
      date: date,
      desc: desc,
      created: new Date().toISOString()
    };

    txs.push(t);
    saveTxs();
    txAmount.value = '';
    txDesc.value = '';
    render();
  });


  clearAll.addEventListener('click', function () {
    if (!confirm('Clear ALL local data? This cannot be undone.')) return;
    txs = [];
    saveTxs();
    render();
  });


  exportCsvBtn.addEventListener('click', function () {
    if (!txs.length) {
      alert('No transactions to export');
      return;
    }
    const rows = [
      ['id', 'type', 'amount', 'category', 'date', 'description', 'created']
    ];
    txs.forEach(t => rows.push([t.id, t.type, t.amount, t.category, t.date, '"' + (t.desc || '') + '"', t.created]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  });


  importSampleBtn.addEventListener('click', function () {
    if (!confirm('Load sample data (this will append sample transactions)?')) return;
    const sample = [
      { id: id(), type: 'income', amount: 30000, category: 'Salary', date: recently(0), desc: 'Monthly salary', created: new Date().toISOString() },
      { id: id(), type: 'expense', amount: 450, category: 'Food', date: recently(1), desc: 'Lunch', created: new Date().toISOString() },
      { id: id(), type: 'expense', amount: 1200, category: 'Transport', date: recently(2), desc: 'Monthly pass', created: new Date().toISOString() },
      { id: id(), type: 'expense', amount: 800, category: 'Shopping', date: recently(5), desc: 'Shoes', created: new Date().toISOString() },
      { id: id(), type: 'income', amount: 5000, category: 'Freelance', date: recently(10), desc: 'Project', created: new Date().toISOString() }
    ];
    txs = txs.concat(sample);
    saveTxs();
    render();
  });

  function recently(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  filterMonth.addEventListener('input', render);
  searchInput.addEventListener('input', render);

  
  txList.addEventListener('click', function (ev) {
    const target = ev.target;
    const li = target.closest('.tx-item');
    if (!li) return;
    const txid = li.dataset.id;
    if (target.classList.contains('del')) {
      if (!confirm('Delete transaction?')) return;
      txs = txs.filter(t => t.id !== txid);
      saveTxs();
      render();
      return;
    }
    if (target.classList.contains('edit')) {
    
      const tx = txs.find(t => t.id === txid);
      if (!tx) return;
      const newAmt = prompt('Amount (₹)', tx.amount);
      const newDesc = prompt('Description', tx.desc || '');
      if (newAmt !== null) {
        const a = parseFloat(newAmt);
        if (!isNaN(a)) tx.amount = Math.round(a * 100) / 100;
      }
      if (newDesc !== null) tx.desc = newDesc;
      saveTxs();
      render();
      return;
    }
  });

  
  function render() {

    const month = filterMonth.value;
    const q = (searchInput.value || '').trim().toLowerCase();

    filtered = txs.slice().sort((a, b) => b.date.localeCompare(a.date));

    if (month) {
      filtered = filtered.filter(t => t.date.slice(0, 7) === month);
    }

    if (q) {
      filtered = filtered.filter(t => (t.desc || '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }

  
    let totalIncome = 0;
    let totalExpense = 0;
    filtered.forEach(t => {
      if (t.type === 'income') totalIncome += Number(t.amount);
      else totalExpense += Number(t.amount);
    });

    const balance = totalIncome - totalExpense;
    balanceEl.textContent = formatMoney(balance);
    incomeEl.textContent = formatMoney(totalIncome);
    expenseEl.textContent = formatMoney(totalExpense);

    // list
    txList.innerHTML = '';
    filtered.forEach(t => {
      const li = document.createElement('li');
      li.className = 'tx-item';
      li.dataset.id = t.id;

      const left = document.createElement('div');
      left.className = 'tx-left';

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.background = t.type === 'income' ? 'var(--green)' : 'var(--red)';

      const meta = document.createElement('div');
      meta.innerHTML = `<div><strong>${t.category}</strong> • ${t.date}</div><div class="tx-meta">${t.desc || ''}</div>`;

      left.appendChild(dot);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.innerHTML = `<div class="tx-amount">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
                         <div class="actions-small">
                           <button class="small-btn edit">Edit</button>
                           <button class="small-btn del">Delete</button>
                         </div>`;

      li.appendChild(left);
      li.appendChild(right);
      txList.appendChild(li);
    });

    countEl.textContent = `${filtered.length} records`;

   
    updateChart();
  }

  function updateChart() {

    const labels = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toISOString().slice(0, 7));
    }

    const incomeSeries = labels.map(l => 0);
    const expenseSeries = labels.map(l => 0);

    txs.forEach(t => {
      const ym = t.date.slice(0, 7);
      const idx = labels.indexOf(ym);
      if (idx >= 0) {
        if (t.type === 'income') incomeSeries[idx] += Number(t.amount);
        else expenseSeries[idx] += Number(t.amount);
      }
    });

    
    const data = {
      labels: labels,
      datasets: [
        {
          label: 'Income',
          data: incomeSeries,
          backgroundColor: 'rgba(5,150,105,0.12)',
          borderColor: 'rgba(5,150,105,0.9)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Expense',
          data: expenseSeries,
          backgroundColor: 'rgba(239,68,68,0.12)',
          borderColor: 'rgba(239,68,68,0.9)',
          tension: 0.3,
          fill: true
        }
      ]
    };

    if (chartInstance) {
      chartInstance.data = data;
      chartInstance.update();
      return;
    }

    chartInstance = new Chart(chartCanvas.getContext('2d'), {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            ticks: {
              callback: function (value) { return '₹' + value; }
            }
          }
        }
      }
    });
  }

  
  function exportCSVAll() {
    if (!txs.length) {
      alert('No transactions to export');
      return;
    }
    const rows = [
      ['id', 'type', 'amount', 'category', 'date', 'description', 'created']
    ];
    txs.forEach(t => rows.push([t.id, t.type, t.amount, t.category, t.date, '"' + (t.desc || '') + '"', t.created]));
    return rows.map(r => r.join(',')).join('\n');
  }


  render();


  window.pf = {
    txs,
    save: saveTxs,
    exportCSV: exportCSVAll,
    loadSample: function () {
      importSampleBtn.click();
    }
  };
})();
