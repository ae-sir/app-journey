// SUPABASE_URL and SUPABASE_ANON_KEY are injected by build.js → config.js
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let expenses        = [];
let editingId       = null;
let categoryFilter  = 'all';

const form              = document.getElementById('expense-form');
const descInput         = document.getElementById('description');
const amountInput       = document.getElementById('amount');
const categoryInput     = document.getElementById('category');
const subcategoryInput  = document.getElementById('subcategory');
const filterSelect      = document.getElementById('category-filter');
const expenseList    = document.getElementById('expense-list');
const totalEl        = document.getElementById('total');
const statusEl       = document.getElementById('status-message');

// ── Database operations ──────────────────────────────────────

async function fetchExpenses() {
  const { data, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showStatus(error.message, 'error'); return; }
  expenses = data;
  render();
}

async function createExpense(description, amount, category, subcategory) {
  const { error } = await supabaseClient
    .from('expenses')
    .insert({ description, amount, category, subcategory: subcategory || null });

  if (error) { showStatus(error.message, 'error'); return; }
  await fetchExpenses();
  showStatus('Expense added.', 'success');
}

async function deleteExpense(id) {
  const { error } = await supabaseClient
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) { showStatus(error.message, 'error'); return; }
  await fetchExpenses();
}

async function saveEdit(id, description, amount, category, subcategory) {
  const { error } = await supabaseClient
    .from('expenses')
    .update({ description, amount, category, subcategory: subcategory || null })
    .eq('id', id);

  if (error) { showStatus(error.message, 'error'); return; }
  editingId = null;
  await fetchExpenses();
  showStatus('Expense updated.', 'success');
}

// ── Rendering ────────────────────────────────────────────────

function render() {
  const visible = categoryFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === categoryFilter);

  updateTotal(visible);
  expenseList.innerHTML = '';

  if (visible.length === 0) {
    const msg = expenses.length === 0
      ? 'No expenses yet. Add one above.'
      : `No expenses in "${categoryFilter}".`;
    expenseList.innerHTML = `<tr><td colspan="6" class="loading">${msg}</td></tr>`;
    return;
  }

  visible.forEach(expense => {
    expenseList.appendChild(
      expense.id === editingId ? buildEditRow(expense) : buildRow(expense)
    );
  });
}

function buildRow(expense) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${safe(expense.description)}</td>
    <td class="amount">$${Number(expense.amount).toFixed(2)}</td>
    <td><span class="category-badge">${safe(expense.category)}</span></td>
    <td class="subcategory">${expense.subcategory ? safe(expense.subcategory) : '<span class="empty">—</span>'}</td>
    <td class="date">${formatDate(expense.created_at)}</td>
    <td class="actions">
      <button class="btn-edit">Edit</button>
      <button class="btn-delete">Delete</button>
    </td>
  `;
  tr.querySelector('.btn-edit').addEventListener('click', () => {
    editingId = expense.id;
    render();
  });
  tr.querySelector('.btn-delete').addEventListener('click', () => {
    if (confirm(`Delete "${expense.description}"?`)) deleteExpense(expense.id);
  });
  return tr;
}

function buildEditRow(expense) {
  const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Other'];
  const options = categories
    .map(c => `<option value="${c}" ${c === expense.category ? 'selected' : ''}>${c}</option>`)
    .join('');

  const tr = document.createElement('tr');
  tr.classList.add('editing');
  tr.innerHTML = `
    <td><input class="edit-input" id="edit-desc"        value="${safe(expense.description)}"></td>
    <td><input class="edit-input" id="edit-amount"      type="number" step="0.01" min="0.01" value="${expense.amount}"></td>
    <td><select class="edit-input" id="edit-category">${options}</select></td>
    <td><input class="edit-input" id="edit-subcategory" value="${expense.subcategory ? safe(expense.subcategory) : ''}" placeholder="Optional"></td>
    <td class="date">${formatDate(expense.created_at)}</td>
    <td class="actions">
      <button class="btn-save">Save</button>
      <button class="btn-cancel">Cancel</button>
    </td>
  `;
  tr.querySelector('.btn-save').addEventListener('click', () => {
    const desc        = document.getElementById('edit-desc').value.trim();
    const amount      = parseFloat(document.getElementById('edit-amount').value);
    const category    = document.getElementById('edit-category').value;
    const subcategory = document.getElementById('edit-subcategory').value.trim();
    if (!desc || isNaN(amount) || amount <= 0) {
      showStatus('Description and a positive amount are required.', 'error');
      return;
    }
    saveEdit(expense.id, desc, amount, category, subcategory);
  });
  tr.querySelector('.btn-cancel').addEventListener('click', () => {
    editingId = null;
    render();
  });
  return tr;
}

function updateTotal(visible) {
  const total = visible.reduce((sum, e) => sum + Number(e.amount), 0);
  totalEl.textContent = `$${total.toFixed(2)}`;
}

// ── Helpers ──────────────────────────────────────────────────

function showStatus(message, type = 'success') {
  statusEl.textContent = message;
  statusEl.className   = `status ${type}`;
  clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className   = 'status';
  }, 3500);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function safe(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Events ───────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const description = descInput.value.trim();
  const amount      = parseFloat(amountInput.value);
  const category    = categoryInput.value;
  const subcategory = subcategoryInput.value.trim();

  if (!description || isNaN(amount) || amount <= 0) {
    showStatus('Please enter a description and a positive amount.', 'error');
    return;
  }

  await createExpense(description, amount, category, subcategory);
  form.reset();
  descInput.focus();
});

filterSelect.addEventListener('change', () => {
  categoryFilter = filterSelect.value;
  editingId = null;
  render();
});

// ── Init ─────────────────────────────────────────────────────

fetchExpenses();
