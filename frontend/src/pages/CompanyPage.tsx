import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  apiFetch,
  CompanyPublic,
  GeocodeCandidate,
  GeocodeSearchResponse,
  ProductPublic,
  ProductStatus,
  publicPathFromUrl,
} from "../api";
import { getToken } from "../auth";

type ProductsResponse = { items: ProductPublic[] };

export default function CompanyPage() {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const token = useMemo(() => getToken(), []);
  const parsedCompanyId = Number(companyId);

  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [productQrUrlById, setProductQrUrlById] = useState<Record<number, string>>({});

  const [editingAddress, setEditingAddress] = useState("");
  const [editCandidates, setEditCandidates] = useState<GeocodeCandidate[]>([]);
  const [editSelectedOsmRef, setEditSelectedOsmRef] = useState<string | null>(null);
  const [editSearchingAddress, setEditSearchingAddress] = useState(false);
  const [editAddressModalOpen, setEditAddressModalOpen] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productSku, setProductSku] = useState("");
  const [productShortDescription, setProductShortDescription] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productStatus, setProductStatus] = useState<ProductStatus>("Draft");
  const [productWeight, setProductWeight] = useState("");
  const [productLength, setProductLength] = useState("");
  const [productWidth, setProductWidth] = useState("");
  const [productHeight, setProductHeight] = useState("");
  const [productVolume, setProductVolume] = useState("");
  const [productCustomerField, setProductCustomerField] = useState("");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
      Object.values(productQrUrlById).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [qrUrl, productQrUrlById]);

  function numberOrNull(v: string): number | null {
    const s = (v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function resetProductForm() {
    setProductModalOpen(false);
    setEditingProductId(null);
    setProductSku("");
    setProductShortDescription("");
    setProductDescription("");
    setProductCategory("");
    setProductStatus("Draft");
    setProductWeight("");
    setProductLength("");
    setProductWidth("");
    setProductHeight("");
    setProductVolume("");
    setProductCustomerField("");
  }

  function openCreateProductModal() {
    resetProductForm();
    setProductModalOpen(true);
  }

  function openEditProductModal(product: ProductPublic) {
    setProductModalOpen(true);
    setEditingProductId(product.id);
    setProductSku(product.sku);
    setProductShortDescription(product.short_description);
    setProductDescription(product.description);
    setProductCategory(product.category);
    setProductStatus(product.status);
    setProductWeight(product.weight == null ? "" : String(product.weight));
    setProductLength(product.length == null ? "" : String(product.length));
    setProductWidth(product.width == null ? "" : String(product.width));
    setProductHeight(product.height == null ? "" : String(product.height));
    setProductVolume(product.volume == null ? "" : String(product.volume));
    setProductCustomerField(product.customer_field);
  }

  async function loadCompany() {
    if (!token || !Number.isFinite(parsedCompanyId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CompanyPublic>(`/api/companies/${parsedCompanyId}`, { token });
      setCompany(data);
      setEditingAddress(data.address);
    } catch (err: any) {
      setError(err?.message ?? "failed_to_load_company");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    if (!token || !Number.isFinite(parsedCompanyId)) return;
    setError(null);
    try {
      const data = await apiFetch<ProductsResponse>(`/api/companies/${parsedCompanyId}/products`, { token });
      setProducts(data.items);
    } catch (err: any) {
      setError(err?.message ?? "failed_to_load_products");
    }
  }

  useEffect(() => {
    void loadCompany();
    void loadProducts();
  }, [token, parsedCompanyId]);

  async function loadCompanyQrPng(): Promise<string | null> {
    if (!token || !company) return null;
    setError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}/qr.png`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setQrUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      return url;
    } catch (err: any) {
      setError(err?.message ?? "failed_to_download_qr");
      return null;
    }
  }

  async function downloadCompanyQrPng() {
    const url = await loadCompanyQrPng();
    if (!url || !company) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode_company_${company.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function loadProductQrPng(product: ProductPublic): Promise<string | null> {
    if (!token || !company) return null;
    setError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}/products/${product.id}/qr.png`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setProductQrUrlById((prev) => {
        const existing = prev[product.id];
        if (existing) URL.revokeObjectURL(existing);
        return { ...prev, [product.id]: url };
      });
      return url;
    } catch (err: any) {
      setError(err?.message ?? "failed_to_download_qr");
      return null;
    }
  }

  async function downloadProductQrPng(product: ProductPublic) {
    const url = await loadProductQrPng(product);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode_product_${product.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function searchEditAddress() {
    if (!token || !company) return;
    setError(null);
    setEditSearchingAddress(true);
    setEditSelectedOsmRef(null);
    try {
      const data = await apiFetch<GeocodeSearchResponse>("/api/companies/geocode/search", {
        method: "POST",
        token,
        body: JSON.stringify({ address: editingAddress, country: company.country }),
      });
      setEditCandidates(data.items);
      setEditAddressModalOpen(true);
      if (data.items.length === 1) setEditSelectedOsmRef(data.items[0].osm_ref);
    } catch (err: any) {
      setError(err?.message ?? "address_search_failed");
    } finally {
      setEditSearchingAddress(false);
    }
  }

  async function saveAddress() {
    if (!token || !company) return;
    setError(null);
    if (!editSelectedOsmRef) {
      setError("confirm_address_first");
      return;
    }
    try {
      const updated = await apiFetch<CompanyPublic>(`/api/companies/${company.id}/address`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          address: editingAddress,
          geocode_osm_ref: editSelectedOsmRef,
        }),
      });
      setCompany(updated);
      setEditingAddress(updated.address);
      setEditCandidates([]);
      setEditSelectedOsmRef(null);
    } catch (err: any) {
      setError(err?.message ?? "failed_to_update_address");
    }
  }

  async function submitProduct() {
    if (!token || !company) return;
    setError(null);
    try {
      await apiFetch<ProductPublic>(
        editingProductId
          ? `/api/companies/${company.id}/products/${editingProductId}`
          : `/api/companies/${company.id}/products`,
        {
          method: editingProductId ? "PATCH" : "POST",
          token,
          body: JSON.stringify({
            sku: productSku,
            short_description: productShortDescription,
            description: productDescription,
            category: productCategory,
            status: productStatus,
            weight: numberOrNull(productWeight),
            length: numberOrNull(productLength),
            width: numberOrNull(productWidth),
            height: numberOrNull(productHeight),
            volume: numberOrNull(productVolume),
            customer_field: productCustomerField,
          }),
        },
      );
      resetProductForm();
      await loadProducts();
    } catch (err: any) {
      setError(err?.message ?? (editingProductId ? "failed_to_update_product" : "failed_to_create_product"));
    }
  }

  if (!token) return null;

  return (
    <div className="container">
      {editAddressModalOpen ? (
        <div
          className="modal-overlay"
          style={{ zIndex: 70 }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditAddressModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 800 }}>Confirm address</div>
                <div className="meta">{editingAddress}</div>
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setEditAddressModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
              {editCandidates.length ? (
                <div className="select-list">
                  {editCandidates.map((c) => (
                    <label
                      key={c.osm_ref}
                      className={`pill ${editSelectedOsmRef === c.osm_ref ? "pill-active" : ""}`}
                      style={{ cursor: "pointer", justifyContent: "flex-start" }}
                    >
                      <input
                        type="radio"
                        name="edit-place"
                        checked={editSelectedOsmRef === c.osm_ref}
                        onChange={() => setEditSelectedOsmRef(c.osm_ref)}
                        style={{ marginRight: 10 }}
                      />
                      <span style={{ display: "grid", gap: 2 }}>
                        <span>{c.display_name}</span>
                        <span className="meta">
                          {c.category && c.type ? `${c.category}/${c.type} · ` : ""}
                          {c.osm_ref}
                        </span>
                      </span>
                    </label>
                  ))}
                  <div className="actions" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!editSelectedOsmRef}
                      onClick={() => setEditAddressModalOpen(false)}
                    >
                      Use this address
                    </button>
                  </div>
                </div>
              ) : (
                <div className="helper">No results. Try a more complete address.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {productModalOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetProductForm();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 800 }}>{editingProductId ? "Edit product" : "Create product"}</div>
                <div className="meta">{company?.name ?? "Company"}</div>
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => resetProductForm()}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await submitProduct();
                }}
              >
                <div className="field">
                  <label>SKU</label>
                  <input className="input" value={productSku} onChange={(e: any) => setProductSku(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Short Description</label>
                  <input
                    className="input"
                    value={productShortDescription}
                    onChange={(e: any) => setProductShortDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    className="input"
                    value={productDescription}
                    onChange={(e: any) => setProductDescription(e.target.value)}
                    style={{ minHeight: 90, resize: "vertical" }}
                    required
                  />
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Category</label>
                    <input
                      className="input"
                      value={productCategory}
                      onChange={(e: any) => setProductCategory(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select
                      className="input"
                      value={productStatus}
                      onChange={(e: any) => setProductStatus(e.target.value as ProductStatus)}
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Discontinued">Discontinued</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Weight</label>
                    <input className="input" value={productWeight} onChange={(e: any) => setProductWeight(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Volume</label>
                    <input className="input" value={productVolume} onChange={(e: any) => setProductVolume(e.target.value)} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Length</label>
                    <input className="input" value={productLength} onChange={(e: any) => setProductLength(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Width</label>
                    <input className="input" value={productWidth} onChange={(e: any) => setProductWidth(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Height</label>
                  <input className="input" value={productHeight} onChange={(e: any) => setProductHeight(e.target.value)} />
                </div>
                <div className="field">
                  <label>Customer field (public)</label>
                  <textarea
                    className="input"
                    value={productCustomerField}
                    onChange={(e: any) => setProductCustomerField(e.target.value)}
                    style={{ minHeight: 70, resize: "vertical" }}
                  />
                </div>
                <div className="actions" style={{ justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary">
                    {editingProductId ? "Save" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="stack">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <Link to="/dashboard" className="pill">
            Back to dashboard
          </Link>
          <button type="button" className="btn" onClick={() => { void loadCompany(); void loadProducts(); }} disabled={loading}>
            {loading ? "..." : "Refresh"}
          </button>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{company?.name ?? "Company"}</h2>
            {company ? (
              <div className="actions">
                <a className="pill" href={publicPathFromUrl(company.public_url)} target="_blank" rel="noreferrer">
                  Open public page
                </a>
              </div>
            ) : null}
          </div>
          <div className="card-body stack">
            {company ? (
              <>
                <div className="meta">{company.country} / {company.tax_id}</div>
                <div className="code">{company.code}</div>
                <div className="field">
                  <label>Address</label>
                  <input
                    className="input"
                    value={editingAddress}
                    onChange={(e: any) => {
                      setEditingAddress(e.target.value);
                      setEditCandidates([]);
                      setEditSelectedOsmRef(null);
                    }}
                  />
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void searchEditAddress()}
                    disabled={editSearchingAddress || !editingAddress.trim()}
                  >
                    {editSearchingAddress ? "..." : "Confirm address"}
                  </button>
                  {editSelectedOsmRef ? <div className="pill pill-active">Confirmed</div> : null}
                  <button type="button" className="btn btn-primary" onClick={() => void saveAddress()}>
                    Save address
                  </button>
                </div>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => void loadCompanyQrPng()}>
                    Show QR
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => void downloadCompanyQrPng()}>
                    Download PNG
                  </button>
                </div>
                {qrUrl ? (
                  <div>
                    <img
                      src={qrUrl}
                      alt="QR code"
                      style={{ width: 180, height: 180, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)" }}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="helper">Loading company...</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3 className="card-title">Products</h3>
            <div className="actions">
              <button type="button" className="btn" onClick={() => void loadProducts()}>
                Refresh
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openCreateProductModal()}>
                Create product
              </button>
            </div>
          </div>
          <div className="card-body">
            {products.length ? (
              <div className="select-list">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="pill"
                    style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}
                  >
                    <span style={{ display: "grid", gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>{p.short_description}</span>
                      <span className="meta">
                        {p.category} · {p.status} · SKU {p.sku}
                      </span>
                      <span className="code">{p.code}</span>
                      {productQrUrlById[p.id] ? (
                        <img
                          src={productQrUrlById[p.id]}
                          alt="QR code"
                          style={{
                            width: 140,
                            height: 140,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.14)",
                            marginTop: 8,
                          }}
                        />
                      ) : null}
                    </span>
                    <span className="actions">
                      <button type="button" className="btn" onClick={() => openEditProductModal(p)}>
                        Edit
                      </button>
                      <a className="pill" href={publicPathFromUrl(p.public_url)} target="_blank" rel="noreferrer">
                        Open
                      </a>
                      <button type="button" className="btn" onClick={() => void loadProductQrPng(p)}>
                        Show QR
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => void downloadProductQrPng(p)}>
                        Download PNG
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="helper">No products yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
