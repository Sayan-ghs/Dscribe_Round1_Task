import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";

const today = () => new Date().toISOString().split("T")[0];

function validate(f, opt) {
  const e = {};
  if (!f.name.trim()) e.name = "Name is required";
  else if (!/^[A-Za-z ]+$/.test(f.name.trim())) e.name = "Name must contain letters only";
  if (f.age === "") e.age = "Age is required";
  else if (isNaN(f.age) || f.age < 0 || f.age > 120) e.age = "Age must be between 0 and 120";
  if (!opt.genders.includes(f.gender)) e.gender = "Select a gender";
  if (!opt.wards.includes(f.ward)) e.ward = "Select a ward";
  if (!opt.departments.includes(f.department)) e.department = "Select a department";
  if (!opt.doctors.includes(f.doctor)) e.doctor = "Select a doctor";
  if (!f.admission_date) e.admission_date = "Admission date is required";
  else if (f.admission_date > today()) e.admission_date = "Admission date cannot be in the future";
  return e;
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id} className="title-3">{label}</label>
      {children}
      {error && <p id={`${id}-e`} className="caption-2 err">{error}</p>}
    </div>
  );
}

export default function PatientForm({ options, initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || {
    name: "", age: "", gender: "", ward: "", department: "", doctor: "",
    admission_date: today(), status: "Admitted",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const aria = (k) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-e` : undefined });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f, options);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSave({ ...f, age: Number(f.age) });
    } catch (err) {
      setErrors(err.errors || { form: err.detail || "Could not save the patient. Try again." });
      setBusy(false);
    }
  };

  const select = (k, label, list) => (
    <Field id={k} label={label} error={errors[k]}>
      <select id={k} className="body-3" value={f[k]} onChange={set(k)} {...aria(k)}>
        <option value="">Select {label.toLowerCase()}</option>
        {list.map((x) => <option key={x}>{x}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="overlay">
      <form className="dialog panel form" onSubmit={submit} noValidate role="dialog" aria-modal="true"
            aria-labelledby="form-title">
        <div className="between">
          <h2 id="form-title" className="heading-6">{initial ? "Edit patient" : "Register patient"}</h2>
          <button type="button" className="btn icon" aria-label="Close" onClick={onCancel}><X size={20} /></button>
        </div>

        <Field id="name" label="Name" error={errors.name}>
          <input id="name" className="body-3" autoFocus value={f.name} onChange={set("name")} {...aria("name")} />
        </Field>

        <div className="pair">
          <Field id="age" label="Age" error={errors.age}>
            <input id="age" type="number" className="body-3" value={f.age} onChange={set("age")} {...aria("age")} />
          </Field>
          {select("gender", "Gender", options.genders)}
        </div>

        <div className="pair">
          {select("ward", "Ward", options.wards)}
          {select("department", "Department", options.departments)}
        </div>

        {select("doctor", "Doctor", options.doctors)}

        <Field id="admission_date" label="Admission date" error={errors.admission_date}>
          <input id="admission_date" type="date" className="body-3" max={today()} value={f.admission_date}
                 onChange={set("admission_date")} {...aria("admission_date")} />
        </Field>

        {errors.form && <p role="alert" className="caption-2 err">{errors.form}</p>}

        <div className="row end">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving" : initial ? "Save changes" : "Register patient"}
          </button>
        </div>
      </form>
    </div>
  );
}