# String Utilities Context

## Existing Patterns in src/utils/

The codebase uses this pattern for utility functions:

```typescript
// src/utils/string-utils.ts (create this file)
import { logger } from '../infra/logger'

/**
 * Safely truncates a string to maxLength characters,
 * respecting UTF-8 character boundaries
 */
export function truncateString(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  
  // Truncate and handle UTF-8 boundaries
  let truncated = text.substring(0, maxLength)
  
  // Check if we broke a multi-byte UTF-8 sequence
  // If the last char is a high surrogate, remove it
  const lastChar = truncated.charCodeAt(truncated.length - 1)
  if (lastChar >= 0xD800 && lastChar <= 0xDBFF) {
    truncated = truncated.slice(0, -1)
  }
  
  return truncated
}
```

## Testing Pattern

Tests in this repo follow this structure:

```typescript
// test/utils/string-utils.test.ts
import { describe, it, expect } from 'bun:test'
import { truncateString } from '../../src/utils/string-utils'

describe('truncateString', () => {
  it('should truncate long strings', () => {
    const result = truncateString('hello world', 5)
    expect(result).toBe('hello')
  })
  
  it('should handle UTF-8 boundaries (emoji)', () => {
    const emoji = '👋hello' // emoji is 2 bytes
    const result = truncateString(emoji, 3)
    // Should be either full emoji or missing, not broken
    expect(result.length).toBeLessThanOrEqual(3)
  })
})
```

## Error Handling

If needed, use `src/utils/error-handler.ts` for consistent error handling.

## File Structure

```
src/
├── utils/
│   ├── string-utils.ts    (create)
│   ├── error-handler.ts   (existing)
│   └── ...

test/
├── utils/
│   ├── string-utils.test.ts  (create)
│   └── ...
```
