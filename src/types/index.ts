
import { z } from 'zod';

// Export Confluence types
export * from './confluence.js';

// Common Jira types
export const JiraUserSchema = z.object({
  accountId: z.string(),
  accountType: z.string().optional(),
  displayName: z.string(),
  emailAddress: z.string().email().optional(),
  active: z.boolean().optional(),
  timeZone: z.string().optional(),
  locale: z.string().optional(),
  groups: z.object({
    size: z.number(),
    items: z.array(z.object({
      name: z.string(),
      groupId: z.string().optional(),
    })),
  }).optional(),
});

export const JiraProjectSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  lead: JiraUserSchema.optional(),
  projectTypeKey: z.string(),
  simplified: z.boolean().optional(),
  style: z.string().optional(),
  isPrivate: z.boolean().optional(),
  properties: z.record(z.any()).optional(),
  entityId: z.string().optional(),
  uuid: z.string().optional(),
});

export const JiraIssueTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  subtask: z.boolean(),
  avatarId: z.number().optional(),
  entityId: z.string().optional(),
  hierarchyLevel: z.number().optional(),
});

export const JiraStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  statusCategory: z.object({
    id: z.number(),
    key: z.string(),
    colorName: z.string(),
    name: z.string(),
  }),
});

export const JiraPrioritySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
});

export const JiraCommentSchema = z.object({
  id: z.string(),
  author: JiraUserSchema,
  body: z.any(), // ADF content
  updateAuthor: JiraUserSchema.optional(),
  created: z.string(),
  updated: z.string().optional(),
  visibility: z.object({
    type: z.string(),
    value: z.string(),
    identifier: z.string().optional(),
  }).optional(),
});

export const JiraIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  self: z.string().url(),
  fields: z.object({
    summary: z.string(),
    description: z.any().optional(), // ADF content
    issuetype: JiraIssueTypeSchema,
    project: JiraProjectSchema,
    status: JiraStatusSchema,
    priority: JiraPrioritySchema.optional(),
    assignee: JiraUserSchema.optional(),
    reporter: JiraUserSchema.optional(),
    created: z.string(),
    updated: z.string(),
    resolutiondate: z.string().optional(),
    labels: z.array(z.string()).optional(),
    components: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
    })).optional(),
    fixVersions: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      released: z.boolean().optional(),
      releaseDate: z.string().optional(),
    })).optional(),
    comment: z.object({
      comments: z.array(JiraCommentSchema),
      maxResults: z.number(),
      total: z.number(),
      startAt: z.number(),
    }).optional(),
  }),
  changelog: z.object({
    startAt: z.number(),
    maxResults: z.number(),
    total: z.number(),
    histories: z.array(z.object({
      id: z.string(),
      author: JiraUserSchema,
      created: z.string(),
      items: z.array(z.object({
        field: z.string(),
        fieldtype: z.string(),
        fieldId: z.string().optional(),
        from: z.string().optional(),
        fromString: z.string().optional(),
        to: z.string().optional(),
        toString: z.string().optional(),
      })),
    })),
  }).optional(),
});

export const JiraTransitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  to: JiraStatusSchema,
  hasScreen: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  isInitial: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isConditional: z.boolean().optional(),
  fields: z.record(z.object({
    required: z.boolean(),
    schema: z.object({
      type: z.string(),
      items: z.string().optional(),
      system: z.string().optional(),
    }),
    name: z.string(),
    key: z.string(),
    hasDefaultValue: z.boolean().optional(),
    operations: z.array(z.string()).optional(),
    allowedValues: z.array(z.any()).optional(),
  })).optional(),
});

export const JiraSearchResultSchema = z.object({
  expand: z.string().optional(),
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  issues: z.array(JiraIssueSchema),
});

export const JiraSprintSchema = z.object({
  id: z.number(),
  self: z.string().url(),
  state: z.enum(['closed', 'active', 'future']),
  name: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  completeDate: z.string().optional(),
  createdDate: z.string().optional(),
  originBoardId: z.number().optional(),
  goal: z.string().optional(),
});

// Export types
export type JiraUser = z.infer<typeof JiraUserSchema>;
export type JiraProject = z.infer<typeof JiraProjectSchema>;
export type JiraIssueType = z.infer<typeof JiraIssueTypeSchema>;
export type JiraStatus = z.infer<typeof JiraStatusSchema>;
export type JiraPriority = z.infer<typeof JiraPrioritySchema>;
export type JiraComment = z.infer<typeof JiraCommentSchema>;
export type JiraIssue = z.infer<typeof JiraIssueSchema>;
export type JiraTransition = z.infer<typeof JiraTransitionSchema>;
export type JiraSearchResult = z.infer<typeof JiraSearchResultSchema>;
export type JiraSprint = z.infer<typeof JiraSprintSchema>;

// Tool argument schemas
export const IssueGetArgsSchema = z.object({
  issueIdOrKey: z.string(),
  fields: z.array(z.string()).optional(),
  expand: z.array(z.string()).optional(),
  properties: z.array(z.string()).optional(),
});

export const IssueCreateArgsSchema = z.object({
  fields: z.object({
    project: z.object({
      key: z.string(),
    }),
    summary: z.string(),
    description: z.any().optional(),
    issuetype: z.object({
      name: z.string(),
    }),
    assignee: z.object({
      accountId: z.string(),
    }).optional(),
    priority: z.object({
      name: z.string(),
    }).optional(),
    labels: z.array(z.string()).optional(),
    components: z.array(z.object({
      name: z.string(),
    })).optional(),
    fixVersions: z.array(z.object({
      name: z.string(),
    })).optional(),
    parent: z.object({
      key: z.string(),
    }).optional(),
  }),
  update: z.record(z.array(z.object({
    add: z.any().optional(),
    set: z.any().optional(),
    remove: z.any().optional(),
  }))).optional(),
});

export const IssueUpdateArgsSchema = z.object({
  issueIdOrKey: z.string(),
  fields: z.record(z.any()).optional(),
  update: z.record(z.array(z.object({
    add: z.any().optional(),
    set: z.any().optional(),
    remove: z.any().optional(),
  }))).optional(),
  historyMetadata: z.object({
    type: z.string(),
    description: z.string().optional(),
    descriptionKey: z.string().optional(),
    activityDescription: z.string().optional(),
    activityDescriptionKey: z.string().optional(),
    emailDescription: z.string().optional(),
    emailDescriptionKey: z.string().optional(),
    actor: z.object({
      id: z.string(),
      displayName: z.string(),
      type: z.string(),
      avatarUrl: z.string().optional(),
      url: z.string().optional(),
    }).optional(),
    generator: z.object({
      id: z.string(),
      type: z.string(),
    }).optional(),
    cause: z.object({
      id: z.string(),
      type: z.string(),
    }).optional(),
    extraData: z.record(z.string()).optional(),
  }).optional(),
  properties: z.array(z.object({
    key: z.string(),
    value: z.any(),
  })).optional(),
});

export const IssueDeleteArgsSchema = z.object({
  issueIdOrKey: z.string(),
  deleteSubtasks: z.boolean().optional().default(false),
});

export const IssueTransitionArgsSchema = z.object({
  issueIdOrKey: z.string(),
  transition: z.object({
    id: z.string(),
  }),
  fields: z.record(z.any()).optional(),
  update: z.record(z.array(z.object({
    add: z.any().optional(),
    set: z.any().optional(),
    remove: z.any().optional(),
  }))).optional(),
  historyMetadata: z.object({
    type: z.string(),
    description: z.string().optional(),
    descriptionKey: z.string().optional(),
    activityDescription: z.string().optional(),
    activityDescriptionKey: z.string().optional(),
    emailDescription: z.string().optional(),
    emailDescriptionKey: z.string().optional(),
    actor: z.object({
      id: z.string(),
      displayName: z.string(),
      type: z.string(),
      avatarUrl: z.string().optional(),
      url: z.string().optional(),
    }).optional(),
    generator: z.object({
      id: z.string(),
      type: z.string(),
    }).optional(),
    cause: z.object({
      id: z.string(),
      type: z.string(),
    }).optional(),
    extraData: z.record(z.string()).optional(),
  }).optional(),
  properties: z.array(z.object({
    key: z.string(),
    value: z.any(),
  })).optional(),
});

export const JqlSearchArgsSchema = z.object({
  jql: z.string(),
  startAt: z.number().optional().default(0),
  maxResults: z.number().optional().default(50),
  fields: z.array(z.string()).optional(),
  expand: z.array(z.string()).optional(),
  properties: z.array(z.string()).optional(),
  fieldsByKeys: z.boolean().optional(),
});

export const ProjectGetArgsSchema = z.object({
  projectIdOrKey: z.string(),
  expand: z.array(z.string()).optional(),
  properties: z.array(z.string()).optional(),
});

export const ProjectSearchArgsSchema = z.object({
  startAt: z.number().optional().default(0),
  maxResults: z.number().optional().default(50),
  orderBy: z.string().optional(),
  query: z.string().optional(),
  typeKey: z.string().optional(),
  categoryId: z.number().optional(),
  action: z.string().optional(),
  expand: z.array(z.string()).optional(),
});

export const UserGetArgsSchema = z.object({
  accountId: z.string(),
  expand: z.array(z.string()).optional(),
});

export const UserSearchArgsSchema = z.object({
  query: z.string(),
  startAt: z.number().optional().default(0),
  maxResults: z.number().optional().default(50),
  property: z.string().optional(),
});

export const CommentAddArgsSchema = z.object({
  issueIdOrKey: z.string(),
  body: z.any(), // ADF content
  visibility: z.object({
    type: z.enum(['group', 'role']),
    value: z.string(),
    identifier: z.string().optional(),
  }).optional(),
  properties: z.array(z.object({
    key: z.string(),
    value: z.any(),
  })).optional(),
});

export const CommentGetArgsSchema = z.object({
  issueIdOrKey: z.string(),
  startAt: z.number().optional().default(0),
  maxResults: z.number().optional().default(50),
  orderBy: z.string().optional(),
  expand: z.array(z.string()).optional(),
});
