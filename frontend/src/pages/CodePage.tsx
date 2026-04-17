import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, CompanyPublic, productIdFromPublicCode, ProductPublic } from "../api";

export default function CodePage({ kind = "company" }: { kind?: "company" | "product" }) {
  const { code } = useParams();
  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [product, setProduct] = useState<ProductPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setError(null);
    setCompany(null);
    setProduct(null);
    if (kind === "company") {
      apiFetch<CompanyPublic>(`/api/public/company/${encodeURIComponent(code)}`)
        .then(setCompany)
        .catch((e: any) => setError(e?.message ?? "code_not_found"));
    } else {
      apiFetch<ProductPublic>(`/api/public/product/${encodeURIComponent(code)}`)
        .then(setProduct)
        .catch((e: any) => setError(e?.message ?? "code_not_found"));
    }
  }, [code, kind]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="card-header">
          <h2 className="card-title">{kind === "company" ? "Company" : "Product"}</h2>
          <div className="helper">Public page</div>
        </div>
        <div className="card-body stack">
          <div className="code">
            {kind === "company"
              ? company?.code ?? code ?? ""
              : product?.code ?? productIdFromPublicCode(code ?? "")}
          </div>
          {code ? (
            <div style={{ display: "grid", placeItems: "center" }}>
              <img
                alt="QR code"
                src={`/api/public/${kind}/${encodeURIComponent(code)}/qr.png`}
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
          {product ? (
            <div className="stack">
              <div>
                <strong>{product.short_description}</strong>
              </div>
              <div className="meta">
                {product.company_name} · {product.category} · {product.status}
              </div>
              <div className="meta">SKU: {product.sku}</div>
              {product.customer_field ? <div>{product.customer_field}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
