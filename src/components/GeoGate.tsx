import { useEffect, useState } from "react";
import appLogo from "@/assets/app-logo.png";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED = new Set(["CI","SN","ML","BF","GN","GW","NE","TG","BJ","LR","SL","MR","GH","NG","GM","CV"]);
const STORAGE_KEY = "envle-geo-check-v1";
const TTL_MS = 1000 * 60 * 60; // 1h

type Verdict = "loading" | "ok" | "country" | "vpn" | "fallback";
type FinalVerdict = Exclude<Verdict, "loading">;
type FalsePositiveRisk = "none" | "possible" | "likely";

interface GeoSignal {
  verdict: FinalVerdict;
  country?: string;
  proxySignal: boolean;
  vpnSignal: boolean;
  blocked: boolean;
  falsePositiveRisk: FalsePositiveRisk;
}

interface Cached extends GeoSignal { ts: number; }

const normalizeCountry = (value: unknown) => {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
};

const getUserAgentFamily = () => {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
};

async function fetchJsonWithTimeout(url: string, timeoutMs = 2800) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkGeoAccess(): Promise<GeoSignal> {
  const [ipapi, ipwho] = await Promise.all([
    fetchJsonWithTimeout("https://ipapi.co/json/"),
    fetchJsonWithTimeout("https://ipwho.is/"),
  ]);

  let country = normalizeCountry(ipapi?.country_code || ipapi?.country) || normalizeCountry(ipwho?.country_code);
  let proxySignal = false;
  let vpnSignal = false;

  if (ipwho) {
    const conn = String(ipwho.connection?.type || "").toLowerCase();
    const security = ipwho.security || {};
    proxySignal = Boolean(security.proxy || security.tor || conn === "proxy" || conn === "tor");
    vpnSignal = Boolean(security.vpn || conn === "vpn" || conn === "hosting");
  }

  const anonymousNetwork = proxySignal || vpnSignal;
  const countryAllowed = Boolean(country && ALLOWED.has(country));
  const falsePositiveRisk: FalsePositiveRisk = anonymousNetwork && countryAllowed ? "possible" : "none";

  if (anonymousNetwork) {
    return { verdict: "vpn", country, proxySignal, vpnSignal, blocked: true, falsePositiveRisk };
  }
  if (!country) {
    return { verdict: "fallback", proxySignal, vpnSignal, blocked: false, falsePositiveRisk: "possible" };
  }
  if (!countryAllowed) {
    return { verdict: "country", country, proxySignal, vpnSignal, blocked: true, falsePositiveRisk: "none" };
  }
  return { verdict: "ok", country, proxySignal, vpnSignal, blocked: false, falsePositiveRisk: "none" };
}

function logGeoEvent(signal: GeoSignal) {
  // Non-sensitive analytics only: no IP, no ISP/org, no user id, no query string.
  try {
    const payload = {
      verdict: signal.verdict,
      country_code: signal.country || null,
      proxy_signal: signal.proxySignal,
      vpn_signal: signal.vpnSignal,
      blocked: signal.blocked,
      false_positive_risk: signal.falsePositiveRisk,
      route_path: window.location.pathname.slice(0, 160),
      user_agent_family: getUserAgentFamily(),
    };
    void supabase.from("geogate_events" as any).insert(payload);
    console.info("[geo-gate]", { verdict: signal.verdict, country: signal.country || null, blocked: signal.blocked });
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
    checkGeoAccess().then((res) => {
      if (cancelled) return;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...res, ts: Date.now() } satisfies Cached));
      } catch {}
      logGeoEvent(res);
      setState(res.verdict);
    });
    return () => { cancelled = true; };
  }, [state]);

  if (state === "ok" || state === "fallback") return <>{children}</>;

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
