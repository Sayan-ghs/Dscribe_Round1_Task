from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date
from typing import Literal

class PatientIn(BaseModel):
        name: str
        age: int
        gender: Literal["Male","Female","Other"]
        ward: Literal["General", "ICU", "Emergency", "Maternity", "Pediatric"]
        department: Literal["Cardiology", "Neurology", "Orthopedics", "pediatrics", "General Medicine"]
        doctor: Literal["Dr. Sharma", "Dr. Banerjee", "Dr. Iyer", "Dr. Khan", "Dr. Das"]
        admission_date: date
        status: Literal["Admitted", "Discharged"] = "Admitted"

        @field_validator("name")
        @classmethod
        def name_letters(cls, v):
                v = v.strip()
                if not v:
                        raise ValueError("Name is rquired")
                if not all(c.isalpha() or c == " " for c in v):
                        raise ValueError("Name must contain letters only")

                return v

        @field_validator("age")
        @classmethod
        def age_range(cls, v):
                if not 0 <= v <= 120:
                        raise ValueError("Age must be between 0 and 120")
                return v

        @field_validator("admission_date")
        @classmethod
        def not_future(cls, v):
                if v > date.today():
                        raise ValueError("Admission date cannot be in the future")
                return v
        
class PatientOut(PatientIn):
        model_config = ConfigDict(from_attributes = True)
        id: int
