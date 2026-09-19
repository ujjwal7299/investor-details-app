export interface AdminLoginResponse {
  success: boolean;
  message: string;
  data: { token: string };
}

export interface InvestorRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
  createdAt: string;
  updatedAt?: string;
  updatedDetails?: Record<string, string>;
}
