// src/app/models/user.model.ts
export interface User {
  _id?: string;       
  name: string;
  email: string;
  mobile: string;
  password?: string;  
  role?: 'user' | 'researcher' | 'admin';
  isEmailVerified?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
}