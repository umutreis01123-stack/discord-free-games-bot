# 📦 Stok Kategorileri Sistemi - DEVAM

**Tarih:** 11 Haziran 2026  
**Status:** 🟡 Devam Aşamasında  

---

## ✅ TAMAMLANAN

### Backend (index.js)
- ✅ `db.categories` tablosu eklendi
- ✅ `POST /api/admin/categories` - Stok oluştur
- ✅ `DELETE /api/admin/categories/:id` - Stok sil
- ✅ `PUT /api/admin/categories/:id` - Stok güncelle
- ✅ `GET /api/categories` - Stokları getir
- ✅ Ürün eklenirken `categoryId` eklendi
- ✅ Sipariş onaylanırken stok kategorisinin miktarı azaltıldı

### Frontend HTML (public/index.html)
- ✅ Stok kategorileri grid'i eklendi (ana sayfada)
- ✅ Stok modal'ı eklendi (modal popup)
- ✅ Admin panele "Stoklar" tab'ı eklendi
- ✅ Ürün ekleme form'una category seçim alanı eklendi
- ✅ "Stok Oluştur" form'u eklendi

---

## ❌ YAPILACAK - JavaScript Fonksiyonları

public/index.html'in `<script>` bölümüne eklenmeli:

### 1. Category Modal Fonksiyonları

```javascript
// ✅ YENİ: Category Modal'ı Aç
async function openCategoryModal(categoryId, categoryName) {
    try {
        const response = await fetch('/api/products');
        const allProducts = await response.json();
        
        // Bu stoka ait ürünleri filtrele
        const categoryProducts = allProducts.filter(p => p.categoryId === categoryId);
        
        document.getElementById('categoryModalTitle').textContent = categoryName;
        
        if (categoryProducts.length === 0) {
            document.getElementById('categoryModalContent').innerHTML = '<p style="text-align: center; color: #7f8c8d;">Bu stokta ürün bulunmuyor</p>';
        } else {
            document.getElementById('categoryModalContent').innerHTML = categoryProducts.map(product => {
                const isOutOfStock = product.quantity <= 0;
                
                return `
                    <div class="user-item" style="margin-bottom: 15px; ${isOutOfStock ? 'opacity: 0.6;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <strong style="color: #e94560;">${product.name}</strong><br>
                                <span style="color: #95a5a6;">💰 ${product.credits} Kredi</span><br>
                                <span style="color: ${isOutOfStock ? '#e74c3c' : '#2ecc71'};">📦 ${isOutOfStock ? 'Stokta Yok' : `${product.quantity} adet mevcut`}</span>
                            </div>
                            ${currentUser && !isOutOfStock ? `
                                <button class="btn" style="padding: 8px 15px; font-size: 0.9em;" onclick="selectProductForPurchase('${product.id}', '${product.name}', ${product.credits})">
                                    Satın Al
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        document.getElementById('categoryModal').classList.add('active');
    } catch (error) {
        console.error('Stok modal açılamadı:', error);
    }
}

// ✅ YENİ: Stok Modal'ı Kapat
function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}
```

### 2. Kategori Yükleme Fonksiyonu

```javascript
// ✅ YENİ: Stokları Yükle
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const grid = document.getElementById('categoriesGrid');
        
        if (categories.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Henüz stok eklenmemiş</p>';
            return;
        }

        grid.innerHTML = categories.map(category => {
            const isOutOfStock = category.quantity <= 0;
            
            return `
                <div class="product-card" style="${isOutOfStock ? 'opacity: 0.6; border-color: #e74c3c;' : ''}" onclick="openCategoryModal('${category.id}', '${category.name}')">
                    <div style="text-align: center; cursor: pointer;">
                        <img src="${category.image}" alt="${category.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                        <div class="product-name">${category.name}</div>
                        <div class="product-info">
                            <span class="product-quantity" style="color: ${isOutOfStock ? '#e74c3c' : '#2ecc71'}">
                                📦 ${isOutOfStock ? 'Stokta Yok' : `${category.quantity} adet`}
                            </span>
                        </div>
                        <p style="color: #95a5a6; font-size: 0.9em; margin-top: 10px;">Tıklayarak ürünleri görün →</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Stoklar yüklenemedi:', error);
    }
}
```

### 3. Ürün Satın Alma Fonksiyonları

```javascript
// ✅ YENİ: Ürün Satın Almayı Başlat (Modal'dan)
function selectProductForPurchase(productId, productName, credits) {
    if (!currentUser) {
        alert('Lütfen giriş yapın');
        return;
    }

    const quantity = prompt(`${productName} - Kaç adet almak istiyorsunuz?`);
    if (!quantity || quantity <= 0) return;

    const totalCost = credits * quantity;
    
    if (currentUser.credits < totalCost) {
        alert('❌ Yetersiz kredi!');
        return;
    }

    if (confirm(`${quantity} adet ${productName} için ${totalCost} kredi harcanacak. Onaylıyor musunuz?`)) {
        buyProductFromCategory(productId, quantity, totalCost);
    }
}

// ✅ YENİ: Kategori'den Satın Al
async function buyProductFromCategory(productId, quantity, totalCost) {
    try {
        const response = await fetch('/api/buy-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, productId, quantity })
        });

        const data = await response.json();
        
        if (data.success) {
            alert('✅ Sipariş onay bekliyor! Admin onayladıktan sonra Discord DM\'den hesap gönderilecek.');
            
            // Verileri güncelle
            closeCategoryModal();
            loadCategories();
            await refreshUserData();
        } else {
            alert('❌ ' + data.error);
        }
    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
}
```

### 4. Admin Stok Yönetim Fonksiyonları

```javascript
// ✅ YENİ: Stok Oluştur
async function addCategory(event) {
    event.preventDefault();
    
    const name = document.getElementById('categoryName').value;
    const image = document.getElementById('categoryImage').value;
    const quantity = document.getElementById('categoryQuantity').value;

    try {
        const response = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, image, quantity })
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Stok oluşturuldu!');
            event.target.reset();
            loadCategories();
            loadAdminData();
            
            // Category select'ini güncelle
            reloadCategorySelect();
        } else {
            alert('❌ ' + (data.error || 'Hata oluştu'));
        }
    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
}

// ✅ YENİ: Category Select'ini Güncelle
async function reloadCategorySelect() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const select = document.getElementById('adminProductCategory');
        select.innerHTML = '<option value="">Stok Seç</option>';
        categories.forEach(category => {
            select.innerHTML += `<option value="${category.id}">${category.name} (${category.quantity} adet)</option>`;
        });
    } catch (error) {
        console.error('Category select yüklenemedi:', error);
    }
}

// ✅ YENİ: Stokları Admin Panelde Listele
async function loadCategoryManagement() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const list = document.getElementById('categoriesList');
        
        if (categories.length === 0) {
            list.innerHTML = '<p style="color: #7f8c8d; text-align: center;">Henüz stok eklenmemiş</p>';
            return;
        }

        list.innerHTML = categories.map(category => `
            <div class="user-item">
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px;">
                    <div>
                        <img src="${category.image}" alt="${category.name}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 5px; margin-bottom: 8px;">
                        <strong style="color: #e94560;">${category.name}</strong><br>
                        <span style="color: #95a5a6;">📦 ${category.quantity} adet</span><br>
                        <span style="color: #2ecc71;">🎮 ${category.products.length} ürün</span>
                    </div>
                    <div style="text-align: right;">
                        <button class="btn" style="padding: 5px 10px; font-size: 0.8em; margin-bottom: 5px;" onclick="editCategory('${category.id}')">Düzenle</button><br>
                        <button class="btn" style="padding: 5px 10px; font-size: 0.8em; background: #e74c3c;" onclick="deleteCategory('${category.id}')">Sil</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Stoklar yüklenemedi:', error);
    }
}
```

### 5. Ürün Ekleme Güncellemesi

```javascript
// ✅ GÜNCELLENEN: Ürün Ekle (categoryId'yi gerekli yap)
async function addProduct(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('adminProductCategory').value;
    const name = document.getElementById('adminProductName').value;
    const credits = document.getElementById('adminProductCredits').value;
    const accounts = document.getElementById('adminProductAccounts').value;

    if (!categoryId) {
        alert('❌ Lütfen stok seçin!');
        return;
    }

    try {
        const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, quantity: 1, credits, accounts, categoryId })
        });

        if (response.ok) {
            alert('✅ Ürün ve hesaplar eklendi!');
            event.target.reset();
            loadProducts();
            loadCategories();
            loadAdminData();
        } else {
            const data = await response.json();
            alert('❌ Hata: ' + (data.error || 'Bilinmeyen hata'));
        }
    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
}
```

### 6. Admin Tab Yönetimi

```javascript
// ✅ GÜNCELLENEN: switchAdminTab (categories sekmesine bak)
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.admin-tabs button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    event.target.classList.add('active');

    // Tab değiştiğinde ilgili verileri yükle
    if (tab === 'categories') {
        loadCategoryManagement();
    } else if (tab === 'orders') {
        loadPendingOrders();
    } else if (tab === 'stats') {
        loadAdminStats();
    }
}
```

---

## 🔧 Nerede Eklemeli?

Bu fonksiyonları `public/index.html`'in `<script>` bölümünde şu yerlere ekle:

1. **loadProducts() fonksiyonundan sonra** → `loadCategories()` ekle
2. **loadProducts() fonksiyonundan önce** → Diğer tüm fonksiyonları ekle
3. **loadAdminData() güncelle** → Category select'ini yükleyen kod ekle
4. **switchAdminTab() güncelle** → categories sekmesi kontrolü ekle

---

## 📝 HTML Değişiklikleri Özet

✅ Yapıldı:
- Stok grid'i HTML'de
- Stok modal HTML'de
- Admin "Stoklar" tab'ı
- Ürün form'a category select
- Stok oluştur formu

---

## 🚀 Next Steps

1. Yukarıdaki 6 JavaScript fonksiyonu ekle
2. `public/index.html`'i save et
3. `git add . && git commit && git push` yap
4. Test et:
   - Admin stok oluştur
   - Ana sayfada stok gözüksün
   - Stoka tıkla → modal açılsın
   - Ürün seç → adet sor
   - Kredi çek
   - Discord DM al

---

**Status:** 🟡 Devam Aşamasında  
**Tamamlanacak:** ~15 dakika  
**Zorluk:** 🟢 Kolay

