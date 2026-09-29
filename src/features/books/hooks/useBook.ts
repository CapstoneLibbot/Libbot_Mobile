import { useQuery } from '@tanstack/react-query';
import { getBookById } from '../api/bookApi';

export const useBook = (bookId: string) =>
  useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBookById(bookId),
    enabled: Boolean(bookId),
  });
