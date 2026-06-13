export type Company = {
  id: string
  name: string
  domain?: string
  createdAt?: string
  status?: string
  industry?: string
  employees?: number
}

export type Person = {
  id: string
  name: string
  role?: string
  status?: string
  email?: string
  createdAt?: string
}

export type Opportunity = {
  id: string
  name: string
  status?: string
  stage?: string
  amount?: number
  closeDate?: string
}

export type Task = {
  id: string
  title: string
  status?: string
  dueDate?: string
  assignee?: string
}
