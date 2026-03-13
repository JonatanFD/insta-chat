import { useEffect, useRef } from "react";

// Extend the Window interface to include kofiwidget2
declare global {
    interface Window {
        kofiwidget2?: {
            init: (text: string, color: string, id: string) => void;
            getHTML: () => string;
            draw: () => void;
        };
    }
}

export function KofiWidget() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load the script if not already loaded
        if (!document.querySelector('script[src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"]')) {
            const script = document.createElement("script");
            script.src = "https://storage.ko-fi.com/cdn/widget/Widget_2.js";
            script.async = true;
            script.onload = () => {
                renderKofi();
            };
            document.body.appendChild(script);
        } else {
            renderKofi();
        }

        function renderKofi() {
            if (window.kofiwidget2 && containerRef.current) {
                window.kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'U7U51VV3PC');
                // Use getHTML to safely inject the button instead of document.writeln which breaks React
                containerRef.current.innerHTML = window.kofiwidget2.getHTML();
            }
        }
    }, []);

    return <div ref={containerRef} className="flex justify-center" />;
}
