import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 32 32"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Left Pillar */}
            <path d="M4 6C4 4.89543 4.89543 4 6 4H8C9.10457 4 10 4.89543 10 6V26C10 27.1046 9.10457 28 8 28H6C4.89543 28 4 27.1046 4 26V6Z" />
            {/* Right Pillar */}
            <path d="M22 6C22 4.89543 22.8954 4 24 4H26C27.1046 4 28 4.89543 28 6V26C28 27.1046 27.1046 28 26 28H24C22.8954 28 22 27.1046 22 26V6Z" />
            {/* Center W Chevron Strut */}
            <path d="M9 22.5L14.4 14.4C15.2 13.2 16.8 13.2 17.6 14.4L23 22.5H19.4L16 17.4L12.6 22.5H9Z" />
            {/* Center Top Activity Pulse / Accent */}
            <rect x="13.5" y="4" width="5" height="5" rx="1.5" />
        </svg>
    );
}
