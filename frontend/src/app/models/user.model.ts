export interface User {
  name: string;
  email: string;
  mobile: string;
  address: string;
  aadhaarNumber: string;
  panNumber: string;
}

export interface UserResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    updated: boolean;
  };
}

export interface ValidationErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
}
