from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "data", "db.sqlite")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Card(Base):
    __tablename__ = "cards"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    bank = Column(String, nullable=False)
    reward_type = Column(String, default="cashback")
    config = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    statements = relationship("Statement", back_populates="card")

class Statement(Base):
    __tablename__ = "statements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    card_id = Column(String, ForeignKey("cards.id"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    period_start = Column(Date)
    period_end = Column(Date)
    year = Column(Integer)
    month = Column(Integer)
    total_spend = Column(Float, default=0.0)
    total_rewards = Column(Float, default=0.0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    card = relationship("Card", back_populates="statements")
    transactions = relationship("Transaction", back_populates="statement", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    statement_id = Column(Integer, ForeignKey("statements.id"), nullable=False)
    card_id = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    merchant = Column(String)
    category = Column(String, default="Uncategorized")
    amount = Column(Float, nullable=False)
    reward_earned = Column(Float, default=0.0)
    reward_rate = Column(Float, default=0.0)
    year = Column(Integer)
    month = Column(Integer)
    raw_text = Column(Text)
    statement = relationship("Statement", back_populates="transactions")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
