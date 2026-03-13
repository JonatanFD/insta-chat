export default function InstaChatAppLogo(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 400 400"
            {...props}
        >
            <defs>
                <linearGradient
                    id="cryptoGrad"
                    x1="0%"
                    y1="100%"
                    x2="100%"
                    y2="0%"
                >
                    <stop offset="0%" stopColor="#00FF87" />
                    <stop offset="100%" stopColor="#60EFFF" />
                </linearGradient>

                <filter
                    id="neonGlow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                >
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite
                        in="SourceGraphic"
                        in2="blur"
                        operator="over"
                    />
                </filter>
            </defs>

            <rect
                id="background"
                width="400"
                height="400"
                rx="80"
                fill="#0A0E17"
            />

            <g filter="url(#neonGlow)">
                <path
                    d="M 226 277
                              A 100 100 0 1 1 271 251
                              L 290 310
                              Z"
                    stroke="url(#cryptoGrad)"
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <line
                    x1="160"
                    y1="220"
                    x2="240"
                    y2="140"
                    stroke="url(#cryptoGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                />

                <circle cx="160" cy="220" r="14" fill="url(#cryptoGrad)" />

                <circle cx="240" cy="140" r="14" fill="url(#cryptoGrad)" />
            </g>
        </svg>
    );
}
