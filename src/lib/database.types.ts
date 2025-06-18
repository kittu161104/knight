export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          specialty: string
          bio: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          specialty: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          specialty?: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_works: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          file_path: string
          work_type: 'image' | 'video' | 'document'
          upload_date: string
          status: 'public' | 'private'
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          file_path: string
          work_type: 'image' | 'video' | 'document'
          upload_date?: string
          status?: 'public' | 'private'
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          file_path?: string
          work_type?: 'image' | 'video' | 'document'
          upload_date?: string
          status?: 'public' | 'private'
          updated_at?: string
        }
      }
    }
  }
}