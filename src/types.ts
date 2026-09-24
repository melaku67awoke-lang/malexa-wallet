export type UserRole = "USER" | "ADMIN";

export type KycStatus =
  | "NOT_SUBMITTED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  kyc_status?: KycStatus;
}
