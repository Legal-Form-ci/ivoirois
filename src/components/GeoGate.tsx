import { useEffect, useState } from "react";
import appLogo from "@/assets/app-logo.png";

const ALLOWED = new Set(["CI","SN","ML","BF","GN","GW","NE","TG","BJ","LR","SL","MR","GH","NG","GM","CV"]);
const STORAGE_KEY = "envle-geo-check-v1";
const TTL_MS = 1000 * 60 * 60; // 1h

type Verdict = "loading" | "ok" | "country" | "vpn";

interface Cached { verdict: Verdict; ts: number; country?: string; }

async function checkAccess(): Promise<{ verdict: Verdict; country?: string }> {
  // 1) Country via ipapi.co (free, no key)
  let country: string | undefined;
  let vpn = false;
  try {
    const r = await fetch("https://ipapi.co/json/");
    if (r.ok) {
      const d = await r.json();
      country = (d.country_code || d.country || "").toString().toUpperCase();
    }
  } catch {}

  // 2) VPN / proxy / hosting via ipwho.is (free, includes connection.type + security fields)
  try {
    const r2 = await fetch("https://ipwho.is/");
    if (r2.ok) {
      const d2 = await r2.json();
      if (!country && d2.country_code) country = String(d2.country_code).toUpperCase();
      const conn = (d2.connection?.type || "").toString().toLowerCase();
      const org = (d2.connection?.org || d2.connection?.isp || "").toString().toLowerCase();
      if (conn === "hosting" || conn === "vpn" || conn === "proxy" || conn === "tor") vpn = true;
      if (/vpn|proxy|tor|hosting|datacenter|cloud|aws|azure|ovh|digitalocean|linode|hetzner|google cloud/.test(org)) vpn = true;
    }
  } catch {}

  if (vpn) return { verdict: "vpn", country };
  if (!country) return { verdict: "ok" }; // fail-open if geolocation unavailable
  if (!ALLOWED.has(country)) return { verdict: "country", country };
  return { verdict: "ok", country };
}

function logGeoEvent(verdict: Verdict, country?: string) {
  // Non-sensitive analytics: only the verdict + country code (no IP, no org).
  try {
    console.info("[geo-gate]", { verdict, country: country || null, ts: new Date().toISOString() });
  } catch { /* noop */ }
}

const GeoGate = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<Verdict>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const c: Cached = JSON.parse(raw);
        if (Date.now() - c.ts < TTL_MS) return c.verdict;
      }
    } catch {}
    return "loading";
  });

  useEffect(() => {
    if (state !== "loading") return;
    let cancelled = false;
    checkAccess().then((res) => {
      if (cancelled) return;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ verdict: res.verdict, ts: Date.now(), country: res.country }));
      } catch {}
      logGeoEvent(res.verdict, res.country);
      setState(res.verdict);
    });
    return () => { cancelled = true; };
  }, [state]);

  if (state === "ok") return <>{children}</>;

  const isVpn = state === "vpn";
  const isCountry = state === "country";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="flex flex-col items-center gap-6 max-w-lg text-center">
        <img src={appLogo} alt="E'nvlé Space" className="h-28 w-28 object-contain drop-shadow-2xl" />
        {state === "loading" ? (
          <>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Vérification de l'accès…</p>
          </>
        ) : isCountry ? (
          <>
            <h1 className="text-2xl md:text-3xl font-bold">E'nvlé Space n'est pas disponible dans votre pays.</h1>
            <p className="text-muted-foreground">Cette plateforme est réservée aux utilisateurs africains.</p>
          </>
        ) : isVpn ? (
          <>
            <h1 className="text-2xl md:text-3xl font-bold">Connexion via VPN ou proxy détectée.</h1>
            <p className="text-muted-foreground">E'nvlé Space est accessible uniquement depuis l'Afrique sans anonymiseur. Désactivez votre VPN et réessayez.</p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default GeoGate;
