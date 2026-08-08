type AuthInputProps = {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

export default function AuthInput({
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
}: AuthInputProps) {
  return (
    <div>
      <label className="mb-2 block font-medium">
        {label}
      </label>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border p-3 outline-none focus:border-indigo-600"
      />
    </div>
  );
}