export interface User {
  id: number;
  name: string;
  username: string;
}

export interface AssignedUser {
  id: number;
  name: string;
}

export interface UserLoginCredentials {
  username: string;
  password: string;
}

export interface RegisterFields {
  name: string;
  username: string;
  password: string;
}

export interface UpdateProfileFields {
  name: string;
  username: string;
}
