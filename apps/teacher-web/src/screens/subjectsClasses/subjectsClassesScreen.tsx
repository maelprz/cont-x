import { useState } from "react"; 
import { AdminHeader } from "../../components/layoutAdmin/adminHeader"; 
import { AdminAreaSidebar } from "../../components/layoutAdmin/adminAreaSidebar"; 
import { useSubjectsClasses } from "../../hooks/useSubjectsClasses";

export function SubjectsClassesScreen() { // TEMPORARY version, only for testing the data layer
  const [searchQuery, setSearchQuery] = useState(""); // the header search box needs a value and a setter
  const { subjects, isLoading, error, addSubject } = useSubjectsClasses(); // loads the data and gives us the create action
  const [newName, setNewName] = useState(""); // text typed into the temporary box
  const [message, setMessage] = useState<string | null>(null); // result of the last create attempt

  async function handleCreate() { // runs when the temporary button is clicked
    try {
      await addSubject(newName); // ask the database to create it
      setNewName(""); // clear the box
      setMessage("Created."); // tell the tester it worked
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed."); // show the safe error message
    }
  }

  return (
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <AdminAreaSidebar activeItem="subjectsClasses" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader searchValue={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <h1 className="text-2xl font-bold mb-4">Subjects &amp; Classes</h1>
          {/* temporary create box */}
          <div className="flex gap-2 mb-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New subject name" className="border rounded px-3 py-2" />
            <button onClick={handleCreate} className="border rounded px-3 py-2">Create</button>
          </div>
          {message && <p className="text-sm mb-4">{message}</p>}
          {/* temporary list */}
          {isLoading && <p>Loading...</p>}
          {error && <p>{error}</p>}
          <ul>
            {subjects.map((s) => (
              <li key={s.id}>{s.codePrefix} - {s.name} ({s.classes.length} classes)</li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}