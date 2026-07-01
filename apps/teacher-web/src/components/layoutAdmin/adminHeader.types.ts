// Props contract for the shared admin header bar.

export interface AdminHeaderProps {
  onSearchChange?: (query: string) => void;
  searchValue?: string;
}