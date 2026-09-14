import { EmailLink } from "@/components/email-link";

const linkClass =
  "label link-rule text-ink-muted transition-colors duration-300 hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10 md:py-12">
        <p className="label text-ink-faint">
          © {new Date().getFullYear()} Cutter Renowden
        </p>
        <ul className="flex gap-8">
          <li>
            <EmailLink className={linkClass} />
          </li>
          <li>
            <a
              href="https://github.com/cutterrenowden"
              target="_blank"
              rel="noreferrer"
              className={linkClass}
            >
              GitHub
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
