import type { IconSvgElement } from "@hugeicons/react";

import { Icon } from "@/components/icon";

export function PageHeading({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: IconSvgElement;
}) {
  return (
    <header className="mb-8 flex max-w-3xl flex-col gap-4">
      {eyebrow && (
        <div className="type-eyebrow text-muted-foreground flex items-center gap-2">
          {icon && <Icon icon={icon} size={18} />}
          <span>{eyebrow}</span>
        </div>
      )}
      <h1 className="type-display-lg">{title}</h1>
      {description && (
        <p className="text-muted-foreground max-w-[65ch] text-base leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}
