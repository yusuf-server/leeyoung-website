/**
 * API端点：获取订单的物流跟踪信息
 *
 * 使用 Shipment Tracking for WooCommerce 插件的 REST API
 *
 * 查询参数：
 * - order_id: 订单ID
 */
import type { APIRoute } from 'astro';

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');

    if (!orderId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing order_id parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 方法1: 使用 Shipment Tracking REST API (推荐)
    const trackingResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc-shipment-tracking/v3/orders/${orderId}/shipment-trackings`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)}`,
        },
      }
    );

    if (trackingResponse.ok) {
      const trackingData = await trackingResponse.json();
      return new Response(JSON.stringify({
        success: true,
        tracking: Array.isArray(trackingData) ? trackingData : []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 方法2: 备用方案 - 从订单 meta_data 中读取
    const orderResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)}`,
        },
      }
    );

    if (orderResponse.ok) {
      const orderData = await orderResponse.json();

      // 查找物流跟踪信息
      const trackingMeta = orderData.meta_data?.find(
        (meta: any) => meta.key === '_wc_shipment_tracking_items'
      );

      if (trackingMeta && trackingMeta.value) {
        const trackingItems = Array.isArray(trackingMeta.value)
          ? trackingMeta.value
          : [trackingMeta.value];

        return new Response(JSON.stringify({
          success: true,
          tracking: trackingItems
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 没有找到物流信息
    return new Response(JSON.stringify({
      success: true,
      tracking: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Tracking API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch tracking information',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
