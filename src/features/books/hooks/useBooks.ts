import { useQuery } from '@tanstack/react-query';
import { getBooks } from '../api/bookApi';

export const useBooks = () =>
  useQuery({
    queryKey: ['books'],
    queryFn: getBooks,
  });
