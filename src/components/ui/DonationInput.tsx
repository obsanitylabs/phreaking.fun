import React, { useRef } from "react";

interface DonationInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  'data-testid'?: string;
}

const DonationInput: React.FC<DonationInputProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "0",
  'data-testid': testId,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, ".");
    val = val.replace(/[^\d.]/g, "");
    const digits = val.replace(/\./g, "");
    if (digits.length > 7) return;
    if (val === "" || /^\d*(\.\d{0,6})?$/.test(val)) {
      onChange(val);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className="inline-block p-[1px] bg-terminal-green cursor-text"
      style={{
        clipPath:
          "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
      }}
      onClick={handleContainerClick}
    >
      <div
        className={`px-4 py-2 text-sm font-bold inline-flex items-center w-full h-full bg-terminal-gray-dark text-terminal-gray-light justify-start cursor-text ${className}`}
        style={{
          clipPath:
            "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
        }}
        onClick={handleContainerClick}
      >
        <span
          className="flex items-center gap-2 cursor-text"
          onClick={handleContainerClick}
        >
          <span className="cursor-text">[Donation]</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            pattern="^\\d*(\\.\\d{0,6})?$"
            value={value}
            onChange={handleChange}
            className="bg-transparent outline-none border-none w-20 text-terminal-gray-light text-right cursor-text"
            maxLength={9}
            placeholder={placeholder}
            data-testid={testId}
          />
        </span>
      </div>
    </div>
  );
};

export default DonationInput;
