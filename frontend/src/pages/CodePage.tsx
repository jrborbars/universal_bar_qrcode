import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, CompanyPublic } from "../api";

export default function CodePage() {
  const { code } = useParams();
  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setError(null);
    setCompany(null);
    apiFetch<CompanyPublic>(`/api/public/company/${encodeURIComponent(code)}`)
      .then(setCompany)
      .catch((e: any) => setError(e?.message ?? "code_not_found"));
  }, [code]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="card-header">
          <h2 className="card-title">Code</h2>
          <div className="helper">Public page</div>
        </div>
        <div className="card-body stack">
          <div className="code">{code}</div>
          {code ? (
            <div style={{ display: "grid", placeItems: "center" }}>
              <img
                alt="QR code"
                src={`/api/public/company/${encodeURIComponent(code)}/qr.png`}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              />
            </div>
          ) : null}
          {error ? <div className="error">{error}</div> : null}
          {company ? (
            <div className="stack">
              <div>
                <strong>{company.name}</strong>
              </div>
              <div className="meta">{company.address}</div>
              <div className="meta">
                {company.country} / {company.tax_id}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
