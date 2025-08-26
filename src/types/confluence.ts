
import { z } from 'zod';

// Base Confluence types
export const ConfluenceUserSchema = z.object({
  type: z.string(),
  accountId: z.string(),
  accountType: z.string(),
  email: z.string().optional(),
  publicName: z.string(),
  displayName: z.string(),
  profilePicture: z.object({
    path: z.string(),
    width: z.number(),
    height: z.number(),
    isDefault: z.boolean()
  }).optional()
});

export const ConfluenceSpaceSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.enum(['global', 'personal']),
  status: z.string(),
  description: z.object({
    plain: z.object({
      value: z.string(),
      representation: z.string()
    })
  }).optional(),
  homepage: z.object({
    id: z.string()
  }).optional(),
  _links: z.object({
    webui: z.string(),
    self: z.string()
  })
});

export const ConfluencePageSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  title: z.string(),
  space: ConfluenceSpaceSchema.optional(),
  history: z.object({
    latest: z.boolean(),
    createdBy: ConfluenceUserSchema,
    createdDate: z.string(),
    lastUpdated: z.object({
      by: ConfluenceUserSchema,
      when: z.string()
    })
  }).optional(),
  version: z.object({
    number: z.number(),
    message: z.string().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional()
  }),
  ancestors: z.array(z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    title: z.string()
  })).optional(),
  body: z.object({
    storage: z.object({
      value: z.string(),
      representation: z.string()
    }).optional(),
    view: z.object({
      value: z.string(),
      representation: z.string()
    }).optional()
  }).optional(),
  _links: z.object({
    webui: z.string(),
    edit: z.string().optional(),
    tinyui: z.string(),
    self: z.string()
  })
});

// Request/Response schemas
export const CreatePageRequestSchema = z.object({
  type: z.literal('page'),
  title: z.string(),
  space: z.object({
    key: z.string()
  }),
  body: z.object({
    storage: z.object({
      value: z.string(),
      representation: z.literal('storage')
    })
  }),
  ancestors: z.array(z.object({
    id: z.string()
  })).optional()
});

export const UpdatePageRequestSchema = z.object({
  version: z.object({
    number: z.number()
  }),
  title: z.string().optional(),
  type: z.literal('page').optional(),
  body: z.object({
    storage: z.object({
      value: z.string(),
      representation: z.literal('storage')
    })
  }).optional()
});

export const SpacePermissionSchema = z.object({
  id: z.string(),
  principal: z.object({
    type: z.enum(['user', 'group']),
    id: z.string()
  }),
  operation: z.object({
    key: z.string(),
    targetType: z.string()
  })
});

export const CreateSpaceRequestSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.object({
    plain: z.object({
      value: z.string(),
      representation: z.literal('plain')
    })
  }).optional(),
  permissions: z.array(z.object({
    subjects: z.object({
      user: z.object({
        results: z.array(z.object({
          accountId: z.string(),
          type: z.literal('known')
        }))
      }).optional(),
      group: z.object({
        results: z.array(z.object({
          type: z.literal('group'),
          id: z.string()
        }))
      }).optional()
    }),
    operation: z.object({
      operation: z.string(),
      targetType: z.string()
    }),
    anonymousAccess: z.boolean().optional(),
    unlicensedAccess: z.boolean().optional()
  })).optional()
});

// Jira-Confluence linking types
export const JiraIssueLinkSchema = z.object({
  issueKey: z.string(),
  pageId: z.string(),
  linkType: z.enum(['embed', 'reference', 'attachment'])
});

// Export types
export type ConfluenceUser = z.infer<typeof ConfluenceUserSchema>;
export type ConfluenceSpace = z.infer<typeof ConfluenceSpaceSchema>;
export type ConfluencePage = z.infer<typeof ConfluencePageSchema>;
export type CreatePageRequest = z.infer<typeof CreatePageRequestSchema>;
export type UpdatePageRequest = z.infer<typeof UpdatePageRequestSchema>;
export type SpacePermission = z.infer<typeof SpacePermissionSchema>;
export type CreateSpaceRequest = z.infer<typeof CreateSpaceRequestSchema>;
export type JiraIssueLink = z.infer<typeof JiraIssueLinkSchema>;
