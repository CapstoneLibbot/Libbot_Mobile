export const roles = {
  READER: 'READER',
  LIBRARIAN: 'LIBRARIAN',
  ADMIN: 'ADMIN',
} as const;

export type RoleKey = (typeof roles)[keyof typeof roles];
