import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    // content: defineCollection({
    //   type: 'page',
    //   source: '**/*.md',
    // }),
    autopsia: defineCollection({
      type: 'page',
      source: '000_autopsia/*.md',
      // schema: z.object({
      //   title: z.string(),
      //   created: z.date().optional(),
      //   status: z.string().optional(),
      // }),
    }),
  },
})
