import { useQuery } from "@tanstack/react-query";
import { getCatalogRepository } from "@/core/composition";

export const useCategories = () => {
  return useQuery<string[], Error>({
    queryKey: ["catalog", "categories"],
    queryFn: () => getCatalogRepository().getCategories(),
  });
};
