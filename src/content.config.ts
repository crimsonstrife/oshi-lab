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

const knownIssues = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        severity: z.enum(["impacting", "annoying", "note"]).default("note"),
        status: z.string().default("Known issue"),
        areas: z.array(z.string()).default([]),
        details: z.array(z.string()).default([]),
        workaround: z.array(z.string()).default([]),
        snippet: z.string().optional(),
        // Use YYYY-MM-DD in files; parsed to Date
        updated: z.union([z.date(), z.string()]).transform((v) => (v instanceof Date ? v : new Date(v))),
        // Hide from the default list when resolved
        resolved: z.boolean().default(false),
        // ordering within same severity
        order: z.number().int().default(0),
    }),
});

export const collections = { docs, "known-issues": knownIssues };