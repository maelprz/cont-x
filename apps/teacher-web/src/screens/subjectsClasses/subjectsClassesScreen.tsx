import { useState } from "react"; // local state for the header search box
import { AdminHeader } from "../../components/layoutAdmin/adminHeader"; // the same top bar the other admin screens use
import { AdminAreaSidebar } from "../../components/layoutAdmin/adminAreaSidebar"; // picks the right sidebar for admins and teacher-admins

export function SubjectsClassesScreen() { // the screen the new sidebar button opens
  const [searchQuery, setSearchQuery] = useState(""); // the header search box needs a value and a setter

  return ( // what the screen draws
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      {/* same page frame as Audit Logs; the sidebar highlights the new item */}
      <AdminAreaSidebar activeItem="subjectsClasses" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* top bar with the search box */}
        <AdminHeader searchValue={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {/* breadcrumb in the same style as the other admin screens */}
          <p className="text-xs opacity-60 mb-2">Core System &gt; Subjects &amp; Classes</p>
          {/* page title */}
          <h1 className="text-2xl font-bold mb-1">Subjects &amp; Classes</h1>
          {/* placeholder text until the real list is built */}
          <p className="text-sm opacity-70 max-w-xl">
            Create subjects, add classes to them, and assign each class to a teacher.
          </p>
        </main>
      </div>
    </div>
  );
}