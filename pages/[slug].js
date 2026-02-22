import { clientConfig } from '@/lib/server/config'
import { useRouter } from 'next/router'
import cn from 'classnames'
import { getAllPosts, getPostBlocks } from '@/lib/notion'
import { useLocale } from '@/lib/locale'
import { useConfig } from '@/lib/config'
import { createHash } from 'crypto'
import Container from '@/components/Container'
import Post from '@/components/Post'
import Comments from '@/components/Comments'

export default function BlogPost ({ post, blockMap, emailHash }) {
  const router = useRouter()
  const BLOG = useConfig()
  const locale = useLocale()

  // 如果处于 fallback 状态或没有获取到 post，则不渲染（防止报错）
  if (router.isFallback || !post) return null

  const fullWidth = post.fullWidth ?? false

  return (
    <Container
      layout="blog"
      title={post.title}
      description={post.summary}
      slug={post.slug}
      // date={new Date(post.publishedAt).toISOString()}
      type="article"
      fullWidth={fullWidth}
    >
      <Post
        post={post}
        blockMap={blockMap}
        emailHash={emailHash}
        fullWidth={fullWidth}
      />

      {/* Back and Top */}
      <div
        className={cn(
          'px-4 flex justify-between font-medium text-gray-500 dark:text-gray-400 my-5',
          fullWidth ? 'md:px-24' : 'mx-auto max-w-2xl'
        )}
      >
        <a>
          <button
            onClick={() => router.push(BLOG.path || '/')}
            className="mt-2 cursor-pointer hover:text-black dark:hover:text-gray-100"
          >
            ← {locale.POST.BACK}
          </button>
        </a>
        <a>
          <button
            onClick={() => window.scrollTo({
              top: 0,
              behavior: 'smooth'
            })}
            className="mt-2 cursor-pointer hover:text-black dark:hover:text-gray-100"
          >
            ↑ {locale.POST.TOP}
          </button>
        </a>
      </div>

      <Comments frontMatter={post} />
    </Container>
  )
}

export async function getStaticPaths () {
  const posts = await getAllPosts({ includePages: true })
  
  // 核心修复 1：增加安全校验。如果 posts 不是数组，则返回空 paths，避免 map 函数报错崩溃
  const paths = Array.isArray(posts) 
    ? posts.map(row => `${clientConfig.path}/${row.slug}`) 
    : []

  return {
    paths: paths,
    fallback: true
  }
}

export async function getStaticProps ({ params: { slug } }) {
  try {
    const posts = await getAllPosts({ includePages: true })
    
    // 核心修复 2：如果 posts 为空或者不是数组，直接返回 404
    if (!posts || !Array.isArray(posts)) {
      return { notFound: true }
    }

    const post = posts.find(t => t?.slug === slug)

    if (!post) {
      return { notFound: true }
    }

    const blockMap = await getPostBlocks(post.id)
    const emailHash = createHash('md5')
      .update(clientConfig.email)
      .digest('hex')
      .trim()
      .toLowerCase()

    return {
      props: { post, blockMap, emailHash },
      revalidate: 1
    }
  } catch (error) {
    // 捕获任何潜在的数据请求错误，防止构建中断
    console.error('Error in getStaticProps:', error)
    return { notFound: true }
  }
}
