import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Apply coupon code to cart
 * POST /api/cart/apply-coupon
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { coupon_code, cart_items } = body;

    if (!coupon_code) {
      return new Response(
        JSON.stringify({ error: 'Coupon code is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart items are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get WooCommerce credentials
    const WC_URL = import.meta.env.WOOCOMMERCE_URL;
    const WC_CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      console.error('❌ WooCommerce credentials not configured');
      return new Response(
        JSON.stringify({ error: 'WooCommerce not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Validate coupon exists and is valid
    const couponUrl = `${WC_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(coupon_code)}`;
    const authHeader = 'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

    const couponResponse = await fetch(couponUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!couponResponse.ok) {
      console.error('❌ Failed to fetch coupon:', couponResponse.status);
      return new Response(
        JSON.stringify({ error: 'Invalid coupon code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const coupons = await couponResponse.json();

    if (!coupons || coupons.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Coupon code not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const coupon = coupons[0];

    // Check if coupon is valid
    if (coupon.status !== 'publish') {
      return new Response(
        JSON.stringify({ error: 'This coupon is not active' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry date
    if (coupon.date_expires) {
      const expiryDate = new Date(coupon.date_expires);
      if (expiryDate < new Date()) {
        return new Response(
          JSON.stringify({ error: 'This coupon has expired' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return new Response(
        JSON.stringify({ error: 'This coupon has reached its usage limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Calculate discount based on cart items
    let subtotal = 0;
    for (const item of cart_items) {
      // Fetch product price
      const productUrl = `${WC_URL}/wp-json/wc/v3/products/${item.product_id}`;
      const productResponse = await fetch(productUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (productResponse.ok) {
        const product = await productResponse.json();
        const price = parseFloat(product.price) || 0;
        subtotal += price * item.quantity;
      }
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (coupon.discount_type === 'percent') {
      // Percentage discount
      const discountPercent = parseFloat(coupon.amount) || 0;
      discountAmount = (subtotal * discountPercent) / 100;
    } else if (coupon.discount_type === 'fixed_cart') {
      // Fixed cart discount
      discountAmount = parseFloat(coupon.amount) || 0;
    } else if (coupon.discount_type === 'fixed_product') {
      // Fixed product discount (apply to each item)
      const fixedAmount = parseFloat(coupon.amount) || 0;
      discountAmount = fixedAmount * cart_items.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Ensure discount doesn't exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    // Check minimum spend
    if (coupon.minimum_amount && parseFloat(coupon.minimum_amount) > 0 && subtotal < parseFloat(coupon.minimum_amount)) {
      return new Response(
        JSON.stringify({
          error: `Minimum spend of $${coupon.minimum_amount} required to use this coupon`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check maximum spend (only if set and greater than 0)
    if (coupon.maximum_amount && parseFloat(coupon.maximum_amount) > 0 && subtotal > parseFloat(coupon.maximum_amount)) {
      return new Response(
        JSON.stringify({
          error: `Maximum spend of $${coupon.maximum_amount} exceeded for this coupon`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Coupon applied successfully:', {
      code: coupon_code,
      type: coupon.discount_type,
      amount: coupon.amount,
      discount_amount: discountAmount,
      subtotal
    });

    return new Response(
      JSON.stringify({
        success: true,
        coupon_code: coupon_code,
        discount_type: coupon.discount_type,
        discount_amount: discountAmount,
        subtotal: subtotal,
        new_total: subtotal - discountAmount
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Apply coupon error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to apply coupon' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
