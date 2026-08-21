import type { Env } from './env';

// Environment variables - will be lazily initialized
let cachedEnv: { url: string; key: string; secret: string } | null = null;

/**
 * Get WooCommerce credentials from environment
 * Works with both local development (import.meta.env) and Cloudflare Pages (passed env)
 */
function getWooCommerceEnv(env?: Env): { url: string; key: string; secret: string } {
  // If env is passed (Cloudflare Pages), use it
  if (env) {
    return {
      url: env.WOOCOMMERCE_URL,
      key: env.WOOCOMMERCE_CONSUMER_KEY,
      secret: env.WOOCOMMERCE_CONSUMER_SECRET,
    };
  }

  // For local development, try import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return {
      url: import.meta.env.WOOCOMMERCE_URL || '',
      key: import.meta.env.WOOCOMMERCE_CONSUMER_KEY || '',
      secret: import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || '',
    };
  }

  throw new Error('WooCommerce environment variables not available');
}

/**
 * Helper function to build WooCommerce API URL with authentication
 * Uses URL parameters instead of Basic Auth for better compatibility
 */
export function buildWooCommerceUrl(endpoint: string, additionalParams?: Record<string, string>, env?: Env): string {
  const credentials = getWooCommerceEnv(env);

  if (!credentials.url || !credentials.key || !credentials.secret) {
    throw new Error('Missing WooCommerce configuration');
  }

  const url = new URL(`${credentials.url}/wp-json/wc/v3${endpoint}`);

  // Add authentication
  url.searchParams.append('consumer_key', credentials.key);
  url.searchParams.append('consumer_secret', credentials.secret);

  // Add additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
}

// WooCommerce REST API 基础请求函数
export async function wooCommerceRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  env?: Env
): Promise<T> {
  const url = buildWooCommerceUrl(endpoint, undefined, env);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; LEEYOUNG-Website/1.0)',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('WooCommerce API error response:', errorText);
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// 产品相关接口

// 获取所有产品（支持分页和筛选）
export async function getProducts(params?: {
  per_page?: number;
  page?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
  on_sale?: boolean;
  orderby?: 'date' | 'title' | 'popularity' | 'rating' | 'price';
  order?: 'asc' | 'desc';
  min_price?: string;
  max_price?: string;
  attribute?: string;
  attribute_term?: string;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  env?: Env;
}) {
  const { env, ...queryParams } = params || {};
  const urlParams = new URLSearchParams();

  if (queryParams?.per_page) urlParams.append('per_page', queryParams.per_page.toString());
  if (queryParams?.page) urlParams.append('page', queryParams.page.toString());
  if (queryParams?.category) urlParams.append('category', queryParams.category);
  if (queryParams?.tag) urlParams.append('tag', queryParams.tag);
  if (queryParams?.featured !== undefined) urlParams.append('featured', queryParams.featured.toString());
  if (queryParams?.on_sale !== undefined) urlParams.append('on_sale', queryParams.on_sale.toString());
  if (queryParams?.orderby) urlParams.append('orderby', queryParams.orderby);
  if (queryParams?.order) urlParams.append('order', queryParams.order);
  if (queryParams?.min_price) urlParams.append('min_price', queryParams.min_price);
  if (queryParams?.max_price) urlParams.append('max_price', queryParams.max_price);
  if (queryParams?.attribute) urlParams.append('attribute', queryParams.attribute);
  if (queryParams?.attribute_term) urlParams.append('attribute_term', queryParams.attribute_term);
  if (queryParams?.stock_status) urlParams.append('stock_status', queryParams.stock_status);

  const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
  return wooCommerceRequest(`/products${query}`, {}, env);
}

// 获取单个产品详情
export async function getProduct(id: number, env?: Env) {
  return wooCommerceRequest(`/products/${id}`, {}, env);
}

// 获取推荐产品（特色产品）
export async function getFeaturedProducts(limit: number = 8, env?: Env) {
  return getProducts({
    featured: true,
    per_page: limit,
    orderby: 'date',
    order: 'desc',
    env,
  });
}

// 获取热销产品
export async function getBestSellingProducts(limit: number = 8, env?: Env) {
  return getProducts({
    per_page: limit,
    orderby: 'popularity',
    order: 'desc',
    env,
  });
}

// 获取促销产品
export async function getOnSaleProducts(limit: number = 8, env?: Env) {
  return getProducts({
    on_sale: true,
    per_page: limit,
    orderby: 'date',
    order: 'desc',
    env,
  });
}

// 获取相关产品（需要在产品详情页使用）
export async function getRelatedProducts(productId: number, limit: number = 4, env?: Env) {
  const product = await getProduct(productId, env);

  // 根据分类获取相关产品
  if (product.categories && product.categories.length > 0) {
    const categoryId = product.categories[0].id;
    const products = await getProducts({
      category: categoryId.toString(),
      per_page: limit + 1,
      env,
    });

    // 排除当前产品
    return products.filter((p: any) => p.id !== productId).slice(0, limit);
  }

  return [];
}

// 分类相关接口

// 获取所有产品分类
export async function getProductCategories(params?: {
  per_page?: number;
  parent?: number;
  env?: Env;
}) {
  const { env, ...queryParams } = params || {};
  const urlParams = new URLSearchParams();

  if (queryParams?.per_page) urlParams.append('per_page', queryParams.per_page.toString());
  if (queryParams?.parent !== undefined) urlParams.append('parent', queryParams.parent.toString());

  const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
  return wooCommerceRequest(`/products/categories${query}`, {}, env);
}

// 获取单个分类
export async function getProductCategory(id: number, env?: Env) {
  return wooCommerceRequest(`/products/categories/${id}`, {}, env);
}

// 获取所有产品标签
export async function getProductTags(params?: {
  per_page?: number;
  search?: string;
  env?: Env;
}) {
  const { env, ...queryParams } = params || {};
  const urlParams = new URLSearchParams();

  if (queryParams?.per_page) urlParams.append('per_page', queryParams.per_page.toString());
  if (queryParams?.search) urlParams.append('search', queryParams.search);

  const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
  return wooCommerceRequest(`/products/tags${query}`, {}, env);
}

// 获取产品属性
export async function getProductAttributes(env?: Env) {
  return wooCommerceRequest('/products/attributes', {}, env);
}

// 获取产品属性项
export async function getProductAttributeTerms(attributeId: number, env?: Env) {
  return wooCommerceRequest(`/products/attributes/${attributeId}/terms`, {}, env);
}

// 评论相关接口

// 获取产品评论
export async function getProductReviews(productId: number, params?: {
  per_page?: number;
  page?: number;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'rating';
  env?: Env;
}) {
  const { env, ...queryParams } = params || {};
  const urlParams = new URLSearchParams();
  urlParams.append('product', productId.toString());

  if (queryParams?.per_page) urlParams.append('per_page', queryParams.per_page.toString());
  if (queryParams?.page) urlParams.append('page', queryParams.page.toString());
  if (queryParams?.order) urlParams.append('order', queryParams.order);
  if (queryParams?.orderby) urlParams.append('orderby', queryParams.orderby);

  const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
  return wooCommerceRequest(`/products/reviews${query}`, {}, env);
}

// 获取产品变体
export async function getProductVariations(productId: number, env?: Env): Promise<WooVariation[]> {
  return wooCommerceRequest(`/products/${productId}/variations?per_page=100`, {}, env);
}

// 创建产品评论
export async function createProductReview(data: {
  product_id: number;
  review: string;
  reviewer: string;
  reviewer_email: string;
  rating: number;
}, env?: Env) {
  return wooCommerceRequest('/products/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  }, env);
}

// TypeScript 类型定义
export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  stock_status: string;
  stock_quantity: number;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  variations: number[];
  average_rating: string;
  rating_count: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

// 产品变体接口
export interface WooVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  stock_quantity: number;
  image: {
    id: number;
    src: string;
    name: string;
    alt: string;
  } | null;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: {
    id: number;
    src: string;
    name: string;
    alt: string;
  } | null;
  count: number;
}

export interface WooTag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

// 产品使用场景评级接口
export interface UsageRating {
  label: string;
  rating: number; // 1-5
  icon?: string; // 可选的图标类型: 'road', 'gravel', 'mountain', 'city'
}

// 产品特性卡片接口
export interface FeatureCard {
  title: string;
  description: string;
  image: string;
}

// 产品评论接口
export interface WooReview {
  id: number;
  date_created: string;
  date_created_gmt: string;
  product_id: number;
  status: string;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  verified: boolean;
  reviewer_avatar_urls: {
    24: string;
    48: string;
    96: string;
  };
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
  images?: string[];
}
