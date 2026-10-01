import { useQuery } from "@tanstack/react-query";
import { catalogRepository } from "../../../infrastructure/repositories/catalog.repository";

export const useCategories = () => {
  return useQuery<string[], Error>({
    queryKey: ["catalog", "categories"],
    queryFn: () => catalogRepository.getCategories(),
  });
};
