# Custom Fields & Advanced Configuration

This document provides comprehensive guidance on using the Custom Fields & Advanced Configuration capabilities of the JIRA Workflow Management System.

## Overview

The Custom Fields & Advanced Configuration module extends the JIRA system with powerful tools for:

- **Custom Field Management**: Create, update, delete, and configure custom fields
- **Field Configuration Management**: Manage field configurations and schemes
- **Advanced Field Types**: Support for cascading selects, multi-selects, and complex field types
- **Field Value Automation**: Automated calculations and validations
- **Context Management**: Scope fields to specific projects and issue types

## Table of Contents

1. [Custom Field Management](#custom-field-management)
2. [Field Configuration Management](#field-configuration-management)
3. [Advanced Field Types](#advanced-field-types)
4. [Field Value Automation](#field-value-automation)
5. [CLI Usage](#cli-usage)
6. [MCP Tool Integration](#mcp-tool-integration)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Custom Field Management

### Creating Custom Fields

#### Basic Text Field
```bash
jira-workflow customfield create \
  --name "Customer Priority" \
  --description "Priority level assigned by customer" \
  --type "com.atlassian.jira.plugin.system.customfieldtypes:textfield" \
  --searcher "com.atlassian.jira.plugin.system.customfieldtypes:textsearcher"
```

#### Select List Field
```bash
jira-workflow customfield create \
  --name "Severity Level" \
  --description "Bug severity classification" \
  --type "com.atlassian.jira.plugin.system.customfieldtypes:select" \
  --searcher "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher" \
  --projects "PROJ1,PROJ2" \
  --issue-types "Bug,Task"
```

#### Number Field for Calculations
```bash
jira-workflow customfield create \
  --name "Story Points" \
  --description "Effort estimation in story points" \
  --type "com.atlassian.jira.plugin.system.customfieldtypes:float" \
  --searcher "com.atlassian.jira.plugin.system.customfieldtypes:exactnumber"
```

### Managing Field Options

#### Setting Options for Select Fields
```bash
# Using command line options
jira-workflow customfield set-options \
  --field-id "customfield_10001" \
  --context-id "10001" \
  --options '[
    {"value": "Critical", "disabled": false},
    {"value": "High", "disabled": false},
    {"value": "Medium", "disabled": false},
    {"value": "Low", "disabled": false},
    {"value": "Deprecated", "disabled": true}
  ]'

# Using options file
echo '[
  {"value": "Critical", "disabled": false},
  {"value": "High", "disabled": false},
  {"value": "Medium", "disabled": false},
  {"value": "Low", "disabled": false}
]' > severity-options.json

jira-workflow customfield set-options \
  --field-id "customfield_10001" \
  --context-id "10001" \
  --options-file "severity-options.json"
```

### Field Types Reference

#### Basic Field Types
- **Text Field**: Single-line text input
- **Text Area**: Multi-line text input
- **Number Field**: Numeric values with decimal support
- **Date Picker**: Date selection
- **DateTime Picker**: Date and time selection
- **URL Field**: URL validation and linking

#### Selection Field Types
- **Select List**: Single-choice dropdown
- **Multi-Select**: Multiple-choice dropdown
- **Radio Buttons**: Single-choice radio button group
- **Checkboxes**: Multiple-choice checkbox group
- **Cascading Select**: Hierarchical selection (parent-child)

#### Advanced Field Types
- **User Picker**: User selection with search
- **Group Picker**: Group selection
- **Project Picker**: Project selection
- **Version Picker**: Version selection from project
- **Labels**: Tag-style labels with autocomplete

## Field Configuration Management

### Creating Field Configurations

```bash
# Create basic field configuration
jira-workflow customfield config create \
  --name "Bug Configuration" \
  --description "Field configuration for bug issues"

# Create configuration with field settings
jira-workflow customfield config create \
  --name "Story Configuration" \
  --description "Field configuration for user stories" \
  --fields '[
    {
      "fieldId": "customfield_10001",
      "isHidden": false,
      "isRequired": true,
      "description": "Story points are required for estimation"
    },
    {
      "fieldId": "customfield_10002",
      "isHidden": true,
      "isRequired": false,
      "description": "Internal tracking field"
    }
  ]'
```

### Field Configuration Schemes

Field configuration schemes map different field configurations to issue types:

```bash
# Create scheme
jira-workflow customfield config scheme create \
  --name "Development Scheme" \
  --description "Field configuration scheme for development projects" \
  --mappings '[
    {
      "issueTypeId": "10001",
      "fieldConfigurationId": "10001"
    },
    {
      "issueTypeId": "10002", 
      "fieldConfigurationId": "10002"
    }
  ]'

# Assign scheme to project
jira-workflow customfield config scheme assign \
  --project-id "10000" \
  --scheme-id "10001"
```

## Advanced Field Types

### Cascading Select Fields

Cascading select fields provide hierarchical options where child options depend on parent selection:

```bash
# Create cascading field
jira-workflow customfield create \
  --name "Location" \
  --description "Geographic location selection" \
  --type "com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect" \
  --searcher "com.atlassian.jira.plugin.system.customfieldtypes:cascadingselectsearcher"

# Set cascading options
jira-workflow customfield cascading set \
  --field-id "customfield_10003" \
  --context-id "10001" \
  --parent-options '[
    {
      "value": "North America",
      "children": [
        {"value": "United States"},
        {"value": "Canada"},
        {"value": "Mexico"}
      ]
    },
    {
      "value": "Europe", 
      "children": [
        {"value": "United Kingdom"},
        {"value": "Germany"},
        {"value": "France"}
      ]
    }
  ]'
```

### Multi-Select Fields

Multi-select fields allow users to choose multiple options:

```bash
# Create multi-select field
jira-workflow customfield create \
  --name "Technologies" \
  --description "Technologies used in this issue" \
  --type "com.atlassian.jira.plugin.system.customfieldtypes:multiselect" \
  --searcher "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher"

# Set options
jira-workflow customfield set-options \
  --field-id "customfield_10004" \
  --context-id "10001" \
  --options '[
    {"value": "JavaScript"},
    {"value": "Python"},
    {"value": "Java"},
    {"value": "TypeScript"},
    {"value": "React"},
    {"value": "Node.js"}
  ]'
```

## Field Value Automation

### Field Validation

Validate field values against configuration rules:

```bash
# Validate a numeric value
jira-workflow customfield validate \
  --field-id "customfield_10001" \
  --value "42.5" \
  --project-id "10000" \
  --issue-type-id "10001"

# Validate a select option
jira-workflow customfield validate \
  --field-id "customfield_10002" \
  --value "High" \
  --project-id "10000"
```

### Field Calculations

Perform automated calculations based on other field values:

```bash
# Calculate total effort
echo '{
  "fields": {
    "customfield_10001": 8,
    "customfield_10002": 5,
    "customfield_10003": 3
  }
}' > issue-data.json

jira-workflow customfield calculate \
  --field-id "customfield_10004" \
  --expression "{customfield_10001} + {customfield_10002} + {customfield_10003}" \
  --dependent-fields "customfield_10001,customfield_10002,customfield_10003" \
  --issue-file "issue-data.json"

# Calculate weighted priority score
jira-workflow customfield calculate \
  --field-id "customfield_10005" \
  --expression "({customfield_10001} * 0.5) + ({customfield_10002} * 0.3) + ({customfield_10003} * 0.2)" \
  --dependent-fields "customfield_10001,customfield_10002,customfield_10003" \
  --issue-data '{"fields": {"customfield_10001": 8, "customfield_10002": 6, "customfield_10003": 4}}'
```

### Calculation Examples

#### Risk Assessment Score
```javascript
// Expression: (Impact * Probability * Exposure) / 100
"{customfield_impact} * {customfield_probability} * {customfield_exposure} / 100"
```

#### RICE Prioritization Score
```javascript
// Expression: (Reach * Impact * Confidence) / Effort
"({customfield_reach} * {customfield_impact} * {customfield_confidence}) / {customfield_effort}"
```

#### Weighted Average
```javascript
// Expression: Weighted average of multiple factors
"({customfield_technical} * 0.4) + ({customfield_business} * 0.4) + ({customfield_urgency} * 0.2)"
```

## CLI Usage

### Field Management Commands

```bash
# List all custom fields
jira-workflow customfield list

# Search for specific fields
jira-workflow customfield list --query "priority" --type "custom"

# Get detailed field information
jira-workflow customfield get --field-id "customfield_10001"

# Update field properties
jira-workflow customfield update \
  --field-id "customfield_10001" \
  --name "Updated Field Name" \
  --description "Updated description"

# Delete field (with confirmation)
jira-workflow customfield delete --field-id "customfield_10001" --confirm
```

### Configuration Management Commands

```bash
# List field configurations
jira-workflow customfield config list

# Validate configuration
jira-workflow customfield config validate --config-id "10001"

# Copy configuration
jira-workflow customfield config copy \
  --source-config-id "10001" \
  --new-name "Copied Configuration" \
  --new-description "Copy of original configuration"
```

### Utility Commands

```bash
# List available field types
jira-workflow customfield list-types

# List available searcher types  
jira-workflow customfield list-searchers

# Test field calculation
jira-workflow customfield calculate \
  --field-id "test" \
  --expression "10 + 5 * 2" \
  --issue-data '{"fields": {}}'
```

## MCP Tool Integration

### Available MCP Tools

#### Custom Field Management Tools
- `customfield.create` - Create new custom fields
- `customfield.update` - Update existing custom fields
- `customfield.delete` - Delete custom fields
- `customfield.get` - Get field details
- `customfield.search` - Search custom fields
- `customfield.context.create` - Create field contexts
- `customfield.options.set` - Set field options
- `customfield.cascading.set` - Set cascading options
- `customfield.validate` - Validate field values
- `customfield.calculate` - Calculate field values

#### Field Configuration Tools
- `fieldconfig.list` - List field configurations
- `fieldconfig.create` - Create field configurations
- `fieldconfig.update` - Update configurations
- `fieldconfig.delete` - Delete configurations
- `fieldconfig.items.update` - Update field settings
- `fieldconfig.scheme.create` - Create configuration schemes
- `fieldconfig.scheme.assign` - Assign schemes to projects
- `fieldconfig.validate` - Validate configurations
- `fieldconfig.copy` - Copy configurations

### MCP Tool Examples

#### Creating a Custom Field via MCP
```json
{
  "tool": "customfield.create",
  "arguments": {
    "name": "Customer Impact",
    "description": "Impact level on customers",
    "type": "com.atlassian.jira.plugin.system.customfieldtypes:select",
    "searcherKey": "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher",
    "projectIds": ["10000", "10001"],
    "issueTypeIds": ["10001", "10002"]
  }
}
```

#### Setting Field Options via MCP
```json
{
  "tool": "customfield.options.set",
  "arguments": {
    "fieldId": "customfield_10001",
    "contextId": "10001",
    "options": [
      {"value": "Critical", "disabled": false},
      {"value": "High", "disabled": false},
      {"value": "Medium", "disabled": false},
      {"value": "Low", "disabled": false}
    ]
  }
}
```

#### Field Calculation via MCP
```json
{
  "tool": "customfield.calculate",
  "arguments": {
    "fieldId": "customfield_10005",
    "expression": "{customfield_10001} * {customfield_10002} + 100",
    "dependentFields": ["customfield_10001", "customfield_10002"],
    "issueData": {
      "fields": {
        "customfield_10001": 10,
        "customfield_10002": 5
      }
    },
    "updateTrigger": "onChange"
  }
}
```

## API Reference

### CustomFieldManager Class

#### Methods

##### `createCustomField(params)`
Creates a new custom field with specified configuration.

**Parameters:**
- `name` (string): Field name
- `description` (string, optional): Field description
- `type` (string): Field type identifier
- `searcherKey` (string): Searcher type identifier
- `projectIds` (string[], optional): Project restrictions
- `issueTypeIds` (string[], optional): Issue type restrictions

**Returns:** Field creation response with field ID

##### `updateCustomField(params)`
Updates an existing custom field.

**Parameters:**
- `fieldId` (string): Field ID to update
- `name` (string, optional): New field name
- `description` (string, optional): New field description

##### `setFieldOptions(params)`
Sets options for select/multi-select fields.

**Parameters:**
- `fieldId` (string): Field ID
- `contextId` (string): Context ID
- `options` (array): Array of option objects

##### `validateFieldValue(fieldId, value, issueTypeId?, projectId?)`
Validates a field value against field configuration.

**Parameters:**
- `fieldId` (string): Field ID
- `value` (any): Value to validate
- `issueTypeId` (string, optional): Issue type context
- `projectId` (string, optional): Project context

**Returns:** Validation result with errors array

##### `calculateFieldValue(params, issueData)`
Calculates field value based on expression.

**Parameters:**
- `fieldId` (string): Target field ID
- `expression` (string): Calculation expression
- `dependentFields` (string[]): Referenced field IDs
- `updateTrigger` (string): When to trigger calculation

**Returns:** Calculated value

### CustomFieldConfiguration Class

#### Methods

##### `createFieldConfiguration(params)`
Creates a new field configuration.

##### `updateFieldConfigurationItems(configId, items)`
Updates field settings within a configuration.

##### `validateFieldConfiguration(configId)`
Validates a field configuration for consistency.

##### `copyFieldConfiguration(sourceConfigId, newName, newDescription?)`
Copies an existing field configuration.

## Best Practices

### Field Design

1. **Naming Conventions**
   - Use descriptive, consistent names
   - Include context when necessary (e.g., "Customer Priority" vs "Priority")
   - Avoid special characters and spaces in field keys

2. **Field Types Selection**
   - Choose appropriate field types for data
   - Consider search and reporting requirements
   - Use cascading selects for hierarchical data

3. **Context Management**
   - Scope fields to relevant projects and issue types
   - Avoid global fields unless truly universal
   - Create separate contexts for different use cases

### Configuration Management

1. **Field Configurations**
   - Group related field settings logically
   - Use descriptive configuration names
   - Document field requirements and purposes

2. **Schemes and Mappings**
   - Map configurations to appropriate issue types
   - Test configurations before production deployment
   - Maintain consistency across similar projects

### Automation and Calculations

1. **Expression Safety**
   - Validate expressions before deployment
   - Handle division by zero and null values
   - Use parentheses for complex calculations

2. **Performance Considerations**
   - Limit dependent fields in calculations
   - Consider calculation frequency and triggers
   - Monitor system performance impact

3. **Error Handling**
   - Implement proper validation
   - Provide meaningful error messages
   - Log calculation failures for debugging

### Data Integrity

1. **Validation Rules**
   - Implement client-side and server-side validation
   - Use appropriate field constraints
   - Validate data consistency across related fields

2. **Migration and Updates**
   - Plan field changes carefully
   - Test migrations in staging environment
   - Backup data before major changes

## Troubleshooting

### Common Issues

#### Field Creation Failures
```bash
# Check field type and searcher compatibility
jira-workflow customfield list-types
jira-workflow customfield list-searchers

# Verify project and issue type IDs
jira-workflow project search --query "PROJECT_KEY"
```

#### Context and Option Issues
```bash
# List field contexts
jira-workflow customfield get --field-id "customfield_10001"

# Validate field configuration
jira-workflow customfield config validate --config-id "10001"
```

#### Calculation Problems
```bash
# Test calculation with sample data
jira-workflow customfield calculate \
  --field-id "test" \
  --expression "10 + 5" \
  --issue-data '{"fields": {}}'

# Validate field values
jira-workflow customfield validate \
  --field-id "customfield_10001" \
  --value "test_value"
```

### Error Messages

#### "Field type not supported"
- Verify field type identifier is correct
- Check if field type is available in your Jira instance
- Ensure proper permissions for field creation

#### "Context not found"
- Verify context ID exists
- Check if context applies to current project/issue type
- Ensure proper permissions for context access

#### "Calculation expression invalid"
- Check expression syntax
- Verify field references exist
- Ensure arithmetic operations are valid

### Debugging Tips

1. **Enable Debug Logging**
   ```bash
   export MCP_LOG_LEVEL=debug
   jira-workflow customfield create --name "Debug Field" ...
   ```

2. **Test in Isolation**
   - Create test fields in development environment
   - Use dry-run options when available
   - Validate configurations before applying

3. **Check Permissions**
   - Ensure "Administer Jira" permission for field management
   - Verify project-specific permissions
   - Check field configuration scheme permissions

## Advanced Use Cases

### Dynamic Field Calculations

#### Project Health Score
```javascript
// Calculate project health based on multiple metrics
"({customfield_velocity} * 0.3) + ({customfield_quality} * 0.3) + ({customfield_team_satisfaction} * 0.2) + ({customfield_customer_satisfaction} * 0.2)"
```

#### Risk Assessment Matrix
```javascript
// Risk = Impact × Probability × Detectability
"{customfield_impact} * {customfield_probability} * {customfield_detectability}"
```

#### Effort Estimation
```javascript
// Weighted effort based on complexity factors
"({customfield_technical_complexity} * 0.4) + ({customfield_business_complexity} * 0.3) + ({customfield_integration_complexity} * 0.3)"
```

### Complex Field Configurations

#### Multi-Project Field Scheme
```bash
# Create scheme for multiple project types
jira-workflow customfield config scheme create \
  --name "Multi-Project Scheme" \
  --mappings '[
    {"issueTypeId": "bug", "fieldConfigurationId": "bug_config"},
    {"issueTypeId": "story", "fieldConfigurationId": "story_config"},
    {"issueTypeId": "epic", "fieldConfigurationId": "epic_config"}
  ]'
```

#### Conditional Field Display
```bash
# Configure fields to show/hide based on issue type
jira-workflow customfield config items update \
  --config-id "10001" \
  --items '[
    {
      "fieldId": "customfield_story_points",
      "isHidden": false,
      "isRequired": true,
      "description": "Required for story estimation"
    },
    {
      "fieldId": "customfield_bug_severity", 
      "isHidden": true,
      "isRequired": false,
      "description": "Not applicable for stories"
    }
  ]'
```

This comprehensive guide covers all aspects of the Custom Fields & Advanced Configuration system. For additional support or advanced use cases, refer to the API documentation or contact the development team.
