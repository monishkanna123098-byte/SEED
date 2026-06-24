/**
 * S.E.E.D. Admin — Mock user data
 * 25 Parents | 18 Clinicians | 6 Admins = 49 total
 * Parents: 25 rows → demonstrates pagination (20/page)
 */

export type UserRole   = 'PARENT' | 'CLINICIAN' | 'ADMIN'
export type UserStatus = 'active' | 'suspended'

export interface AdminUser {
  id:             string
  name:           string
  email:          string
  role:           UserRole
  registeredAt:   string   // ISO
  lastLoginAt:    string   // ISO
  isActive:       boolean
  deletedAt:      string | null
  // Parent-specific
  childCount?:    number
  screeningCount?: number
  // Clinician-specific
  specialty?:     string
  licenseNumber?: string
  inviteCodesUsed?: number
}

// ─── Parents (25) ─────────────────────────────────────────────────────────────

const PARENTS: AdminUser[] = [
  { id:'p01', name:'Kavitha Suresh',      email:'kavitha.suresh@gmail.com',   role:'PARENT', registeredAt:'2024-03-12T08:00:00Z', lastLoginAt:'2026-06-18T10:22:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:3 },
  { id:'p02', name:'Ramesh Krishnan',     email:'ramesh.krishnan@gmail.com',  role:'PARENT', registeredAt:'2024-04-08T09:15:00Z', lastLoginAt:'2026-06-15T14:05:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:4 },
  { id:'p03', name:'Priya Patel',         email:'priya.patel@gmail.com',      role:'PARENT', registeredAt:'2024-05-20T11:30:00Z', lastLoginAt:'2026-06-10T09:40:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:2 },
  { id:'p04', name:'Suresh Nair',         email:'suresh.nair@gmail.com',      role:'PARENT', registeredAt:'2024-06-01T07:45:00Z', lastLoginAt:'2025-11-02T16:10:00Z', isActive:false, deletedAt:null, childCount:1, screeningCount:0 },
  { id:'p05', name:'Anitha Rajan',        email:'anitha.rajan@gmail.com',     role:'PARENT', registeredAt:'2024-07-14T13:00:00Z', lastLoginAt:'2026-06-19T08:55:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:5 },
  { id:'p06', name:'Vikram Singh',        email:'vikram.singh@gmail.com',     role:'PARENT', registeredAt:'2024-08-03T10:20:00Z', lastLoginAt:'2026-05-28T11:30:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:1 },
  { id:'p07', name:'Meena Chandran',      email:'meena.chandran@gmail.com',   role:'PARENT', registeredAt:'2024-09-17T15:45:00Z', lastLoginAt:'2026-06-12T13:15:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:3 },
  { id:'p08', name:'Sonal Mehta',         email:'sonal.mehta@gmail.com',      role:'PARENT', registeredAt:'2024-10-05T08:30:00Z', lastLoginAt:'2026-06-01T09:00:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:2 },
  { id:'p09', name:'Sunita Sharma',       email:'sunita.sharma@gmail.com',    role:'PARENT', registeredAt:'2024-10-22T12:00:00Z', lastLoginAt:'2026-06-17T15:45:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:6 },
  { id:'p10', name:'Rajesh Kumar',        email:'rajesh.kumar@gmail.com',     role:'PARENT', registeredAt:'2024-11-08T09:10:00Z', lastLoginAt:'2026-04-30T10:20:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:1 },
  { id:'p11', name:'Deepa Venkatesh',     email:'deepa.venkatesh@gmail.com',  role:'PARENT', registeredAt:'2024-11-25T14:30:00Z', lastLoginAt:'2026-06-14T08:35:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:4 },
  { id:'p12', name:'Mohan Das',           email:'mohan.das@gmail.com',        role:'PARENT', registeredAt:'2024-12-10T10:00:00Z', lastLoginAt:'2025-12-14T12:00:00Z', isActive:false, deletedAt:null, childCount:1, screeningCount:2 },
  { id:'p13', name:'Lakshmi Iyer',        email:'lakshmi.iyer@gmail.com',     role:'PARENT', registeredAt:'2025-01-07T11:15:00Z', lastLoginAt:'2026-06-20T07:50:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:3 },
  { id:'p14', name:'Ravi Shankar',        email:'ravi.shankar@gmail.com',     role:'PARENT', registeredAt:'2025-01-28T09:45:00Z', lastLoginAt:'2026-05-10T14:00:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:1 },
  { id:'p15', name:'Padma Subramanian',   email:'padma.subramaniam@gmail.com',role:'PARENT', registeredAt:'2025-02-14T13:30:00Z', lastLoginAt:'2026-06-08T11:25:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:2 },
  { id:'p16', name:'Anil Gupta',          email:'anil.gupta@gmail.com',       role:'PARENT', registeredAt:'2025-02-28T08:00:00Z', lastLoginAt:'2026-06-16T09:40:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:4 },
  { id:'p17', name:'Divya Kapoor',        email:'divya.kapoor@gmail.com',     role:'PARENT', registeredAt:'2025-03-15T10:30:00Z', lastLoginAt:'2026-03-20T10:00:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:0 },
  { id:'p18', name:'Dilip Mishra',        email:'dilip.mishra@gmail.com',     role:'PARENT', registeredAt:'2025-03-30T12:45:00Z', lastLoginAt:'2026-06-11T13:05:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:3 },
  { id:'p19', name:'Rekha Pillai',        email:'rekha.pillai@gmail.com',     role:'PARENT', registeredAt:'2025-04-12T09:00:00Z', lastLoginAt:'2026-05-22T15:30:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:2 },
  { id:'p20', name:'Ganesh Rao',          email:'ganesh.rao@gmail.com',       role:'PARENT', registeredAt:'2025-04-25T14:15:00Z', lastLoginAt:'2026-06-19T11:00:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:5 },
  { id:'p21', name:'Namrata Joshi',       email:'namrata.joshi@gmail.com',    role:'PARENT', registeredAt:'2025-05-08T08:30:00Z', lastLoginAt:'2026-06-05T09:15:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:1 },
  { id:'p22', name:'Tarun Saxena',        email:'tarun.saxena@gmail.com',     role:'PARENT', registeredAt:'2025-05-20T11:00:00Z', lastLoginAt:'2026-04-18T14:45:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:2 },
  { id:'p23', name:'Pooja Bhat',          email:'pooja.bhat@gmail.com',       role:'PARENT', registeredAt:'2025-06-03T10:00:00Z', lastLoginAt:'2026-06-13T10:30:00Z', isActive:true,  deletedAt:null, childCount:1, screeningCount:3 },
  { id:'p24', name:'Nikhil Verma',        email:'nikhil.verma@gmail.com',     role:'PARENT', registeredAt:'2025-06-18T09:30:00Z', lastLoginAt:'2026-01-10T12:00:00Z', isActive:false, deletedAt:null, childCount:1, screeningCount:1 },
  { id:'p25', name:'Shobha Menon',        email:'shobha.menon@gmail.com',     role:'PARENT', registeredAt:'2025-07-01T13:00:00Z', lastLoginAt:'2026-06-20T08:00:00Z', isActive:true,  deletedAt:null, childCount:2, screeningCount:2 },
]

// ─── Clinicians (18) ──────────────────────────────────────────────────────────

const CLINICIANS: AdminUser[] = [
  { id:'c01', name:'Dr. Priya Rajan',         email:'dr.priya.rajan@seed-platform.in',       role:'CLINICIAN', registeredAt:'2024-01-15T08:00:00Z', lastLoginAt:'2026-06-20T09:00:00Z', isActive:true,  deletedAt:null, specialty:'Developmental Pediatrics', licenseNumber:'MH-DEV-1042', inviteCodesUsed:4 },
  { id:'c02', name:'Dr. Arjun Mehta',         email:'dr.arjun.mehta@seed-platform.in',       role:'CLINICIAN', registeredAt:'2024-01-15T08:30:00Z', lastLoginAt:'2026-06-19T14:30:00Z', isActive:true,  deletedAt:null, specialty:'Developmental Pediatrics', licenseNumber:'MH-DEV-1087', inviteCodesUsed:4 },
  { id:'c03', name:'Dr. Sunitha Krishnamurthy',email:'dr.sunitha.k@seed-platform.in',        role:'CLINICIAN', registeredAt:'2024-03-01T10:00:00Z', lastLoginAt:'2026-06-18T11:15:00Z', isActive:true,  deletedAt:null, specialty:'Child Psychiatry',          licenseNumber:'KA-PSY-0234', inviteCodesUsed:3 },
  { id:'c04', name:'Dr. Ravi Prasad',         email:'dr.ravi.prasad@seed-platform.in',       role:'CLINICIAN', registeredAt:'2024-04-10T09:00:00Z', lastLoginAt:'2026-06-17T10:00:00Z', isActive:true,  deletedAt:null, specialty:'Pediatric Psychology',      licenseNumber:'TN-PSY-0789', inviteCodesUsed:2 },
  { id:'c05', name:'Dr. Meera Nambiar',       email:'dr.meera.nambiar@seed-platform.in',     role:'CLINICIAN', registeredAt:'2024-05-22T11:00:00Z', lastLoginAt:'2026-06-15T09:45:00Z', isActive:true,  deletedAt:null, specialty:'Occupational Therapy',      licenseNumber:'KL-OT-0312',  inviteCodesUsed:3 },
  { id:'c06', name:'Dr. Kiran Bose',          email:'dr.kiran.bose@seed-platform.in',        role:'CLINICIAN', registeredAt:'2024-06-14T08:30:00Z', lastLoginAt:'2025-10-20T14:00:00Z', isActive:false, deletedAt:null, specialty:'Speech-Language Pathology', licenseNumber:'WB-SLP-0561',  inviteCodesUsed:1 },
  { id:'c07', name:'Dr. Aarthi Subramaniam',  email:'dr.aarthi.s@seed-platform.in',          role:'CLINICIAN', registeredAt:'2024-07-05T13:00:00Z', lastLoginAt:'2026-06-20T08:30:00Z', isActive:true,  deletedAt:null, specialty:'Developmental Pediatrics', licenseNumber:'TN-DEV-0944', inviteCodesUsed:4 },
  { id:'c08', name:'Dr. Suresh Chandra',      email:'dr.suresh.chandra@seed-platform.in',    role:'CLINICIAN', registeredAt:'2024-08-18T09:15:00Z', lastLoginAt:'2026-06-14T12:00:00Z', isActive:true,  deletedAt:null, specialty:'Child Neurology',           licenseNumber:'DL-NEU-0128', inviteCodesUsed:2 },
  { id:'c09', name:'Dr. Nalini Ramachandran', email:'dr.nalini.r@seed-platform.in',          role:'CLINICIAN', registeredAt:'2024-09-02T10:30:00Z', lastLoginAt:'2026-06-16T10:15:00Z', isActive:true,  deletedAt:null, specialty:'Behavioral Therapy',        licenseNumber:'TN-BHV-0773', inviteCodesUsed:3 },
  { id:'c10', name:'Dr. Vidhya Natarajan',    email:'dr.vidhya.n@seed-platform.in',          role:'CLINICIAN', registeredAt:'2024-10-11T08:00:00Z', lastLoginAt:'2026-06-13T09:30:00Z', isActive:true,  deletedAt:null, specialty:'Pediatric Neurology',       licenseNumber:'TN-NEU-0415', inviteCodesUsed:2 },
  { id:'c11', name:'Dr. Prakash Menon',       email:'dr.prakash.menon@seed-platform.in',     role:'CLINICIAN', registeredAt:'2024-11-20T11:45:00Z', lastLoginAt:'2026-06-12T14:20:00Z', isActive:true,  deletedAt:null, specialty:'Developmental Pediatrics', licenseNumber:'KL-DEV-0892', inviteCodesUsed:3 },
  { id:'c12', name:'Dr. Kaveri Srinivasan',   email:'dr.kaveri.s@seed-platform.in',          role:'CLINICIAN', registeredAt:'2025-01-08T09:00:00Z', lastLoginAt:'2026-06-11T11:00:00Z', isActive:true,  deletedAt:null, specialty:'Child Psychiatry',          licenseNumber:'AP-PSY-0337', inviteCodesUsed:2 },
  { id:'c13', name:'Dr. Divya Balakrishnan',  email:'dr.divya.b@seed-platform.in',           role:'CLINICIAN', registeredAt:'2025-02-14T10:00:00Z', lastLoginAt:'2026-06-10T10:45:00Z', isActive:true,  deletedAt:null, specialty:'Pediatric Psychology',      licenseNumber:'KA-PSY-0521', inviteCodesUsed:1 },
  { id:'c14', name:'Dr. Harish Anand',        email:'dr.harish.anand@seed-platform.in',      role:'CLINICIAN', registeredAt:'2025-03-01T08:30:00Z', lastLoginAt:'2026-06-09T09:15:00Z', isActive:true,  deletedAt:null, specialty:'Occupational Therapy',      licenseNumber:'MH-OT-0644',  inviteCodesUsed:2 },
  { id:'c15', name:'Dr. Padmavathi Venkat',   email:'dr.padmavathi.v@seed-platform.in',      role:'CLINICIAN', registeredAt:'2025-04-10T12:00:00Z', lastLoginAt:'2026-06-07T13:30:00Z', isActive:true,  deletedAt:null, specialty:'Speech-Language Pathology', licenseNumber:'TN-SLP-0209',  inviteCodesUsed:1 },
  { id:'c16', name:'Dr. Sanjay Gupta',        email:'dr.sanjay.gupta@seed-platform.in',      role:'CLINICIAN', registeredAt:'2025-05-15T09:00:00Z', lastLoginAt:'2026-06-06T10:00:00Z', isActive:true,  deletedAt:null, specialty:'Developmental Pediatrics', licenseNumber:'MH-DEV-1103', inviteCodesUsed:1 },
  { id:'c17', name:'Dr. Rekha Iyer',          email:'dr.rekha.iyer@seed-platform.in',        role:'CLINICIAN', registeredAt:'2025-06-01T10:30:00Z', lastLoginAt:'2026-06-05T08:45:00Z', isActive:true,  deletedAt:null, specialty:'Child Neurology',           licenseNumber:'KA-NEU-0718', inviteCodesUsed:1 },
  { id:'c18', name:'Dr. Manjula Krishnan',    email:'dr.manjula.k@seed-platform.in',         role:'CLINICIAN', registeredAt:'2025-07-20T11:00:00Z', lastLoginAt:'2025-12-05T09:00:00Z', isActive:false, deletedAt:null, specialty:'Behavioral Therapy',        licenseNumber:'TN-BHV-0881', inviteCodesUsed:0 },
]

// ─── Admins (6) ───────────────────────────────────────────────────────────────

const ADMINS: AdminUser[] = [
  { id:'a01', name:'Platform Admin',    email:'admin@seed-platform.in',          role:'ADMIN', registeredAt:'2023-11-01T08:00:00Z', lastLoginAt:'2026-06-21T07:45:00Z', isActive:true, deletedAt:null },
  { id:'a02', name:'Yuva K.',           email:'yuva.k@seed-platform.in',         role:'ADMIN', registeredAt:'2023-11-01T08:05:00Z', lastLoginAt:'2026-06-21T09:30:00Z', isActive:true, deletedAt:null },
  { id:'a03', name:'DevOps Admin',      email:'devops@seed-platform.in',         role:'ADMIN', registeredAt:'2024-01-10T09:00:00Z', lastLoginAt:'2026-06-20T22:15:00Z', isActive:true, deletedAt:null },
  { id:'a04', name:'Data Admin',        email:'data.admin@seed-platform.in',     role:'ADMIN', registeredAt:'2024-02-15T10:00:00Z', lastLoginAt:'2026-06-19T11:00:00Z', isActive:true, deletedAt:null },
  { id:'a05', name:'Support Admin',     email:'support@seed-platform.in',        role:'ADMIN', registeredAt:'2024-04-01T09:30:00Z', lastLoginAt:'2026-06-18T08:30:00Z', isActive:true, deletedAt:null },
  { id:'a06', name:'Clinical Ops',      email:'clinical.ops@seed-platform.in',   role:'ADMIN', registeredAt:'2024-06-01T11:00:00Z', lastLoginAt:'2026-06-17T14:00:00Z', isActive:true, deletedAt:null },
]

// ─── Export ───────────────────────────────────────────────────────────────────

export const MOCK_USERS: AdminUser[] = [...PARENTS, ...CLINICIANS, ...ADMINS]
