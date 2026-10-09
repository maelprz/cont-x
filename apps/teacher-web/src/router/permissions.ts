import type { AuthUser } from "../services/authService"; // the logged-in user's type

// true for the top-level account: 000 today, the superadmin after the rename
export function isTopAdmin(user: AuthUser | null): boolean { // used for the landing screen
  return user?.role === "admin" || user?.role === "superadmin"; // either value counts as top-level
} // end of isTopAdmin

// true when the person may open the admin screens
export function canUseAdminScreens(user: AuthUser | null): boolean { // used by the route guard
  return isTopAdmin(user) || !!user?.hasAdminGrant; // the top-level account, or a teacher holding the grant
} // end of canUseAdminScreens