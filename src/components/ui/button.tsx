import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "soft" | "ghost" | "coin" | "danger" | "apple";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Buttons behave like physical keys: a coloured ledge underneath, the cap rises
 * on hover and is pushed flat on press. `hover` is defined before `active` in
 * Tailwind's variant order, so pressing always wins over hovering.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold " +
  "transition-[translate,box-shadow,background-color,color] duration-150 ease-out select-none " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Rise on hover, flatten on press — shared by every raised variant. */
const lift = "hover:-translate-y-[3px] active:translate-y-[3px] ";

const variants: Record<ButtonVariant, string> = {
  primary:
    lift +
    "bg-primary text-primary-on shadow-[0_5px_0_0_var(--primary-strong)] " +
    // Deeper, not paler: the label is white, so lightening the cap would cost contrast.
    "hover:bg-[color-mix(in_srgb,var(--primary)_82%,var(--primary-strong))] " +
    "hover:shadow-[0_9px_0_0_color-mix(in_srgb,var(--primary-strong)_82%,black),0_18px_28px_-14px_color-mix(in_srgb,var(--primary)_85%,transparent)] " +
    "active:shadow-[0_2px_0_0_var(--primary-strong)]",
  soft:
    lift +
    "bg-surface text-ink border border-line shadow-[0_5px_0_0_rgb(var(--shadow-rgb)/0.12)] " +
    "hover:bg-surface-2 " +
    "hover:shadow-[0_9px_0_0_rgb(var(--shadow-rgb)/0.18),0_16px_26px_-14px_rgb(var(--shadow-rgb)/0.35)] " +
    "active:shadow-[0_2px_0_0_rgb(var(--shadow-rgb)/0.12)]",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink active:translate-y-[1px]",
  coin:
    lift +
    "bg-coin text-[#4a3a05] shadow-[0_5px_0_0_var(--coin-deep)] " +
    "hover:bg-[color-mix(in_srgb,var(--coin)_80%,white)] " +
    "hover:shadow-[0_9px_0_0_var(--coin-deep),0_16px_26px_-14px_color-mix(in_srgb,var(--coin)_85%,transparent)] " +
    "active:shadow-[0_2px_0_0_var(--coin-deep)]",
  // Apple's brand guidelines: black-on-light or white-on-dark, Apple logo left of
  // the approved label. The colours flip with the theme via CSS variables.
  apple:
    lift +
    "bg-apple-bg text-apple-fg shadow-[0_5px_0_0_var(--apple-ledge)] " +
    "hover:shadow-[0_9px_0_0_var(--apple-ledge),0_18px_28px_-14px_rgb(var(--shadow-rgb)/0.5)] " +
    "active:shadow-[0_2px_0_0_var(--apple-ledge)]",
  danger:
    lift +
    "bg-blush text-[#5b2320] shadow-[0_5px_0_0_rgb(var(--shadow-rgb)/0.25)] " +
    "hover:bg-[color-mix(in_srgb,var(--blush)_80%,white)] " +
    "hover:shadow-[0_9px_0_0_rgb(var(--shadow-rgb)/0.3),0_16px_26px_-14px_rgb(var(--shadow-rgb)/0.45)] " +
    "active:shadow-[0_2px_0_0_rgb(var(--shadow-rgb)/0.25)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className = "", ...props }: Props) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}
