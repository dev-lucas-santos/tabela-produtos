const API = 'http://localhost:3000/api/products';
const productList = document.getElementById('productList');

let products = [];
let sortDirection = { 0: 1, 1: 1, 2: 1 };
const LOCAL_KEY = 'tabela-produtos:products';

function saveLocalProducts() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(products)); } catch (e) { console.warn('localStorage save falhou', e); }
}

function loadLocalProducts() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('localStorage load falhou', e);
        return [];
    }
}

async function fetchProducts() {
    // Tenta obter do API; se falhar (CORS, rede, sem servidor), usa localStorage
    try {
        const res = await fetch(API);
        if (res.ok) {
            products = await res.json();
            renderTable();
            return;
        }
    } catch (e) {
        // ignore, fallback abaixo
    }
    products = loadLocalProducts();
    renderTable();
}

async function addProduct() {
    const nameInput = document.getElementById('productName');
    const quantityInput = document.getElementById('productQuantity');
    const dateInput = document.getElementById('productDate');
    const name = nameInput.value.trim();
    const date = dateInput.value;
    const quantity = parseInt(quantityInput.value, 10);

    if (!name || !date) { alert('Preencha nome e data.'); return; }
    if (!Number.isInteger(quantity) || quantity <= 0) { alert('Quantidade inválida.'); return; }

    // Tenta salvar via API; se não for possível, salva localmente
    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, date, quantity })
        });
        if (res.ok) {
            nameInput.value = ''; dateInput.value = ''; quantityInput.value = '';
            await fetchProducts();
            return;
        }
    } catch (e) {
        // fallback local
    }

    // Operação local: cria id único e persiste em localStorage
    const maxId = products.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0);
    const id = Date.now() + (maxId + 1);
    const newProduct = { id, name, date, quantity };
    products.push(newProduct);
    saveLocalProducts();
    nameInput.value = ''; dateInput.value = ''; quantityInput.value = '';
    renderTable();
}

function renderTable(list = products) {
    productList.innerHTML = '';
    if (!list || !list.length) {
        productList.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;padding:12px;">Nenhum produto encontrado</td></tr>';
        return;
    }
    list.forEach(product => {
        const row = document.createElement('tr');
        const qty = (typeof product.quantity === 'number') ? product.quantity : parseInt(product.quantity || 0, 10);
        row.innerHTML = `
            <td>${escapeHtml(product.name)}</td>
            <td>${new Date(product.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td style="text-align:center">${qty}</td>
            <td style="white-space:nowrap">
                <button class="qty-btn" onclick="changeQuantity(${product.id}, -1)">Retirar</button>
                <button class="qty-btn" onclick="changeQuantity(${product.id}, 1)">Adicionar</button>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">Excluir</button>
            </td>
        `;
        productList.appendChild(row);
    });
}

function sortTable(columnIndex) {
    const dir = sortDirection[columnIndex] || 1;
    products.sort((a, b) => {
        if (columnIndex === 0) return dir * a.name.localeCompare(b.name);
        if (columnIndex === 1) return dir * (new Date(a.date) - new Date(b.date));
        if (columnIndex === 2) return dir * (Number(a.quantity) - Number(b.quantity));
        return 0;
    });
    sortDirection[columnIndex] = -dir;
    renderTable();
}

function searchProducts() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!q) { renderTable(); return; }
    const filtered = products.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const dateStr = new Date((p.date || '') + 'T00:00:00').toLocaleDateString('pt-BR').toLowerCase();
        const qtyMatch = String(p.quantity || '').includes(q);
        return nameMatch || dateStr.includes(q) || qtyMatch;
    });
    renderTable(filtered);
}

async function changeQuantity(id, delta) {
    // Tenta via API
    try {
        const res = await fetch(`${API}/${id}/quantity`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta })
        });
        if (res.ok) { await fetchProducts(); return; }
    } catch (e) {
        // fallback local
    }

    // Local: aplica alteração e persiste
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return;
    const current = Number(products[idx].quantity) || 0;
    const next = current + delta;
    products[idx].quantity = next < 0 ? 0 : next;
    saveLocalProducts();
    renderTable();
}

async function deleteProduct(id) {
    if (!confirm('Deseja excluir este produto?')) return;
    try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
        if (res.ok) { await fetchProducts(); return; }
    } catch (e) {
        // fallback local
    }

    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return;
    products.splice(idx, 1);
    saveLocalProducts();
    renderTable();
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});