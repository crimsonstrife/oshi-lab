import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),

        sidebar: z
            .object({
                label: z.string().optional(),
                order: z.number().optional(),
                hidden: z.boolean().optional(),
            })
            .optional(),

        order: z.number().optional(),
    }),
});

export const collections = { docs };