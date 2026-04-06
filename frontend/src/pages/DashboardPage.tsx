import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, CompanyPublic, GeocodeCandidate, GeocodeSearchResponse } from "../api";
import { getToken } from "../auth";

type CompaniesResponse = { items: CompanyPublic[] };

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = useMemo(() => getToken(), []);
  const [companies, setCompanies] = useState<CompanyPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("BR");
  const [taxId, setTaxId] = useState("");
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[]>([]);
  const [selectedOsmRef, setSelectedOsmRef] = useState<string | null>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [qrUrlByCompanyId, setQrUrlByCompanyId] = useState<Record<number, string>>({});
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [editingAddress, setEditingAddress] = useState("");
  const [editCandidates, setEditCandidates] = useState<GeocodeCandidate[]>([]);
  const [editSelectedOsmRef, setEditSelectedOsmRef] = useState<string | null>(null);
  const [editSearchingAddress, setEditSearchingAddress] = useState(false);
  const [editAddressModalOpen, setEditAddressModalOpen] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  async function loadCompanies() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CompaniesResponse>("/api/companies", { token });
      setCompanies(data.items);
    } catch (err: any) {
      setError(err?.message ?? "failed_to_load_companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  async function loadQrPng(company: CompanyPublic): Promise<string | null> {
    if (!token) return null;
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
      setQrUrlByCompanyId((prev) => {
        const existing = prev[company.id];
        if (existing) URL.revokeObjectURL(existing);
        return { ...prev, [company.id]: url };
      });
      return url;
    } catch (err: any) {
      setError(err?.message ?? "failed_to_download_qr");
      return null;
    }
  }

  async function downloadQrPng(company: CompanyPublic) {
    const url = await loadQrPng(company);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode_${company.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  useEffect(() => {
    return () => {
      Object.values(qrUrlByCompanyId).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [qrUrlByCompanyId]);

  async function searchAddress() {
    if (!token) return;
    setError(null);
    setSearchingAddress(true);
    setSelectedOsmRef(null);
    try {
      const data = await apiFetch<GeocodeSearchResponse>("/api/companies/geocode/search", {
        method: "POST",
        token,
        body: JSON.stringify({ address, country }),
      });
      setGeocodeCandidates(data.items);
      setAddressModalOpen(true);
      if (data.items.length === 1) setSelectedOsmRef(data.items[0].osm_ref);
    } catch (err: any) {
      setError(err?.message ?? "address_search_failed");
    } finally {
      setSearchingAddress(false);
    }
  }

  async function searchEditAddress(editCountry: string) {
    if (!token) return;
    setError(null);
    setEditSearchingAddress(true);
    setEditSelectedOsmRef(null);
    try {
      const data = await apiFetch<GeocodeSearchResponse>("/api/companies/geocode/search", {
        method: "POST",
        token,
        body: JSON.stringify({ address: editingAddress, country: editCountry }),
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    if (!selectedOsmRef) {
      setError("confirm_address_first");
      return;
    }
    try {
      await apiFetch<CompanyPublic>("/api/companies", {
        method: "POST",
        token,
        body: JSON.stringify({
          name,
          address,
          country,
          tax_id: taxId,
          geocode_osm_ref: selectedOsmRef,
        }),
      });
      setName("");
      setTaxId("");
      setAddress("");
      setGeocodeCandidates([]);
      setSelectedOsmRef(null);
      await loadCompanies();
    } catch (err: any) {
      setError(err?.message ?? "failed_to_create_company");
    }
  }

  if (!token) return null;

  return (
    <div className="container">
      {editAddressModalOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditAddressModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 800 }}>Confirm edited address</div>
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
                        {typeof c.latitude === "number" && typeof c.longitude === "number" ? (
                          <span className="meta">
                            {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                          </span>
                        ) : null}
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
                      Use this location
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
      {addressModalOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddressModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 800 }}>Confirm address</div>
                <div className="meta">
                  {country} · {address}
                </div>
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setAddressModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
              {geocodeCandidates.length ? (
                <div className="select-list">
                  {geocodeCandidates.map((c) => (
                    <label
                      key={c.osm_ref}
                      className={`pill ${selectedOsmRef === c.osm_ref ? "pill-active" : ""}`}
                      style={{ cursor: "pointer", justifyContent: "flex-start" }}
                    >
                      <input
                        type="radio"
                        name="place"
                        checked={selectedOsmRef === c.osm_ref}
                        onChange={() => setSelectedOsmRef(c.osm_ref)}
                        style={{ marginRight: 10 }}
                      />
                      <span style={{ display: "grid", gap: 2 }}>
                        <span>{c.display_name}</span>
                        <span className="meta">
                          {c.category && c.type ? `${c.category}/${c.type} · ` : ""}
                          {c.osm_ref}
                        </span>
                        {typeof c.latitude === "number" && typeof c.longitude === "number" ? (
                          <span className="meta">
                            {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                          </span>
                        ) : null}
                        {typeof c.latitude === "number" && typeof c.longitude === "number" ? (
                          <a
                            className="meta"
                            href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(
                              String(c.latitude),
                            )}&mlon=${encodeURIComponent(String(c.longitude))}#map=18/${encodeURIComponent(
                              String(c.latitude),
                            )}/${encodeURIComponent(String(c.longitude))}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in map
                          </a>
                        ) : null}
                      </span>
                    </label>
                  ))}
                  <div className="actions" style={{ justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!selectedOsmRef}
                      onClick={() => setAddressModalOpen(false)}
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
      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Companies</h2>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => void loadCompanies()}
                disabled={loading}
              >
                {loading ? "..." : "Refresh"}
              </button>
            </div>
          </div>
          <div className="card-body">
            {error ? <div className="error">{error}</div> : null}
            <ul className="list">
              {companies.map((c) => (
                <li key={c.id} className="company-item">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{c.name}</strong>
                    <div className="actions">
                      <a
                        className="pill"
                        href={`/c/${encodeURIComponent(c.code)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void loadQrPng(c)}
                      >
                        Show QR
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void downloadQrPng(c)}
                      >
                        Download PNG
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingCompanyId(c.id);
                          setEditingAddress(c.address);
                          setEditCandidates([]);
                          setEditSelectedOsmRef(null);
                        }}
                      >
                        Edit address
                      </button>
                    </div>
                  </div>
                  {editingCompanyId === c.id ? (
                    <div className="stack" style={{ marginTop: 8 }}>
                      <div className="field">
                        <label>Company address</label>
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
                          onClick={() => void searchEditAddress(c.country)}
                          disabled={editSearchingAddress || !editingAddress.trim()}
                        >
                          {editSearchingAddress ? "..." : "Confirm location"}
                        </button>
                        {editSelectedOsmRef ? <div className="pill pill-active">Confirmed</div> : null}
                      </div>
                      <div className="actions" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditingCompanyId(null);
                            setEditingAddress("");
                            setEditCandidates([]);
                            setEditSelectedOsmRef(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={async () => {
                            if (!token) return;
                            setError(null);
                            if (!editSelectedOsmRef) {
                              setError("confirm_address_first");
                              return;
                            }
                            try {
                              await apiFetch<CompanyPublic>(`/api/companies/${c.id}/address`, {
                                method: "PATCH",
                                token,
                                body: JSON.stringify({
                                  address: editingAddress,
                                  geocode_osm_ref: editSelectedOsmRef,
                                }),
                              });
                              setEditingCompanyId(null);
                              setEditingAddress("");
                              setEditCandidates([]);
                              setEditSelectedOsmRef(null);
                              await loadCompanies();
                            } catch (err: any) {
                              setError(err?.message ?? "failed_to_update_address");
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="meta">{c.address}</div>
                  )}
                  {c.geocoded_address ? (
                    <div className="meta">Selected location: {c.geocoded_address}</div>
                  ) : null}
                  <div className="meta">
                    {c.country} / {c.tax_id}
                  </div>
                  <div className="meta">
                    {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                  </div>
                  <div className="code">{c.code}</div>
                  {qrUrlByCompanyId[c.id] ? (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={qrUrlByCompanyId[c.id]}
                        alt="QR code"
                        style={{ width: 160, height: 160, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)" }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3 className="card-title">Create company</h3>
            <div className="helper">CNPJ required when country is BR</div>
          </div>
          <div className="card-body">
            <form onSubmit={onCreate} className="stack">
              <div className="field">
                <label>Name</label>
                <input className="input" value={name} onChange={(e: any) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Address</label>
                <input
                  className="input"
                  value={address}
                  onChange={(e: any) => {
                    setAddress(e.target.value);
                    setGeocodeCandidates([]);
                    setSelectedOsmRef(null);
                  }}
                  required
                />
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => void searchAddress()}
                  disabled={searchingAddress || !address.trim()}
                >
                  {searchingAddress ? "..." : "Confirm address"}
                </button>
                {selectedOsmRef ? <div className="pill pill-active">Confirmed</div> : null}
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Country (2 letters)</label>
                  <input
                    className="input"
                    value={country}
                    onChange={(e: any) => {
                      setCountry(e.target.value.toUpperCase());
                      setGeocodeCandidates([]);
                      setSelectedOsmRef(null);
                    }}
                    maxLength={2}
                    required
                  />
                </div>
                <div className="field">
                  <label>Tax ID</label>
                  <input
                    className="input"
                    value={taxId}
                    onChange={(e: any) => setTaxId(e.target.value)}
                    required
                  />
                </div>
              </div>
              {selectedOsmRef ? (
                <div className="helper">Selected: {geocodeCandidates.find((c) => c.osm_ref === selectedOsmRef)?.display_name ?? selectedOsmRef}</div>
              ) : (
                <div className="helper">Use “Confirm address” to pick the correct location before creating.</div>
              )}
              <div className="actions">
                <button type="submit" className="btn btn-primary" disabled={!selectedOsmRef}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
