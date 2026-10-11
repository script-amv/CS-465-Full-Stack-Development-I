export interface Trip {
  _id?: string;
  code: string;
  name: string;
  length: string;
  start: string;
  resort: string;
  location?: string;
  category?: string;
  perPerson: number;
  image: string;
  description: string;
}
