/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                dailyveg: {
                    50: "#f3fbf1",
                    100: "#eef9ec",
                    200: "#d8f0d2",
                    300: "#b8e4ad",
                    400: "#7bc96f",
                    500: "#4cae39",
                    600: "#3f9630",
                    700: "#317626",
                    800: "#245c1d",
                    900: "#183d14",
                    950: "#102a0d",
                },
            },
            borderRadius: {
                lg: "0.75rem",
                xl: "1rem",
                "2xl": "1.25rem",
            },
            boxShadow: {
                brand: "0 0px 40px rgba(76, 174, 57, 0.14)",
                "brand-dark": "0 0px 40px rgba(76, 174, 57, 0.08)",
            },
        },
    },
    plugins: [],
};