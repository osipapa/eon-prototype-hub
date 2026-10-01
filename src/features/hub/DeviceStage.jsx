import { useLayoutEffect, useRef, useState } from "react";
import { VIEWPORTS, parsePrototypeConfig } from "./prototypes";

// Phone for prototypes declared as mobile, desktop for everything else.
export function stageDevice(html) {
  return parsePrototypeConfig(html).viewport === "mobile" ? "mobile" : "desktop";
}

/* An animation demo at a real device size (the hub's mobile or desktop
   viewport), scaled down to fit. The demo's own viewport is the device's, so
   anything it sizes from vw or innerWidth comes out the way it would on that
   screen. A phone scales to `height`; a desktop to the width it's given. */
export default function DeviceStage({ device = "desktop", srcDoc, title, height = 560, className = "" }) {
  const size = VIEWPORTS[device === "mobile" ? "mobile" : "desktop"];
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => setWidth(box.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const scale = device === "mobile"
    ? height / size.h
    : width ? Math.min(width / size.w, height / size.h) : 0;
  const radius = device === "mobile" ? 44 : 12;

  return (
    <div ref={boxRef} className={`eon-device-stage is-${device === "mobile" ? "mobile" : "desktop"}${className ? ` ${className}` : ""}`}
      style={{ height: scale ? size.h * scale : height }}>
      {scale > 0 && (
        <div className="eon-device-screen" style={{ width: size.w * scale, height: size.h * scale, borderRadius: Math.max(8, radius * scale) }}>
          <iframe title={title} sandbox="allow-scripts" srcDoc={srcDoc}
            style={{ width: size.w, height: size.h, transform: `scale(${scale})` }} />
        </div>
      )}
    </div>
  );
}
