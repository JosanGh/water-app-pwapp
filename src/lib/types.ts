export interface ProductionRun {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  rollsUsed: number;
  weightKg: number;
  packingBagsUsed: number;
  bagsProduced: number; // Finished sellable sachet bags (e.g. 30 sachets per outer bag)
  leakageBags: number;
  freeBags: number;
  operator?: string;
  shift?: 'Day' | 'Night';
  notes?: string;
  recordedBy?: string;
  recordedByUserId?: string;
}

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Deposit' | 'Credit';

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  customerName: string;
  bagsSold: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  momoAmount: number;
  bankAmount: number;
  leakageBags?: number;
  freeBags?: number;
  recordedBy: string;
  recordedByUserId?: string;
}

export interface BankDeposit {
  id: string;
  date: string;
  amount: number;
  bankName: string;
  reference?: string;
  depositedBy: string;
  depositedByUserId?: string;
  source?: 'Manager' | 'Admin';
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  recordedBy: string;
  recordedByUserId?: string;
}

export interface Intake {
  id: string;
  date: string;
  qty: number; // Number of rolls
  weightKg: number;
  supplier?: string;
  batchNo?: string;
  recordedBy?: string;
  recordedByUserId?: string;
}

export interface Issuance {
  id: string;
  date: string;
  qty: number; // Number of rolls issued to manager
  weightKg: number;
  issuedTo?: string;
  batchNo?: string;
  accepted?: boolean;
  recordedBy?: string;
  recordedByUserId?: string;
  issuedByUserId?: string;
}

export interface BagIntake {
  id: string;
  date: string;
  qty: number; // Outer packing bags
  supplier?: string;
  recordedBy?: string;
  recordedByUserId?: string;
}

export interface BagIssuance {
  id: string;
  date: string;
  qty: number; // Outer packing bags issued to manager
  issuedTo?: string;
  accepted?: boolean;
  recordedBy?: string;
  recordedByUserId?: string;
  issuedByUserId?: string;
}

export interface DayMetricSummary {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Monday"
  formattedDate: string; // e.g. "15 Oct 2026"
  isToday: boolean;
  rollsProduced: number; // rolls used/processed in production
  materialKg: number; // kg of roll material used
  packingBagsUsed: number; // packing bags used
  bagsProduced: number; // sachet bags produced
  leakages: number; // total leakages (production + sales)
  freeGiveaways: number; // other bags / free giveaways
  totalSoldBags: number; // bags sold
  cashSales: number; // GH₵
  bankDeposits: number; // GH₵
  momoPayments: number; // GH₵
  expenditure: number; // GH₵ (manager + admin expenses)
}

export interface WeekMetricSummary {
  weekLabel: string;
  startDate: string;
  endDate: string;
  days: DayMetricSummary[];
  totals: {
    rollsProduced: number;
    materialKg: number;
    packingBagsUsed: number;
    bagsProduced: number;
    leakages: number;
    freeGiveaways: number;
    totalSoldBags: number;
    cashSales: number;
    bankDeposits: number;
    momoPayments: number;
    expenditure: number;
  };
}

export interface AppData {
  productionRuns: ProductionRun[];
  sales: Sale[];
  bankDeposits: BankDeposit[];
  adminbankDeposits: BankDeposit[];
  expenses: Expense[];
  adminExpenses: Expense[];
  intake: Intake[];
  issuance: Issuance[];
  bagIntake: BagIntake[];
  bagIssuance: BagIssuance[];
  expenseCategories: string[];
  users: UserProfile[];
  machines: string[];
  settings: CompanySettings;
  businessDetails: BusinessDetails;
  auditLog: AuditEntry[];
  notifications: Notification[];
  rollTypes: RollType[];
  bagTypes: BagType[];
  bagUsage: BagUsage[];
  debtPayments: DebtPayment[];
  lastMidnightCheck?: string; // YYYY-MM-DD
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  truckNo?: string;
}

export interface CompanySettings {
  pricePerBag: number;
  companyName: string;
  lowStockRollKg: number;
  lowStockBagQty: number;
  lowStockFinishedBags: number;
}

export interface BusinessDetails {
  name: string;
  address: string;
  phone: string;
  tin: string;
  isRegistered: boolean;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  userId?: string;
  role: UserRole;
  action: string;
  detail: string;
}

export interface Notification {
  id: string;
  ts: string;
  title: string;
  msg: string;
  read: boolean;
}

export interface RollType {
  id: string;
  name: string;
  standardWeightKg: number;
  yieldValue: number;
}

export interface BagType {
  id: string;
  name: string;
  capacity: number;
}

export interface BagUsage {
  id: string;
  date: string;
  qty: number;
  recordedBy?: string;
  recordedByUserId?: string;
}

export interface DebtPayment {
  id: string;
  date: string;
  amount: number;
  customerName: string;
  recordedBy: string;
  recordedByUserId?: string;
}

export type UserRole = 'owner' | 'manager' | 'cashier' | 'driver';

export interface UserSession {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
}

export interface OrganizationContext {
  id: string;
  name: string;
  productId: string;
  userId: string;
  userName: string;
  role: UserRole;
}
