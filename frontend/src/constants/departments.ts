export const DEPARTMENTS = [
  'Information Technology',
  'Electronics & Communication',
  'Applied Science',
  'Robotics',
  'Community Services',
] as const;

export type Department = typeof DEPARTMENTS[number];
