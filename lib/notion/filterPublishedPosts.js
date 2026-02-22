export default function filterPublishedPosts({ posts, includePages }) {
  if (!posts || !posts.length) return []
  
  return posts
    .filter(post => {
      // 兼容 Notion 新版状态/文本列，如果是数组取第一项，如果是字符串直接用
      const postType = Array.isArray(post?.type) ? post.type[0] : post?.type
      return includePages
        ? postType === 'Post' || postType === 'Page'
        : postType === 'Post'
    })
    .filter(post => {
      // 同理，兼容 status 列
      const postStatus = Array.isArray(post?.status) ? post.status[0] : post?.status
      return (
        post.title &&
        post.slug &&
        postStatus === 'Published' &&
        post.date <= new Date() // 确保日期没有设置在未来
      )
    })
}
