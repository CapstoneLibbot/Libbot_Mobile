import { api } from '../../../services/api/axiosClient';
import { Book } from '../types/book.types';

export const getBooks = async (): Promise<Book[]> => {
  const { data } = await api.get<Book[]>('/books');
  return data;
};

export const getBookById = async (bookId: string): Promise<Book> => {
  const { data } = await api.get<Book>(`/books/${bookId}`);
  return data;
};
