// The centrepiece: a brass coin held behind a glass pane. The `state` attribute drives the CSS states used
// by the app pages; the landing story drives the same parts directly with a scroll-scrubbed timeline.
export type VaultState = "idle" | "held" | "reading" | "released" | "spam" | "charged";

type Letter = { from: string; subject: string };

export default function Vault({
  state = "idle",
  price = "$3",
  charity = "GiveDirectly",
  letters = [],
  readout = [],
  size = "lg",
  story = false,
}: {
  state?: VaultState;
  price?: string;
  charity?: string;
  letters?: Letter[];
  readout?: [string, string][];
  size?: "lg" | "sm";
  story?: boolean; // the landing timeline owns every transform, so CSS transitions step aside
}) {
  return (
    <div className={`vault ${size === "sm" ? "vault-sm" : ""}`} data-state={state} data-story={story || undefined} aria-hidden="true">
      <div className="vault-glow glow-blue" data-part="glow-blue" />
      <div className="vault-glow glow-go" data-part="glow-go" />
      <div className="vault-glow glow-red" data-part="glow-red" />
      <div className="coin-wrap" data-part="coin">
        <div className="coin" data-part="coin-face">
          <span className="num">{price}</span>
        </div>
      </div>
      <div className="pane glass" data-part="pane">
        <div className="pane-edge" />
      </div>
      <svg className="postmark" viewBox="0 0 160 70" fill="none" strokeWidth="2.2" stroke="currentColor" data-part="postmark">
        <circle cx="34" cy="35" r="26" pathLength={1} />
        {[18, 30, 42, 54].map((y) => (
          <path key={y} d={`M66 ${y} q 11 -7 22 0 t 22 0 t 22 0 t 22 0`} pathLength={1} />
        ))}
      </svg>
      {letters.map((l, i) => (
        <div key={i} className="letter glass" data-part="letter" data-letter={i}>
          <span className="scan" data-part="scan" />
          <p className="label letter-from">From {l.from}</p>
          <p className="letter-subject">{l.subject}</p>
          <div className="letter-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
      <div className="slot" data-part="slot">
        <span className="label" data-part="slot-label">to {charity}</span>
      </div>
      {readout.length > 0 && (
        <dl className="readout num" data-part="readout">
          {readout.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>{k}</dt>
              <dd data-k={k}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
