// @ts-nocheck
import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password input with a show/hide toggle.
 * Drop-in replacement for `<input type="password" />` — accepts every input
 * prop (value, onChange, required, minLength, autoComplete, etc.) plus a
 * `className` that is applied to the underlying input.
 */
const PasswordInput = React.forwardRef(({ className = "", showToggle = true, ...inputProps }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} ${showToggle ? "pr-10" : ""}`}
        autoComplete={inputProps.autoComplete || "current-password"}
      />
      {showToggle && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
