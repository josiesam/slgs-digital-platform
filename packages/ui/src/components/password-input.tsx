import React, { useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

const PasswordInput = ({
  id,
  name,
  placeholder,
  value,
  onChange,
  autoComplete = "new-password",
  required = false,
}: {
  id?: string;
  name: string;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <InputGroup className="h-[40px] focus-within:ring-[3px]! focus-within:ring-[var(--ring,var(--slgs-focus))]! focus-within:ring-offset-2!">
      <InputGroupInput
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <InputGroupAddon
        onClick={() => setShowPassword(!showPassword)}
        align="inline-end"
      >
        {showPassword ? <IconEyeOff /> : <IconEye />}
      </InputGroupAddon>
    </InputGroup>
  );
};

export default PasswordInput;
