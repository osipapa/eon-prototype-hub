// Full-screen loading state, shared by the app splash (auth/chunk loads) and
// the hub's first data fetch. A light sweeps across the title; as it passes,
// it lights the Eon mark in the dark behind it. The status line is for screen
// readers only.
export default function LoadingScreen({ children = "Loading…" }) {
  return (
    <div className="eon-loading-screen" role="status" aria-live="polite">
      <svg className="eon-loading-glyph" viewBox="180 180 520 520" aria-hidden="true">
        <defs>
          <linearGradient id="eon-loading-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#8B8B90" />
          </linearGradient>
        </defs>
        <g fill="url(#eon-loading-chrome)">
          <path
            transform="translate(439.43 440.44) scale(.72) translate(-439.43 -440.44)"
            d="M767.23 333.07L663.354 393.233C666.512 408.419 668.187 424.251 668.187 440.406C668.187 521.442 626.044 592.913 562.508 633.689C526.938 656.565 484.73 669.812 439.43 669.812C313.323 669.812 210.672 566.87 210.672 440.406C210.672 378.499 235.288 322.214 275.24 280.921C316.803 237.818 375.055 211 439.43 211C447.742 211 455.99 211.453 464.11 212.357L525.004 106.701L525.327 105.603C497.876 98.4299 469.007 94.6818 439.43 94.6818C332.075 94.6818 236.061 144.182 172.782 221.598C123.937 281.244 94.6821 357.497 94.6821 440.471C94.6821 631.104 249.335 786.195 439.43 786.195C505.802 786.195 567.856 767.261 620.503 734.498C718.707 673.496 784.113 564.479 784.113 440.471C784.113 402.991 778.12 366.932 767.101 333.135L767.23 333.07Z"
          />
          <circle cx="595.645" cy="268.357" r="60.486" />
        </g>
      </svg>
      <strong>Eon Design Hub</strong>
      <span className="sr-only">{children}</span>
    </div>
  );
}
