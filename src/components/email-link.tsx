"use client";

// The address never appears in served HTML, the RSC payload, or as a
// contiguous string in the JS bundle — it is assembled only on click, which
// static scrapers and bundle-regex harvesters never perform.
const USER = ["cutter", "renowden"];
const HOST = ["yale", "edu"];

export function EmailLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.location.href = `mailto:${USER.join(".")}@${HOST.join(".")}`;
      }}
    >
      Email
    </button>
  );
}
