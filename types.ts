
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export enum LessonType {
  VIDEO = 'video',
  PDF = 'pdf',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment'
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_verified?: boolean;
  is_active?: boolean;
  createdAt?: string;
  stats?: {
    courses_created?: number;
    total_students?: number;
    courses_enrolled?: number;
    avg_completion?: number;
  };
}

export interface Announcement {
  id: number;
  course_id: number;
  title: string;
  message: string;
  createdAt: string;
}

export interface DiscussionReply {
  id: number;
  topic_id: number;
  content: string;
  createdAt: string;
  User: {
    name: string;
    role: UserRole;
  };
}

export interface DiscussionTopic {
  id: number;
  course_id: number;
  title: string;
  content: string;
  createdAt: string;
  User: {
    name: string;
    role: UserRole;
  };
  DiscussionReplies?: DiscussionReply[];
  reply_count?: number;
}

export interface Question {
  id: number;
  lesson_id: number;
  question_text: string;
  options: string[]; 
}

export interface Submission {
  id: number;
  user_id: number;
  lesson_id: number;
  score: number;
  completed_at: string;
}

export interface AssignmentSubmission {
  id: number;
  lesson_id: number;
  user_id: number;
  file_path: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  User?: {
    name: string;
    email: string;
  };
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  type: LessonType;
  content_url: string;
  position: number;
  target_students?: string;
  due_date?: string; 
  Questions?: Question[];
  Submissions?: Submission[];
  AssignmentSubmissions?: AssignmentSubmission[];
}

export interface CourseFeedback {
  id: number;
  rating: number;
  comment: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  video_embed_url: string;
  teacher_id: number;
  access_days: number;
  createdAt?: string;
  Teacher?: {
    name: string;
  };
  Lessons?: Lesson[];
  CourseFeedbacks?: CourseFeedback[];
}

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  expires_at: string;
  is_active: boolean;
  enrolled_at: string;
}

export interface DashboardCourse {
  course_id: number;
  title: string;
  thumbnail_url: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  expires_at: string;
  is_active: boolean;
  certificate_url?: string;
}

export interface GradebookData {
  columns: { id: number; title: string }[];
  rows: {
    student_name: string;
    student_email: string;
    grades: Record<number, number>;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalSubmissions: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SystemSettings {
  ENABLE_PUBLIC_REGISTRATION: boolean;
  REQUIRE_EMAIL_VERIFICATION: boolean;
  MAINTENANCE_MODE: boolean;
  ENABLE_CERTIFICATES: boolean;
  ENABLE_STUDENT_UPLOADS: boolean;
  SHOW_COURSE_ANNOUNCEMENTS: boolean;
  SHOW_FEATURED_COURSES: boolean;
  ENABLE_DARK_MODE: boolean;
}

export interface CalendarTask {
  id: number;
  title: string;
  date: string;
  description?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'quiz' | 'assignment' | 'personal';
  link?: string;
  description?: string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'submission' | 'reply' | 'system';
  is_read: boolean;
  link?: string;
  createdAt: string;
}
