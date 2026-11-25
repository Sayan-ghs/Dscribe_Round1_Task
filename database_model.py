from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, Date
from datetime import date

Base = declarative_base()

class Patient(Base):
        __tablename__ = "PatientDB"

        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(100), nullable=False)
        age = Column(String(20), nullable=False)
        gender = Column(String(20), nullable=False)
        ward = Column(String(50), nullable=False)
        department = Column(String(50), nullable=False)
        doctor = Column(String(80), nullable=False)
        admission_date = Column(Date, nullable=False)
        status = Column(String(20), nullable=False, default="Admitted")
