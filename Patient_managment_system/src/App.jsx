import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowClockwise, Bed, CheckCircle, ClipboardText, Funnel, MagnifyingGlass,
  PencilSimple, Plus, SignOut, Trash, UsersThree, WarningCircle,
} from "@phosphor-icons/react";
import { api } from "./api";
import PatientForm from "./PatientForm";
import "./App.css";

const TOTAL_BEDS = 50; // set this to your hospital's real bed capacity
const SERVER_MSG = "Cannot reach the server. It may be waking up, which can take up to a minute. Try again in a moment.";
const EMPTY = { search: "", ward: "", department: "", doctor: "" };

const fmt = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function Stat({ icon: Icon, label, value, note }) {
  return (
    <div className="panel stat reveal">
      <div className="stat-top"><span className="caption-1">{label}</span><Icon size={20} /></div>
      {value === null ? <div className="skeleton sk-stat" /> : <p className="heading-3">{value}</p>}
      <p className="caption-2 muted">{note}</p>
    </div>
  );
}

function Badge({ status }) {
  return <span className={`badge caption-4 ${status.toLowerCase()}`}><i className="dot" />{status}</span>;
}

function Actions({ p, iconOnly, onEdit, onDischarge, onDelete }) {
  const cls = iconOnly ? "btn sm icon" : "btn sm";
  const content = (text, Icon) => (iconOnly ? <Icon size={16} /> : <><Icon size={16} />{text}</>);
  return (
    <div className="actions">
      <button className={cls} title="Edit" aria-label={`Edit ${p.name}`} onClick={() => onEdit(p)}>
        {content("Edit", PencilSimple)}
      </button>
      {p.status === "Admitted" && (
        <button className={cls} title="Discharge" aria-label={`Discharge ${p.name}`} onClick={() => onDischarge(p)}>
          {content("Discharge", SignOut)}
        </button>
      )}
      <button className={`${cls} danger`} title="Delete" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}>
        {content("Delete", Trash)}
      </button>
    </div>
  );
}

function Empty({ icon: Icon, title, text, action, onAction }) {
  return (
    <div className="empty">
      <Icon size={40} />
      <h3 className="title-2">{title}</h3>
      <p className="body-6 muted">{text}</p>
      <button className="btn" onClick={onAction}>{action}</button>
    </div>
  );
}

function ConfirmDialog({ patient, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="overlay" onMouseDown={onCancel}>
      <div className="dialog panel" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"
           aria-describedby="dlg-d" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="dlg-t" className="heading-6">Delete {patient.name}?</h2>
        <p id="dlg-d" className="body-6 muted">This removes the patient record permanently. You cannot undo this.</p>
        <div className="row end">
          <button className="btn" onClick={onCancel} autoFocus>Cancel</button>
          <button className="btn solid-danger" onClick={onConfirm}>Delete patient</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [options, setOptions] = useState(null);
  const [all, setAll] = useState(null);           // every patient, used for the summary cards
  const [patients, setPatients] = useState(null); // filtered list, null while loading
  const [filters, setFilters] = useState(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null);   // null closed, {} add, patient edit
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const timer = useRef();

  const loadList = useCallback(
    () => api.list(filters).then((d) => { setPatients(d); setError(""); }).catch(() => setError(SERVER_MSG)),
    [filters]
  );
  const loadAll = () => api.list({}).then(setAll).catch(() => {});
  const refresh = () => { loadList(); loadAll(); };
  const loadOptions = () => api.options().then(setOptions).catch(() => setError(SERVER_MSG));
  const retry = () => { setError(""); loadOptions(); refresh(); };

  useEffect(() => { loadOptions(); loadAll(); }, []);
  useEffect(() => {
    const t = setTimeout(loadList, 300); // debounce typing in search
    return () => clearTimeout(t);
  }, [loadList]);

  const notify = (msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4000);
  };

  const save = async (data) => {
    const isEdit = Boolean(editing.id);
    if (isEdit) await api.update(editing.id, data);
    else await api.create(data);
    setEditing(null);
    notify(isEdit ? `${data.name} updated.` : `${data.name} registered.`);
    refresh();
  };
  const discharge = async (p) => {
    try { await api.discharge(p.id); notify(`${p.name} discharged.`); refresh(); }
    catch { setError("Could not discharge the patient. Try again."); }
  };
  const confirmDelete = async () => {
    const p = toDelete;
    setToDelete(null);
    try { await api.remove(p.id); notify(`${p.name} deleted.`); refresh(); }
    catch { setError("Could not delete the patient. Try again."); }
  };

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const activeCount = ["ward", "department", "doctor"].filter((k) => filters[k]).length;
  const hasFilters = activeCount > 0 || filters.search !== "";
  const clear = () => setFilters(EMPTY);

  const admitted = all ? all.filter((p) => p.status === "Admitted").length : null;
  const discharged = all ? all.length - admitted : null;
  const beds = all ? Math.max(TOTAL_BEDS - admitted, 0) : null;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const h = { onEdit: setEditing, onDischarge: discharge, onDelete: setToDelete };

  return (
    <>
      <a className="skip button-sm" href="#main">Skip to main content</a>
      <main id="main" className="container">
        <header className="head">
          <div>
            <h1 className="heading-4 grad">Patient admission management system</h1>
            <p className="body-6 muted">{today}</p>
          </div>
          <button className="btn primary" disabled={!options} onClick={() => setEditing({})}>
            <Plus size={20} weight="bold" />Register patient
          </button>
        </header>

        {error && (
          <div className="alert" role="alert">
            <WarningCircle size={20} />
            <span className="body-6">{error}</span>
            <button className="btn sm" onClick={retry}><ArrowClockwise size={16} />Retry</button>
          </div>
        )}

        <section className="stats" aria-label="Summary">
          <Stat icon={UsersThree} label="Total admitted" value={admitted} note="Patients currently in a bed" />
          <Stat icon={CheckCircle} label="Discharged" value={discharged} note="Patients sent home" />
          <Stat icon={Bed} label="Beds available" value={beds} note={`Out of ${TOTAL_BEDS} beds`} />
        </section>

        <section className="panel records reveal" aria-labelledby="rec-title">
          <div className="between">
            <h2 id="rec-title" className="heading-5">Patient records</h2>
            <span className="caption-2 muted">
              {patients ? `${patients.length} ${patients.length === 1 ? "patient" : "patients"}` : ""}
            </span>
          </div>

          <div className="toolbar">
            <label className="search">
              <MagnifyingGlass size={20} />
              <input type="search" className="body-3" aria-label="Search patients by name"
                     placeholder="Search by patient name" value={filters.search} onChange={setFilter("search")} />
            </label>
            <button className="btn" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
              <Funnel size={20} />Filter
              {activeCount > 0 && <span className="count caption-4">{activeCount}</span>}
            </button>
          </div>

          {showFilters && options && (
            <div className="filters">
              {[["ward", "Ward", options.wards], ["department", "Department", options.departments], ["doctor", "Doctor", options.doctors]]
                .map(([k, label, list]) => (
                  <select key={k} className="body-3" aria-label={`Filter by ${label.toLowerCase()}`}
                          value={filters[k]} onChange={setFilter(k)}>
                    <option value="">All {label.toLowerCase()}s</option>
                    {list.map((x) => <option key={x}>{x}</option>)}
                  </select>
                ))}
              <button className="btn" onClick={clear}>Clear filters</button>
            </div>
          )}

          {patients === null && !error && (
            <div className="skeletons" aria-label="Loading patients">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton sk-row" />)}
            </div>
          )}

          {patients && patients.length === 0 && (
            hasFilters
              ? <Empty icon={MagnifyingGlass} title="No patients match" text="Try a different name or clear the filters."
                       action="Clear filters" onAction={clear} />
              : <Empty icon={ClipboardText} title="No patients registered yet" text="Register the first patient to start the record."
                       action="Register patient" onAction={() => options && setEditing({})} />
          )}

          {patients && patients.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Gender</th><th>Age</th><th>Ward</th><th>Department</th>
                      <th>Doctor</th><th>Admitted</th><th>Status</th><th><span className="sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p, i) => (
                      <tr key={p.id}>
                        <td>{i + 1}</td>
                        <td className="title-4">{p.name}</td>
                        <td>{p.gender}</td>
                        <td>{p.age}</td>
                        <td>{p.ward}</td>
                        <td>{p.department}</td>
                        <td>{p.doctor}</td>
                        <td>{fmt(p.admission_date)}</td>
                        <td><Badge status={p.status} /></td>
                        <td><Actions p={p} iconOnly {...h} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="cards">
                {patients.map((p) => (
                  <li className="pcard" key={p.id}>
                    <div className="between">
                      <h3 className="title-2">{p.name}</h3>
                      <Badge status={p.status} />
                    </div>
                    <p className="body-6 muted">{p.age} years · {p.gender}</p>
                    <p className="body-6">{p.ward} · {p.department}</p>
                    <p className="body-6">{p.doctor}</p>
                    <p className="body-6 muted">Admitted {fmt(p.admission_date)}</p>
                    <Actions p={p} {...h} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      <div className="toast body-6" role="status" aria-live="polite" data-show={toast !== ""}>{toast}</div>

      {editing && <PatientForm options={options} initial={editing.id ? editing : null}
                    onSave={save} onCancel={() => setEditing(null)} />}
      {toDelete && <ConfirmDialog patient={toDelete} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />}
    </>
  );
}