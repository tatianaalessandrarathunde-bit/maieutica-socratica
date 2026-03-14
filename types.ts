
export type UserType = 'student' | 'teacher';
export type QuestionResponseType = 'free_text' | 'multiple_choice';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  userType: UserType;
  createdAt: number;
}

export interface Question {
  id: string;
  journeyId: string;
  text: string;
  order: number;
  responseType: QuestionResponseType;
  options?: string[];
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  journeyId: string;
  text: string;
  timestamp: number;
}

export interface Journey {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
  synthesis?: string; 
  progress?: number; // 0 to 100
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export enum SessionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}
