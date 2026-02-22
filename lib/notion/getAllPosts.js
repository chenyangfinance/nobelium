import { config as BLOG } from '@/lib/server/config'

import { idToUuid } from 'notion-utils'
import dayjs from 'dayjs'
import api from '@/lib/server/notion-api'
import getAllPageIds from './getAllPageIds'
import getPageProperties from './getPageProperties'
import filterPublishedPosts from './filterPublishedPosts'

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */
export async function getAllPosts ({ includePages = false }) {
  const id = idToUuid(process.env.NOTION_PAGE_ID)

  const response = await api.getPage(id)

  // 加上 || {} 防止 response.collection 为 undefined 时报错
  const collection = Object.values(response.collection || {})[0]?.value
  const collectionQuery = response.collection_query
  const block = response.block
  const schema = collection?.schema

  const rawMetadata = block[id]?.value

  // 🌟 核心修改区：放宽检测条件
  // 不再死板地检查 rawMetadata.type，而是看 Notion 是否返回了真实的数据库数据
  if (!collection || !collectionQuery) {
    console.log(`pageId "${id}" does not contain a valid database. Block type: ${rawMetadata?.type}`)
    return null
  } else {
    // Construct Data
    const pageIds = getAllPageIds(collectionQuery)
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i]
      const properties = (await getPageProperties(pageId, block, schema)) || null

      // Add fullwidth to properties
      properties.fullWidth = block[pageId]?.value?.format?.page_full_width ?? false
      // Convert date (with timezone) to unix milliseconds timestamp
      properties.date = (
        properties.date?.start_date
          ? dayjs.tz(properties.date?.start_date)
          : dayjs(block[pageId]?.value?.created_time)
      ).valueOf()

      data.push(properties)
    }

    // remove all the the items doesn't meet requirements
    const posts = filterPublishedPosts({ posts: data, includePages })

    // Sort by date
    if (BLOG.sortByDate) {
      posts.sort((a, b) => b.date - a.date)
    }
    return posts
  }
}
