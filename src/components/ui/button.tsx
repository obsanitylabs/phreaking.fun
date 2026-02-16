import React, { ReactNode, ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
  variant?: "primary" | "secondary";
  text?: "left" | "center";
  children?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

export default function Button({
  value,
  variant = "primary",
  text = "left",
  children,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}: ButtonProps) {
  const clipPath =
    "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

  const isPrimary = variant === "primary";

  return (
    <div
      className="inline-block p-[1px] bg-terminal-green"
      style={{ clipPath }}
    >
      <button
        className={clsx(
          "px-4 py-2 text-sm font-bold inline-flex items-center w-full h-full",
          {
            "bg-terminal-green text-terminal-black": isPrimary,
            "bg-terminal-gray-dark text-terminal-gray-light": !isPrimary,
            "justify-center": text === "center",
            "justify-start": text === "left",
          },
          className,
        )}
        style={{ clipPath }}
        {...props}
      >
        <span
          className={clsx("flex items-center gap-2", {
            "justify-center w-full": text === "center",
            "justify-start": text === "left",
          })}
        >
          {leftIcon && (
            <div
              className={clsx(
                "border border-terminal-black flex items-center justify-center",
                {
                  "bg-terminal-black text-terminal-gray-light": isPrimary,
                  "bg-terminal-gray": !isPrimary,
                },
                className,
              )}
            >
              {leftIcon}
            </div>
          )}
          {value ?? children}
          {rightIcon && (
            <div
              className={clsx(
                "border border-terminal-black flex items-center justify-center",
                {
                  "bg-terminal-black text-terminal-gray-light": isPrimary,
                  "bg-terminal-gray": !isPrimary,
                },
                className,
              )}
            >
              {rightIcon}
            </div>
          )}
        </span>
      </button>
    </div>
  );
}
