import type { APIRoute } from 'astro';
import { createProductReview } from '../../lib/woocommerce';
import { getEnv } from '../../lib/env';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    // 获取环境变量（兼容 Cloudflare Pages）
    const env = getEnv(locals);
    const WOOCOMMERCE_URL = env.WOOCOMMERCE_URL;

    // 检查用户是否登录
    const sessionToken = cookies.get('woo_session')?.value;

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'You must be logged in to submit a review' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 解析session token
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionToken));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid session. Please log in again.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!sessionData.userId || !sessionData.username) {
      return new Response(
        JSON.stringify({ error: 'Invalid session. Please log in again.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // 验证必填字段
    if (!data.product_id || !data.review || !data.rating) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证评分范围
    if (data.rating < 1 || data.rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 如果有上传的图片，先上传到 WordPress 媒体库
    const imageUrls: string[] = [];
    if (data.images && data.images.length > 0) {
      console.log('Uploading images to WordPress media library:', data.images.length);

      for (const base64Image of data.images) {
        try {
          // Extract the base64 data and mime type
          const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
          if (!matches) continue;

          const mimeType = matches[1];
          const base64Data = matches[2];

          // Convert base64 to binary
          const binaryData = atob(base64Data);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }

          console.log('Uploading image, type:', mimeType);

          // Upload using custom WordPress endpoint
          const uploadResponse = await fetch(
            `${WOOCOMMERCE_URL}/wp-json/custom/v1/upload-review-media`,
            {
              method: 'POST',
              headers: {
                'Content-Type': mimeType,
              },
              body: bytes,
            }
          );

          console.log('Upload response status:', uploadResponse.status);

          if (uploadResponse.ok) {
            const mediaData = await uploadResponse.json();
            if (mediaData.url) {
              imageUrls.push(mediaData.url);
              console.log('Image uploaded successfully:', mediaData.url);
            }
          } else {
            const errorText = await uploadResponse.text();
            console.error('Failed to upload image:', uploadResponse.status, errorText);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    }

    // 如果有图片URL，将其附加到评论内容中
    let reviewContent = data.review;
    if (imageUrls.length > 0) {
      // Append image URLs as a special marker at the end of review text
      reviewContent += '\n<!-- REVIEW_IMAGES:' + JSON.stringify(imageUrls) + ' -->';
    }

    // 创建评论，使用已登录用户的信息
    const review = await createProductReview({
      product_id: parseInt(data.product_id),
      review: reviewContent,
      reviewer: sessionData.username,
      reviewer_email: sessionData.email || `${sessionData.username}@example.com`,
      rating: parseInt(data.rating),
    }, env);

    console.log('Review created:', review);

    return new Response(
      JSON.stringify({ success: true, review }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create review' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
