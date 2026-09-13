/*
Organization and Structure

config/ Directory:
Store your constant files in a dedicated config or constants folder at your project root or inside src/.

Domain-Based Files:
Separate constants by feature or domain (e.g., http-status.ts, pagination.ts, security.ts) instead of putting everything in one massive file.

index.ts Barrel Files:
Export all constants from a single entry point inside the constants folder to clean up import statements across your project.

Technical Best Practices

Use as const (Const Assertions):
Apply as const to objects and arrays so TypeScript treats properties as literal, read-only values rather than broad primitive types (string, number).

Use UPPER_SNAKE_CASE:
Name your constant values or keys in ALL_CAPS if they represent raw configuration, or standard camelCase if exporting a structured config object, following team consistency.

Derive Types Automatically:
Use typeof and keyof to create TypeScript types directly from your constant objects, which prevents type drift.
*/

export const USER_ROLES = {
  SUPER: 'super',
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];