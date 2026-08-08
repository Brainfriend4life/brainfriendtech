type AuthButtonProps = {
  text: string;
};

export default function AuthButton({
  text,
}: AuthButtonProps) {
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700"
    >
      {text}
    </button>
  );
}