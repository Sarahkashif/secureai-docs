export type UserRole = 'employee' | 'hr_manager' | 'admin'
export type PlanTier = 'free' | 'basic' | 'professional' | 'enterprise'

export interface Organization {
  id: string
  name: string
  plan: PlanTier
}

export interface Profile {
  id: string
  org_id: string
  full_name: string | null
  department: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export type DocCategory = 'HR' | 'Finance' | 'Company Policies' | 'Operations' | 'Legal' | 'General'
export type DocSensitivity = 'standard' | 'personal' | 'hr_confidential' | 'salary'
export type DocStatus = 'processing' | 'ready' | 'failed'

export interface DocumentRow {
  id: string
  org_id: string
  owner_id: string
  title: string
  file_path: string
  mime_type: string
  size_bytes: number
  category: DocCategory
  sensitivity: DocSensitivity
  status: DocStatus
  page_count: number | null
  chunk_count: number
  error_message: string | null
  created_at: string
  owner?: { full_name: string | null } | null
}
