// Props contract for the shared admin header bar.

export interface AdminHeaderProps {
  adminName?: string;
  adminRole?: string;
  onSearchChange?: (query: string) => void;
  searchValue?: string;
}