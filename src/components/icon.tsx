import { AiChat02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

export function Icon(props: HugeiconsIconProps) {
  return <HugeiconsIcon strokeWidth={2} aria-hidden="true" {...props} />;
}

export function EchoMark({ className }: { className?: string }) {
  return <Icon icon={AiChat02Icon} className={className} />;
}
