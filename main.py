import os
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from typing import Literal,Optional
from datetime import date
from models import PatientIn, PatientOut
import database_model
from database_model import Patient
from database import Session, engine
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title= "Patient Admission API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dscribe-round1-task-sgld.vercel.app", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
        errors = {}
        for e in exc.errors():
                field = str(e["loc"][-1])
                msg =e["msg"].replace("value error, ", "")
                if e["type"] == "missing":
                        msg = "This field is required"
                elif e["type"] == "literal_error":
                        msg = "Please select a valid option from the list"
                elif e["type"] in ("int_parsing", "int_type"):
                        msg = "Must be a valid number"
                elif e["type"] == "date_from_datetime_parsing" or "date" in e["type"]:
                        msg = "Enter a valid date(YYYY-MM-DD)"

                errors[field] = msg
        return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})

database_model.Base.metadata.create_all(bind=engine)
def get_db():
        db = Session()

        try:
                yield db
        finally:
                db.close


GENDERS = ["Male", "Female", "Other"]
WARDS = ["General", "ICU", "Emergency", "Maternity", "Pediatric"]
DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Medicine"]
DOCTORS = ["Dr. Sharma", "Dr. Banerjee", "Dr. Iyer", "Dr. Khan", "Dr. Das"]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/options")
def options():
        return {
                "genders": GENDERS,
                "ward" : WARDS,
                "departments" : DEPARTMENTS,
                "doctors" : DOCTORS
        }

@app.get("/api/patients", response_model=list[PatientOut])
def list_patients(search: Optional[str] = None,
                  ward: Optional[str]= None,
                  department: Optional[str]=None,
                  doctor: Optional[str] = None,
                  db: Session = Depends(get_db)):

        q = db.query(Patient)
        if search: q = q.filter(Patient.name.ilike(f"%{search}%"))
        if ward: q = q.filter(Patient.ward == ward)
        if department: q = q.filter(Patient.department == department)
        if doctor: q = q.filter(Patient.doctor == doctor)
        return q.order_by(Patient.id.desc()).all()

@app.post("/api/patients", response_model=PatientOut, status_code= 201)
def create(p: PatientIn, db: Session = Depends(get_db)):
        obj = Patient(**p.model_dump())
        db.add(obj); db.commit(); db.refresh(obj)
        return obj

def get_or_404(db, pid):
        obj = db.get(Patient,pid)
        if not obj:
                raise HTTPException(404, "Patient Not found")
        return obj

@app.put("/api/patients/{pid}", response_model=PatientOut)
def update(pid: int, p: PatientIn, db: Session = Depends(get_db)):
        obj = get_or_404(db, pid)
        for k, v in p.model_dump().items():
                setattr(obj, k, v)
        db.commit(); db.refresh(obj)
        return obj

@app.delete("/api/Patients/{pid}", status_code=204)
def delete(pid: int, db: Session = Depends(get_db)):
        db.delete(get_or_404(db, pid)); db.commit()
        return Response(status_code=204)
        
        
        


