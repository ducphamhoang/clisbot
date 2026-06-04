---
task:
  id: "test-task-001"
  type: "feature"
  title: "Create utility function for safe string truncation"
  
  description: |
    Add a utility function that safely truncates strings to a maximum length,
    handling UTF-8 character boundaries correctly to avoid breaking multi-byte characters.
    
    This is a small, isolated feature that can be implemented and tested independently.
    The function should be added to src/utils/ and exported for use throughout the codebase.
    
    Motivation: Current code has no safe string truncation utility, leading to potential
    UTF-8 corruption when truncating user input or log messages.
  
  acceptance_criteria:
    - id: "AC-1"
      criterion: "Function truncateString(text, maxLength) exists in src/utils/string-utils.ts"
      measurable: true
      how_to_verify: "grep -r 'truncateString' src/utils/ should find the function"
    
    - id: "AC-2"
      criterion: "Function correctly handles UTF-8 boundaries (no broken multi-byte chars)"
      measurable: true
      how_to_verify: "Run: bun test test/utils/string-utils.test.ts"
    
    - id: "AC-3"
      criterion: "All tests pass (existing + new tests for this function)"
      measurable: true
      how_to_verify: "Run: bun test"
    
    - id: "AC-4"
      criterion: "Code review score >= 80/100"
      measurable: true
      how_to_verify: "Run: bun run code-review (if available, or manual review)"
    
    - id: "AC-5"
      criterion: "No console.error, unhandled promises, or TypeScript errors"
      measurable: true
      how_to_verify: "Run: bunx tsc --noEmit"

scope:
  files_to_touch: 
    - "src/utils/string-utils.ts"
    - "test/utils/string-utils.test.ts"
  
  files_to_not_modify: 
    - "package.json"
    - ".env"
    - "README.md"
  
  constraints:
    max_files_changed: 3
    max_lines_changed: 150
    breaking_changes_allowed: false
  
  disallowed_operations:
    - "Delete existing tests or utilities"
    - "Modify exports from other utility modules"
    - "Add new dependencies"

context:
  architecture_docs:
    - "docs/architecture/domain-language.md"
  
  example_files:
    - path: "src/utils/"
      purpose: "Where to add the new utility"
    
    - path: "test/utils/"
      purpose: "Where to add tests"
  
  key_patterns:
    - name: "Error handling"
      location: "src/utils/error-handler.ts"
      note: "Use this for any error cases"

execution:
  timeout_minutes: 30
  max_attempts: 3
  preferred_tools: ["pi", "opencode"]

success_definition: |
  Task is successful when:
  1. truncateString() function is implemented in src/utils/string-utils.ts
  2. Function correctly handles UTF-8 boundaries (test includes emoji, accents, etc.)
  3. All tests pass (at least 5 test cases covering edge cases)
  4. Code review score >= 80
  5. TypeScript compilation succeeds with no errors
  6. Function is properly exported and can be imported by other modules
