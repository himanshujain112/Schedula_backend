export class SignupDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  specialization?: string; // Optional for patients
}
