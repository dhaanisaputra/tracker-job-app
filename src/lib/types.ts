export const STATUSES = [
  'Applied',
  'Screening',
  'HR Interview',
  'Technical Interview',
  'Offer',
  'Accepted',
  'Rejected',
  'Withdrawn',
  'Ghosted',
] as const

export const EMPLOYMENT_TYPES = ['Full-time', 'Contract', 'Internship', 'Part-time'] as const
export const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'Onsite'] as const

export type Source = {
  id: string
  name: string
  created_at: string
}

export type JobApplication = {
  id: string
  company_name: string
  role_title: string
  source_id: string
  job_url?: string | null
  job_description?: string | null
  location?: string | null
  employment_type?: string | null
  work_arrangement?: string | null
  salary_min?: number | null
  salary_max?: number | null
  applied_date: string
  current_status: string
  contact_person?: string | null
  notes?: string | null
  next_follow_up_date?: string | null
  interview_scheduled_at?: string | null
  offer_salary?: number | null
  offer_deadline?: string | null
  created_at: string
  updated_at: string
}

export type ApplicationWithSource = JobApplication & {
  sources: { name: string } | null
}

export type Profile = {
  id: string
  full_name?: string | null
  target_role?: string | null
  linkedin_url?: string | null
  portfolio_url?: string | null
  salary_expectation?: number | null
  phone?: string | null
  updated_at?: string | null
}

export type StatusHistory = {
  id: string
  status: string
  note?: string | null
  changed_at: string
}

export const STATUS_COLORS: Record<string, string> = {
  Applied: 'bg-denim/15 text-denim',
  Screening: 'bg-denim/15 text-denim',
  'HR Interview': 'bg-denim/15 text-denim',
  'Technical Interview': 'bg-denim/15 text-denim',
  Offer: 'bg-moss/15 text-moss',
  Accepted: 'bg-moss/15 text-moss',
  Rejected: 'bg-ember/15 text-ember',
  Withdrawn: 'bg-stone/20 text-stone',
  Ghosted: 'bg-stone/20 text-stone',
}