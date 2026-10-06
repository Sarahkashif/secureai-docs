import type { PlanTier } from '@/types'

export interface PlanInfo {
  tier: PlanTier
  name: string
  price: string
  period?: string
  maxDocuments: number | null
  maxUsers: number | null
  storageMb: number | null // display allotment
  features: string[]
  highlighted?: boolean
}

export const PLANS: PlanInfo[] = [
  { tier: 'free', name: 'Free', price: '$0', period: '/month', maxDocuments: 15, maxUsers: 1, storageMb: 100, features: ['15 documents maximum', 'Basic AI assistant', '1 user', 'Standard search'] },
  { tier: 'basic', name: 'Basic', price: '$9', period: '/month', maxDocuments: 100, maxUsers: 5, storageMb: 1024, features: ['100 documents', 'Faster AI search', 'Advanced document organization', '5 users'] },
  { tier: 'professional', name: 'Professional', price: '$29', period: '/month', maxDocuments: 1000, maxUsers: null, storageMb: 10240, highlighted: true, features: ['1,000 documents', 'Team collaboration', 'Analytics dashboard', 'Priority AI responses'] },
  { tier: 'enterprise', name: 'Enterprise', price: 'Custom', maxDocuments: null, maxUsers: null, storageMb: null, features: ['Unlimited documents', 'Unlimited users', 'Dedicated support', 'Advanced security', 'Custom integrations'] },
]

export const planInfo = (tier: PlanTier) => PLANS.find((p) => p.tier === tier) ?? PLANS[0]
export const formatLimit = (n: number | null) => (n === null ? 'Unlimited' : n.toLocaleString())
export const hasAnalytics = (tier: PlanTier) => tier === 'professional' || tier === 'enterprise'
