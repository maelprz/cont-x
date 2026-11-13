export function TeacherSwitch({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="group inline-flex min-h-8 w-fit items-center gap-2 rounded-md text-left text-sm text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#465a3b]">
      <span aria-hidden="true" className="h-[21px] w-9 shrink-0 rounded-full bg-[#cbd0c5] p-[3px] group-aria-checked:bg-[#41573b]">
        <span className="block size-[15px] rounded-full bg-white transition-transform duration-150 group-aria-checked:translate-x-[15px] motion-reduce:transition-none" />
      </span>
      {label}
    </button>
  );
}
