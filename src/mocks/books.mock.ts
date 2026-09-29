import { Book } from '../features/books/types/book.types';

export const booksMock: Book[] = [
  {
    id: 'bk-1001',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '9780134494166',
    category: 'Software Engineering',
    description: 'A practical guide to architecture and maintainability in modern software systems.',
    available: true,
    shelf: 'A-12',
    floor: 2,
  },
  {
    id: 'bk-1002',
    title: 'Introduction to Robotics',
    author: 'John Craig',
    isbn: '9780070131432',
    category: 'Robotics',
    description: 'Foundations for autonomous and intelligent robotics with practical examples.',
    available: false,
    shelf: 'R-02',
    floor: 3,
  },
  {
    id: 'bk-1003',
    title: 'Database Systems',
    author: 'Thomas Connolly',
    isbn: '9780132943260',
    category: 'Data',
    description: 'An accessible overview of database design, optimization, and system implementation.',
    available: true,
    shelf: 'D-08',
    floor: 1,
  },
];
