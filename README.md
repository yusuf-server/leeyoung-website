# WordPress + Astro 网站

使用Astro框架和WordPress GraphQL构建的前端网站。

## 📋 前置要求

1. **WordPress后台配置**
   - 已安装并启用 [WPGraphQL](https://wordpress.org/plugins/wp-graphql/) 插件
   - GraphQL端点通常位于: `https://your-site.com/graphql`

2. **Node.js环境**
   - Node.js 18.0+

## 🚀 快速开始

### 1. 安装依赖

由于npm权限问题，建议先修复：
```bash
sudo chown -R 501:20 "/Users/yusuf/.npm"
```

然后安装依赖：
```bash
npm install
```

### 2. 配置WordPress GraphQL端点

复制环境变量示例文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的WordPress GraphQL端点：
```env
WORDPRESS_GRAPHQL_URL=https://your-wordpress-site.com/graphql
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:4321 查看网站。

## 📁 项目结构

```
leeyoung-website/
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # 基础布局模板
│   ├── pages/
│   │   └── index.astro           # 首页 - 显示文章列表
│   └── lib/
│       └── graphql.ts            # GraphQL客户端和查询
├── public/                        # 静态资源
├── astro.config.mjs              # Astro配置
├── package.json                  # 项目依赖
├── tsconfig.json                 # TypeScript配置
└── .env                          # 环境变量（需要创建）
```

## 🔧 自定义GraphQL查询

在 `src/lib/graphql.ts` 中，你可以修改或添加新的GraphQL查询：

```typescript
export const GET_POSTS = `
  query GetPosts {
    posts(first: 10) {
      nodes {
        id
        title
        excerpt
        date
        slug
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
  }
`;
```

## 🎨 添加新页面

在 `src/pages/` 目录下创建新的 `.astro` 文件，例如查看单个文章：

```astro
---
// src/pages/post/[slug].astro
import Layout from '../../layouts/Layout.astro';
import { graphqlClient, GET_POST } from '../../lib/graphql';

const { slug } = Astro.params;
const data = await graphqlClient.request(GET_POST, { id: slug });
const post = data.post;
---

<Layout title={post.title}>
  <article>
    <h1>{post.title}</h1>
    <div set:html={post.content} />
  </article>
</Layout>
```

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

## 🐛 常见问题

### GraphQL连接错误

如果看到连接错误，请检查：

1. WordPress的WPGraphQL插件是否已启用
2. `.env` 文件中的URL是否正确
3. WordPress网站是否可公开访问
4. 是否有CORS限制（可能需要在WordPress中配置）

### CORS错误

如果遇到CORS错误，在WordPress中添加以下代码（functions.php或插件）：

```php
add_action('graphql_init', function() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
});
```

## 📚 相关文档

- [Astro文档](https://docs.astro.build)
- [WPGraphQL文档](https://www.wpgraphql.com/)
- [GraphQL Request库](https://github.com/jasonkuhrt/graphql-request)
