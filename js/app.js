const API = 'http://localhost:3000/api/products';
const productList = document.getElementById('productList');

let products = [];
let sortDirection = { 0: 1, 1: 1, 2: 1 };

async function fetchProducts() {
    const res = await fetch(API);
    products = await res.json();
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

    const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, quantity })
    });
    if (res.ok) {
        nameInput.value = ''; dateInput.value = ''; quantityInput.value = '';
        await fetchProducts();
    } else {
        alert('Erro ao salvar produto.');
    }
}

function renderTable(list = products) {
    productList.innerHTML = '';
    if (!list.length) {
        productList.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;padding:12px;">Nenhum produto encontrado</td></tr>';
        return;
    }
    list.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(product.name)}</td>
            <td>${new Date(product.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td style="text-align:center">${product.quantity}</td>
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
        if (columnIndex === 2) return dir * (a.quantity - b.quantity);
        return 0;
    });
    sortDirection[columnIndex] = -dir;
    renderTable();
}

function searchProducts() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!q) { renderTable(); return; }
    const filtered = products.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const dateStr = new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR').toLowerCase();
        const qtyMatch = String(p.quantity).includes(q);
        return nameMatch || dateStr.includes(q) || qtyMatch;
    });
    renderTable(filtered);
}

async function changeQuantity(id, delta) {
    const res = await fetch(`${API}/${id}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
    });
    if (res.ok) await fetchProducts();
}

async function deleteProduct(id) {
    if (!confirm('Deseja excluir este produto?')) return;
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchProducts();
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});