from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class CardSchema(BaseModel):
    id: str
    name: str
    bank: str
    reward_type: str
    class Config:
        from_attributes = True

class TransactionSchema(BaseModel):
    id: int
    card_id: str
    date: date
    description: str
    merchant: Optional[str]
    category: str
    amount: float
    reward_earned: float
    reward_rate: float
    year: int
    month: int
    class Config:
        from_attributes = True

class SpendByCategoryItem(BaseModel):
    category: str
    amount: float
    percentage: float
    reward: float

class SpendByMerchantItem(BaseModel):
    merchant: str
    amount: float
    percentage: float
    reward: float

class MonthlySpend(BaseModel):
    year: int
    month: int
    label: str
    total_spend: float
    total_reward: float
    by_category: List[SpendByCategoryItem]

class AnalyticsResponse(BaseModel):
    total_spend: float
    total_reward: float
    by_category: List[SpendByCategoryItem]
    by_merchant: List[SpendByMerchantItem]
    monthly: List[MonthlySpend]
