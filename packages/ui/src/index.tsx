import type { ComponentProps } from "react";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
};

/** Shared button semantics; the web app supplies the SupportOps design tokens. */
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const variantClass = variant === "secondary" ? " secondary" : "";
  return (
    <button
      {...props}
      className={`button${variantClass}${className ? ` ${className}` : ""}`}
      type={type}
    />
  );
}
