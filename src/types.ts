export type UserType = 'user' | 'organizer';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  userType: UserType;
  company?: string;
  created_at?: string;
}