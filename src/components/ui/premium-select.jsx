import { useEffect, useState } from "react";
import Select from "react-select";

function useDarkMode() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains("dark")
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setDark(document.documentElement.classList.contains("dark"));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return dark;
}

export function PremiumSelect({
    value,
    onChange,
    options = [],
    placeholder = "Select...",
    isDisabled = false,
    isClearable = false,
}) {
    const dark = useDarkMode();

    return (
        <Select
            value={options.find((opt) => opt.value === value) || null}
            onChange={(option) => onChange(option?.value || "")}
            options={options}
            placeholder={placeholder}
            isDisabled={isDisabled}
            isClearable={isClearable}
            classNamePrefix="premium-select"

            menuPortalTarget={document.body}
            menuPosition="fixed"
            menuPlacement="auto"
            menuShouldScrollIntoView={false}
            styles={{
                control: (base, state) => ({
                    ...base,
                    minHeight: "40px",
                    borderRadius: "12px",
                    backgroundColor: dark ? "#020617" : "#ffffff",
                    borderColor: state.isFocused ? "#4cae39" : dark ? "#1e293b" : "#e2e8f0",
                    boxShadow: state.isFocused ? "0 0 0 2px rgba(76,174,57,0.20)" : "none",
                    color: dark ? "#f8fafc" : "#0f172a",
                    fontSize: "14px",
                    cursor: "pointer",
                }),

                singleValue: (base) => ({
                    ...base,
                    color: dark ? "#f8fafc" : "#0f172a",
                }),

                input: (base) => ({
                    ...base,
                    color: dark ? "#f8fafc" : "#0f172a",
                }),

                placeholder: (base) => ({
                    ...base,
                    color: dark ? "#94a3b8" : "#64748b",
                }),

                menu: (base) => ({
                    ...base,
                    backgroundColor: dark ? "#020617" : "#ffffff",
                    borderRadius: "14px",
                    overflow: "hidden",
                    zIndex: 99999,
                    border: dark ? "1px solid #1e293b" : "1px solid #e2e8f0",
                    boxShadow: dark
                        ? "0 18px 45px rgba(0,0,0,0.45)"
                        : "0 18px 45px rgba(15,23,42,0.16)",
                }),

                menuPortal: (base) => ({
                    ...base,
                    zIndex: 99999,
                }),

                option: (base, state) => ({
                    ...base,
                    borderRadius: "10px",
                    fontSize: "14px",
                    cursor: "pointer",
                    backgroundColor: state.isSelected
                        ? "#4cae39"
                        : state.isFocused
                            ? dark
                                ? "#14532d"
                                : "#f0fdf4"
                            : "transparent",
                    color: state.isSelected ? "#ffffff" : dark ? "#f8fafc" : "#0f172a",
                }),

                dropdownIndicator: (base, state) => ({
                    ...base,
                    color: state.isFocused ? "#4cae39" : dark ? "#94a3b8" : "#64748b",
                }),

                clearIndicator: (base) => ({
                    ...base,
                    color: dark ? "#94a3b8" : "#64748b",
                }),

                indicatorSeparator: (base) => ({
                    ...base,
                    backgroundColor: dark ? "#1e293b" : "#e2e8f0",
                }),
            }}
        />
    );
}