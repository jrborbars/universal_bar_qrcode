import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, CompanyPublic, GeocodeCandidate, GeocodeSearchResponse, publicPathFromUrl } from "../api";
import { getToken } from "../auth";

type CompaniesResponse = { items: CompanyPublic[] };

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = useMemo(() => getToken(), []);
  const [companies, setCompanies] = useState<CompanyPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("BR");
  const [taxId, setTaxId] = useState("");
  const [geocodeCandidates, setGeocodeCandidates] = useState<GeocodeCandidate[]>([]);
  const [selectedOsmRef, setSelectedOsmRef] = useState<string | null>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

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

  function resetCreateCompanyForm() {
    setCreateModalOpen(false);
    setName("");
    setAddress("");
    setCountry("BR");
    setTaxId("");
    setGeocodeCandidates([]);
    setSelectedOsmRef(null);
  }

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
      resetCreateCompanyForm();
      await loadCompanies();
    } catch (err: any) {
      setError(err?.message ?? "failed_to_create_company");
    }
  }

  if (!token) return null;

  return (
    <div className="container">
      {addressModalOpen ? (
        <div
          className="modal-overlay"
          style={{ zIndex: 70 }}
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

      {createModalOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetCreateCompanyForm();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 800 }}>Create company</div>
                <div className="meta">CNPJ required when country is BR</div>
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => resetCreateCompanyForm()}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
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
                    <input className="input" value={taxId} onChange={(e: any) => setTaxId(e.target.value)} required />
                  </div>
                </div>
                {selectedOsmRef ? (
                  <div className="helper">Address confirmed.</div>
                ) : (
                  <div className="helper">Use “Confirm address” to pick the correct location before creating.</div>
                )}
                <div className="actions" style={{ justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={!selectedOsmRef}>
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Companies</h2>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void loadCompanies()} disabled={loading}>
              {loading ? "..." : "Refresh"}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
              Create company
            </button>
          </div>
        </div>
        <div className="card-body">
          {error ? <div className="error">{error}</div> : null}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Country</th>
                  <th>Tax ID</th>
                  <th>Company ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.length ? (
                  companies.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.address}</td>
                      <td>{c.country}</td>
                      <td>{c.tax_id}</td>
                      <td>
                        <span className="code">{c.code}</span>
                      </td>
                      <td>
                        <div className="actions">
                          <Link className="btn" to={`/dashboard/company/${c.id}`}>
                            Manage
                          </Link>
                          <a className="pill" href={publicPathFromUrl(c.public_url)} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      No companies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
