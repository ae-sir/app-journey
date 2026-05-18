const uploadZone  = document.getElementById('upload-zone');
const fileInput   = document.getElementById('file-input');
const previewWrap = document.getElementById('preview-wrapper');
const previewImg  = document.getElementById('preview-img');
const clearBtn    = document.getElementById('clear-btn');
const scanBtn     = document.getElementById('scan-btn');
const errorMsg    = document.getElementById('error-message');
const resultsCard = document.getElementById('results-card');

let selectedFile = null;

// ── File selection ───────────────────────────────────────────

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

// Drag-and-drop support
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadFile(file);
  } else {
    showError('Please drop an image file.');
  }
});

function loadFile(file) {
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewWrap.classList.add('visible');
    uploadZone.style.display = 'none';
    scanBtn.disabled = false;
    clearError();
    resultsCard.classList.remove('visible');
  };
  reader.readAsDataURL(file);
}

clearBtn.addEventListener('click', resetUpload);

function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewWrap.classList.remove('visible');
  uploadZone.style.display = '';
  scanBtn.disabled = true;
  clearError();
  resultsCard.classList.remove('visible');
}

// ── Scan receipt ─────────────────────────────────────────────

scanBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning…';
  scanBtn.classList.add('loading');
  clearError();
  resultsCard.classList.remove('visible');

  const formData = new FormData();
  formData.append('receipt', selectedFile);

  try {
    const res = await fetch('/api/scan-receipt', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong — please try again.');
      return;
    }

    renderResults(data);
  } catch {
    showError('Network error — make sure the server is running.');
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan Receipt';
    scanBtn.classList.remove('loading');
  }
});

// ── Render results ───────────────────────────────────────────

function renderResults(data) {
  document.getElementById('store-name').textContent = data.store || 'Unknown Store';
  document.getElementById('receipt-date').textContent = data.date || '';

  const tbody = document.getElementById('items-body');
  tbody.innerHTML = '';

  if (Array.isArray(data.items)) {
    data.items.forEach((item) => {
      const tr = document.createElement('tr');
      const priceText = item.price != null ? formatPrice(item.price) : '—';
      tr.innerHTML = `<td>${escapeHtml(item.name)}</td><td>${escapeHtml(priceText)}</td>`;
      tbody.appendChild(tr);
    });
  }

  // Subtotal and tax rows — hide if not present on this receipt
  setTotalRow('subtotal-row', 'subtotal-value', data.subtotal);
  setTotalRow('tax-row', 'tax-value', data.tax);

  document.getElementById('total-value').textContent =
    data.total != null ? formatPrice(data.total) : '—';

  resultsCard.classList.add('visible');
}

function setTotalRow(rowId, valueId, amount) {
  const row = document.getElementById(rowId);
  if (amount != null) {
    document.getElementById(valueId).textContent = formatPrice(amount);
    row.style.display = '';
  } else {
    row.style.display = 'none';
  }
}

// Adds a currency symbol if the value is a plain number string
function formatPrice(value) {
  const str = String(value).replace(/[^0-9.]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return value;
  return '$' + num.toFixed(2);
}

// Prevents XSS if a store name or item contains HTML characters
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(msg) {
  errorMsg.textContent = msg;
}

function clearError() {
  errorMsg.textContent = '';
}
