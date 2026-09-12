export default function WhatsAppButton() {
  const whatsappNumber = "2348143542037";

  const message = encodeURIComponent(
    "Hello Brainfriend Global Tech, I need assistance with your services."
  );

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Brainfriend Global Tech on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#25D366] shadow-[0_6px_20px_rgba(0,0,0,0.22)] transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
    >
      <span className="absolute inset-[-8px] rounded-full border-[6px] border-[#25D366]/20" />

      <svg
        viewBox="0 0 32 32"
        className="relative h-9 w-9 fill-white"
        aria-hidden="true"
      >
        <path d="M19.11 17.04c-.27-.14-1.58-.78-1.83-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.15-1.33-.79-.7-1.33-1.57-1.49-1.84-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.11 2.84c.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.58-.65 1.81-1.27.22-.62.22-1.15.16-1.27-.07-.11-.25-.18-.52-.32z" />
        <path d="M16.02 3C8.84 3 3 8.84 3 16.02c0 2.3.6 4.54 1.74 6.52L3 29l6.62-1.72a12.97 12.97 0 0 0 6.4 1.68h.01C23.2 28.96 29 23.13 29 16.02 29 8.84 23.2 3 16.02 3zm0 23.79h-.01a10.8 10.8 0 0 1-5.5-1.5l-.39-.23-3.93 1.02 1.05-3.83-.25-.4a10.75 10.75 0 1 1 9.03 4.94z" />
      </svg>
    </a>
  );
}