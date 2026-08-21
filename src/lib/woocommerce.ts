const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

if (!WOOCOMMERCE_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
  throw new Error('Missing WooCommerce configuration in .env file');
}

/**
 * Helper function to build WooCommerce API URL with authentication
 * Uses URL parameters instead of Basic Auth for better compatibility
 */
export function buildWooCommerceUrl(endpoint: string, additionalParams?: Record<string, string>): string {
  const url = new URL(`${WOOCOMMERCE_URL}/wp-json/wc/v3${endpoint}`);

  // Add authentication
  url.searchParams.append('consumer_key', CONSUMER_KEY);
  url.searchParams.append('consumer_secret', CONSUMER_SECRET);

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
  options: RequestInit = {}
): Promise<T> {
  const url = buildWooCommerceUrl(endpoint);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
}) {
  const queryParams = new URLSearchParams();

  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.category) queryParams.append('category', params.category);
  if (params?.tag) queryParams.append('tag', params.tag);
  if (params?.featured !== undefined) queryParams.append('featured', params.featured.toString());
  if (params?.on_sale !== undefined) queryParams.append('on_sale', params.on_sale.toString());
  if (params?.orderby) queryParams.append('orderby', params.orderby);
  if (params?.order) queryParams.append('order', params.order);
  if (params?.min_price) queryParams.append('min_price', params.min_price);
  if (params?.max_price) queryParams.append('max_price', params.max_price);
  if (params?.attribute) queryParams.append('attribute', params.attribute);
  if (params?.attribute_term) queryParams.append('attribute_term', params.attribute_term);
  if (params?.stock_status) queryParams.append('stock_status', params.stock_status);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return wooCommerceRequest(`/products${query}`);
}

// 获取单个产品详情
export async function getProduct(id: number) {
  return wooCommerceRequest(`/products/${id}`);
}

// 获取推荐产品（特色产品）
export async function getFeaturedProducts(limit: number = 8) {
  return getProducts({
    featured: true,
    per_page: limit,
    orderby: 'date',
    order: 'desc',
  });
}

// 获取热销产品
export async function getBestSellingProducts(limit: number = 8) {
  return getProducts({
    per_page: limit,
    orderby: 'popularity',
    order: 'desc',
  });
}

// 获取促销产品
export async function getOnSaleProducts(limit: number = 8) {
  return getProducts({
    on_sale: true,
    per_page: limit,
    orderby: 'date',
    order: 'desc',
  });
}

// 获取相关产品（需要在产品详情页使用）
export async function getRelatedProducts(productId: number, limit: number = 4) {
  const product = await getProduct(productId);

  // 根据分类获取相关产品
  if (product.categories && product.categories.length > 0) {
    const categoryId = product.categories[0].id;
    const products = await getProducts({
      category: categoryId.toString(),
      per_page: limit + 1,
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
}) {
  const queryParams = new URLSearchParams();

  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params?.parent !== undefined) queryParams.append('parent', params.parent.toString());

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return wooCommerceRequest(`/products/categories${query}`);
}

// 获取单个分类
export async function getProductCategory(id: number) {
  return wooCommerceRequest(`/products/categories/${id}`);
}

// 获取所有产品标签
export async function getProductTags(params?: {
  per_page?: number;
  search?: string;
}) {
  const queryParams = new URLSearchParams();

  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params?.search) queryParams.append('search', params.search);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return wooCommerceRequest(`/products/tags${query}`);
}

// 获取产品属性
export async function getProductAttributes() {
  return wooCommerceRequest('/products/attributes');
}

// 获取产品属性项
export async function getProductAttributeTerms(attributeId: number) {
  return wooCommerceRequest(`/products/attributes/${attributeId}/terms`);
}

// 评论相关接口

// 获取产品评论
export async function getProductReviews(productId: number, params?: {
  per_page?: number;
  page?: number;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'rating';
}) {
  const queryParams = new URLSearchParams();
  queryParams.append('product', productId.toString());

  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.order) queryParams.append('order', params.order);
  if (params?.orderby) queryParams.append('orderby', params.orderby);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return wooCommerceRequest(`/products/reviews${query}`);
}

// 获取产品变体
export async function getProductVariations(productId: number): Promise<WooVariation[]> {
  return wooCommerceRequest(`/products/${productId}/variations?per_page=100`);
}

// 创建产品评论
export async function createProductReview(data: {
  product_id: number;
  review: string;
  reviewer: string;
  reviewer_email: string;
  rating: number;
}) {
  return wooCommerceRequest('/products/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
