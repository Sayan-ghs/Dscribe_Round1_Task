const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail || `Request failed (${response.status})`);
    error.detail = body?.detail || error.message;
    error.errors = body?.errors;
    throw error;
  }

  return body;
}

function toFrontendPatient(patient) {
  return patient.department === "pediatrics"
    ? { ...patient, department: "Pediatrics" }
    : patient;
}

function toBackendPatient(patient) {
  return {
    ...patient,
    department: patient.department === "Pediatrics" ? "pediatrics" : patient.department,
  };
}

export const api = {
  async options() {
    const options = await request("/api/options");
    return {
      ...options,
      wards: options.ward,
    };
  },

  async list(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    const patients = await request(`/api/patients${query ? `?${query}` : ""}`);
    return patients.map(toFrontendPatient);
  },

  async create(patient) {
    const result = await request("/api/patients", {
      method: "POST",
      body: JSON.stringify(toBackendPatient(patient)),
    });
    return toFrontendPatient(result);
  },

  async update(id, patient) {
    const result = await request(`/api/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(toBackendPatient({ ...patient, id })),
    });
    return toFrontendPatient(result);
  },

  async discharge(id) {
    const patients = await this.list();
    const patient = patients.find((item) => item.id === id);
    if (!patient) {
      const error = new Error("Patient not found");
      error.detail = error.message;
      throw error;
    }

    return this.update(id, { ...patient, status: "Discharged" });
  },

  async remove(id) {
    return request(`/api/Patients/${id}`, { method: "DELETE" });
  },
};
