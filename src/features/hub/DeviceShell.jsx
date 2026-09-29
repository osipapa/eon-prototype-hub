/* ---- Device shell for the mobile viewport. Drawn around the iframe with
   negative offsets so the frame box, the pin coordinates, and the scaling all
   stay exactly as they were: this is decoration, not layout.

   The media library's `iPhone` mockup takes over when it is there. It is a
   cut-out: the screen is transparent, so it lays over the iframe and its bezel
   masks the corners. PHONE_SCREEN_INSET is measured from that file, where the
   hole is 1206x2622 in a 1350x2760 image, exactly 3x an iPhone 17 Pro screen,
   which is why VIEWPORTS.mobile matches that device. Without the asset, the
   built-in bezel draws the same phone in CSS and stays sharp at any zoom. ---- */
const PHONE_SCREEN_INSET = { top: 0.025, right: 0.05333, bottom: 0.025, left: 0.05333 };

export default function DeviceShell({ frame, scale }) {
  const px = (value) => `${value * scale}px`;
  if (frame) {
    // Grow the image so its screen area lands exactly on the iframe.
    const width = 1 / (1 - PHONE_SCREEN_INSET.left - PHONE_SCREEN_INSET.right);
    const height = 1 / (1 - PHONE_SCREEN_INSET.top - PHONE_SCREEN_INSET.bottom);
    return (
      <img
        className="eon-device-png"
        src={frame}
        alt=""
        aria-hidden="true"
        style={{
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          left: `${-PHONE_SCREEN_INSET.left * width * 100}%`,
          top: `${-PHONE_SCREEN_INSET.top * height * 100}%`,
        }}
      />
    );
  }
  return (
    <span
      className="eon-device-shell"
      aria-hidden="true"
      style={{
        inset: `-${px(15)}`,
        borderRadius: px(66),
        borderWidth: px(3),
        boxShadow: `inset 0 0 0 ${px(12)} #050505, 0 ${px(22)} ${px(60)} rgba(0,0,0,.42)`,
      }}
    >
      <span className="eon-device-island" style={{ top: px(24), width: px(122), height: px(35), borderRadius: px(20) }} />
      <span className="eon-device-key is-action" style={{ left: px(-4), top: px(120), width: px(4), height: px(34), borderRadius: px(3) }} />
      <span className="eon-device-key is-up" style={{ left: px(-4), top: px(178), width: px(4), height: px(62), borderRadius: px(3) }} />
      <span className="eon-device-key is-down" style={{ left: px(-4), top: px(254), width: px(4), height: px(62), borderRadius: px(3) }} />
      <span className="eon-device-key is-power" style={{ right: px(-4), top: px(196), width: px(4), height: px(96), borderRadius: px(3) }} />
    </span>
  );
}
