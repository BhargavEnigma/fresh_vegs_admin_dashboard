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
    isMulti = false,
    menuPortalTarget,
    menuPosition,
}) {
    const dark = useDarkMode();
    const resolvedMenuPortalTarget =
        menuPortalTarget === undefined
            ? typeof document !== "undefined"
                ? document.body
                : undefined
            : menuPortalTarget;
    const selectedOption = isMulti
        ? options.filter((option) =>
            (Array.isArray(value) ? value : []).some(
                (selectedValue) => String(option.value) === String(selectedValue)
            )
        )
        : options.find((option) => String(option.value) === String(value ?? "")) || null;

    return (
        <Select
            value={selectedOption}
            onChange={(selection) =>
                onChange(
                    isMulti
                        ? (selection || []).map((option) => option.value)
                        : selection?.value ?? ""
                )
            }
            options={options}
            placeholder={placeholder}
            isDisabled={isDisabled}
            isClearable={isClearable}
            isMulti={isMulti}
            classNamePrefix="premium-select"

            menuPortalTarget={resolvedMenuPortalTarget}
            menuPosition={menuPosition || (resolvedMenuPortalTarget ? "fixed" : "absolute")}
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

                multiValue: (base) => ({
                    ...base,
                    borderRadius: "9999px",
                    backgroundColor: dark ? "#14532d" : "#f0fdf4",
                }),

                multiValueLabel: (base) => ({
                    ...base,
                    color: dark ? "#dcfce7" : "#166534",
                }),

                multiValueRemove: (base) => ({
                    ...base,
                    borderRadius: "9999px",
                    color: dark ? "#bbf7d0" : "#15803d",
                    ":hover": {
                        backgroundColor: dark ? "#166534" : "#dcfce7",
                        color: dark ? "#ffffff" : "#14532d",
                    },
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
