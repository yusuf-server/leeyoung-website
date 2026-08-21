# Checkout 页面迁移指南

## 📋 需要更新的部分

你的 `/src/pages/checkout.astro` 需要做以下修改来使用新的 WooCommerce Store API：

---

## 🔄 修改 1: 移除旧的Cart导入，使用新的WooCartManager

### 当前代码 (Line ~237):
```javascript
import { CartManager, type Cart } from '../lib/cart';
```

### 修改为:
```javascript
import { WooCartManager, type WooCart } from '../lib/woo-cart';
```

---

## 🔄 修改 2: 更新购物车获取逻辑

### 当前代码 (Line ~240-246):
```javascript
// Get cart data
let cart: Cart = CartManager.getCart();

// Redirect if cart is empty
if (cart.items.length === 0) {
  window.location.href = '/cart';
}
```

### 修改为:
```javascript
// Get cart data from WooCommerce
let cart: WooCart | null = null;
let isLoading = true;

// Load cart on page load
async function loadCart() {
  cart = await WooCartManager.getCart();

  // Redirect if cart is empty
  if (!cart || cart.items.length === 0) {
    window.location.href = '/cart';
    return;
  }

  isLoading = false;
  renderOrderSummary();
}

loadCart();
```

---

## 🔄 修改 3: 更新订单摘要渲染

### 当前代码 (Line ~308-368):
```javascript
function renderOrderSummary() {
  const summaryItems = document.querySelector('[data-summary-items]');

  if (summaryItems) {
    summaryItems.innerHTML = cart.items.map(item => `
      <div class="summary-item">
        <div class="summary-item-image">
          <img src="${item.image}" alt="${item.name}" />
          <span class="summary-item-qty">${item.quantity}</span>
        </div>
        // ... 省略
      </div>
    `).join('');
  }

  // Update totals
  document.querySelector('[data-summary="subtotal"]')!.textContent = `$${cart.subtotal.toFixed(2)}`;
  document.querySelector('[data-summary="shipping"]')!.textContent = cart.shipping === 0 ? 'Free' : `$${cart.shipping.toFixed(2)}`;
  document.querySelector('[data-summary="tax"]')!.textContent = `$${cart.tax.toFixed(2)}`;
  document.querySelector('[data-summary="total"] .amount')!.textContent = `$${cart.total.toFixed(2)}`;
}
```

### 修改为:
```javascript
function renderOrderSummary() {
  if (!cart) return;

  const summaryItems = document.querySelector('[data-summary-items]');

  if (summaryItems) {
    summaryItems.innerHTML = cart.items.map(item => `
      <div class="summary-item">
        <div class="summary-item-image">
          <img src="${item.images[0]?.thumbnail || item.images[0]?.src || ''}" alt="${item.name}" />
          <span class="summary-item-qty">${item.quantity}</span>
        </div>
        <div class="summary-item-details">
          <div class="summary-item-info">
            <div class="summary-item-name">${item.name}</div>
            <div class="summary-item-controls">
              <button class="qty-control-btn" data-action="decrease" data-item-key="${item.key}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-control-btn" data-action="increase" data-item-key="${item.key}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="summary-item-price">${WooCartManager.formatPrice(item.totals.line_total, cart)}</div>
        </div>
      </div>
    `).join('');

    // Add quantity control event listeners
    summaryItems.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.dataset.action;
        const itemKey = target.dataset.itemKey || '';

        const item = cart!.items.find(i => i.key === itemKey);
        if (!item) return;

        if (action === 'increase') {
          cart = await WooCartManager.updateQuantity(itemKey, item.quantity + 1);
        } else if (action === 'decrease' && item.quantity > 1) {
          cart = await WooCartManager.updateQuantity(itemKey, item.quantity - 1);
        }

        renderOrderSummary();
      });
    });
  }

  // Update totals using WooCommerce cart data
  document.querySelector('[data-summary="subtotal"]')!.textContent = WooCartManager.formatPrice(cart.totals.total_items, cart);

  const shippingText = cart.totals.total_shipping === '0' ? 'Free' : WooCartManager.formatPrice(cart.totals.total_shipping, cart);
  document.querySelector('[data-summary="shipping"]')!.textContent = shippingText;

  document.querySelector('[data-summary="tax"]')!.textContent = WooCartManager.formatPrice(cart.totals.total_tax, cart);
  document.querySelector('[data-summary="total"] .amount')!.textContent = WooCartManager.formatPrice(cart.totals.total_price, cart);
}
```

---

## 🔄 修改 4: 更新订单提交逻辑

### 当前代码 (Line ~418-503):
```javascript
async function submitOrder() {
  if (!validateForm()) {
    return;
  }

  const btn = document.getElementById('completeOrderBtn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const selectedGateway = paymentGateways.find(g => g.id === selectedPaymentMethod);

    const orderData = {
      payment_method: selectedPaymentMethod,
      // ... line_items with cart.items.map
    };

    const response = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (response.ok) {
      CartManager.clearCart();

      if (result.order.payment_url && selectedPaymentMethod !== 'bacs' && selectedPaymentMethod !== 'cod') {
        window.location.href = result.order.payment_url;
      } else {
        window.location.href = `/checkout/success?order_id=${result.order.id}`;
      }
    }
  } catch (error) {
    // ...
  }
}
```

### 修改为:
```javascript
async function submitOrder() {
  if (!validateForm()) {
    return;
  }

  const btn = document.getElementById('completeOrderBtn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const selectedGateway = paymentGateways.find(g => g.id === selectedPaymentMethod);

    // Prepare order data for WooCommerce Store API
    const orderData = {
      payment_method: selectedPaymentMethod,
      billing: {
        first_name: (document.getElementById('firstName') as HTMLInputElement).value,
        last_name: (document.getElementById('lastName') as HTMLInputElement).value,
        address_1: (document.getElementById('address') as HTMLInputElement).value,
        address_2: (document.getElementById('apartment') as HTMLInputElement).value,
        city: (document.getElementById('city') as HTMLInputElement).value,
        state: (document.getElementById('state') as HTMLSelectElement).value,
        postcode: (document.getElementById('postalCode') as HTMLInputElement).value,
        country: (document.getElementById('country') as HTMLSelectElement).value,
        email: (document.getElementById('email') as HTMLInputElement).value,
        phone: (document.getElementById('phone') as HTMLInputElement).value,
      },
      shipping: {
        first_name: (document.getElementById('firstName') as HTMLInputElement).value,
        last_name: (document.getElementById('lastName') as HTMLInputElement).value,
        address_1: (document.getElementById('address') as HTMLInputElement).value,
        address_2: (document.getElementById('apartment') as HTMLInputElement).value,
        city: (document.getElementById('city') as HTMLInputElement).value,
        state: (document.getElementById('state') as HTMLSelectElement).value,
        postcode: (document.getElementById('postalCode') as HTMLInputElement).value,
        country: (document.getElementById('country') as HTMLSelectElement).value,
      },
      // WooCommerce Store API uses the cart session, no need to send line_items
    };

    // Submit order to WooCommerce Store API
    const response = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 重要：包含cookies
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (response.ok) {
      // WooCommerce Store API automatically clears cart on successful order

      // Redirect to payment URL
      // WooCommerce will handle payment processing (including Stripe Elements)
      if (result.order.payment_url) {
        window.location.href = result.order.payment_url;
      } else {
        // For payment methods that don't require redirect (COD, BACS)
        window.location.href = `/checkout/success?order_id=${result.order.id}`;
      }
    } else {
      throw new Error(result.error || 'Order creation failed');
    }
  } catch (error) {
    console.error('Order submission failed:', error);
    alert('Failed to create order. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Complete order';
  }
}
```

---

## 🔄 修改 5: 移除配送方式变更逻辑

### 删除这部分代码 (Line ~508-521):
```javascript
// Shipping method change
document.querySelectorAll('input[name="shipping"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.value === 'express') {
      cart.shipping = 15;
    } else {
      cart.shipping = cart.subtotal > 100 ? 0 : 10;
    }
    cart.total = cart.subtotal + cart.tax + cart.shipping;
    renderOrderSummary();
  });
});
```

### 原因:
WooCommerce Store API 会自动计算配送费用，不需要手动处理。

---

## 🔄 修改 6: 更新初始化调用

### 当前代码 (Line ~530-532):
```javascript
// Initialize
loadPaymentGateways();
renderOrderSummary();
checkAuth();
```

### 修改为:
```javascript
// Initialize
loadPaymentGateways();
// renderOrderSummary() 现在在 loadCart() 中调用
checkAuth();
```

---

## ✅ 完成后的效果

修改完成后，你的checkout页面将：

1. ✅ 从WooCommerce服务器获取购物车数据
2. ✅ 使用WooCommerce Store API创建订单
3. ✅ 自动跳转到WooCommerce的支付页面
4. ✅ WooCommerce会渲染Stripe Elements（嵌入式）
5. ✅ 支付完成后自动触发邮件
6. ✅ 返回你的前端成功页面

---

## 🧪 测试步骤

1. 添加商品到购物车
2. 访问 `/checkout`
3. 填写地址信息
4. 选择支付方式
5. 点击 "Complete order"
6. 应该跳转到WooCommerce的支付页面
7. 看到Stripe Elements表单（如果选择了Stripe）
8. 完成支付
9. 收到邮件通知
10. 返回成功页面

---

## 💡 提示

如果你想让我直接帮你修改 `checkout.astro` 文件，请告诉我！我可以一次性完成所有修改。

当前只是提供了修改指南方便你理解每个变更。
