from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Stripe Connect Models
class AccountInfo(BaseModel):
    id: str
    type: str
    email: Optional[str] = None
    business_profile: Optional[Dict[str, Any]] = None
    charges_enabled: bool
    payouts_enabled: bool
    requirements: Optional[Dict[str, Any]] = None

class BankAccountData(BaseModel):
    id: str
    object: str
    account_holder_name: Optional[str] = None
    account_holder_type: Optional[str] = None
    bank_name: Optional[str] = None
    country: str
    currency: str
    last4: str
    routing_number: Optional[str] = None
    status: str
    default_for_currency: bool

class AddBankAccountRequest(BaseModel):
    account_number: str
    routing_number: str
    account_holder_name: str
    account_holder_type: str = "individual"  # or "company"

class UpdateProfileRequest(BaseModel):
    business_name: Optional[str] = None
    url: Optional[str] = None
    support_phone: Optional[str] = None
    support_email: Optional[str] = None

class CreatePayoutRequest(BaseModel):
    amount: float
    currency: str = "usd"
    description: Optional[str] = None

# Helper function to get Stripe API key from header
def get_stripe_key(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="API key required")
    if authorization.startswith("Bearer "):
        return authorization.replace("Bearer ", "")
    return authorization

# Test endpoint
@api_router.get("/")
async def root():
    return {"message": "Stripe Connect Management API"}

# Get account information
@api_router.get("/stripe/account")
async def get_account(authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        account = stripe.Account.retrieve()
        
        # Safely get attributes that might not exist
        business_profile = getattr(account, 'business_profile', None)
        requirements = getattr(account, 'requirements', None)
        
        return {
            "id": account.id,
            "type": account.type,
            "email": getattr(account, 'email', None),
            "business_profile": dict(business_profile) if business_profile else {},
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "requirements": dict(requirements) if requirements else {},
            "country": account.country,
            "default_currency": account.default_currency,
        }
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all payouts
@api_router.get("/stripe/payouts")
async def get_payouts(authorization: str = Header(None), limit: int = 10):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        payouts = stripe.Payout.list(limit=limit)
        return {
            "data": [
                {
                    "id": payout.id,
                    "amount": payout.amount / 100,  # Convert from cents
                    "currency": payout.currency,
                    "arrival_date": payout.arrival_date,
                    "status": payout.status,
                    "description": payout.description,
                    "created": payout.created,
                    "method": payout.method,
                    "type": payout.type,
                }
                for payout in payouts.data
            ]
        }
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create a payout
@api_router.post("/stripe/payouts")
async def create_payout(request: CreatePayoutRequest, authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        # Convert to cents
        amount_cents = int(request.amount * 100)
        
        payout = stripe.Payout.create(
            amount=amount_cents,
            currency=request.currency,
            description=request.description,
        )
        
        return {
            "id": payout.id,
            "amount": payout.amount / 100,
            "currency": payout.currency,
            "status": payout.status,
            "arrival_date": payout.arrival_date,
            "description": payout.description,
        }
    except stripe.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Cancel a payout
@api_router.post("/stripe/payouts/{payout_id}/cancel")
async def cancel_payout(payout_id: str, authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        payout = stripe.Payout.retrieve(payout_id)
        payout.cancel()
        
        return {"message": "Payout cancelled successfully", "payout_id": payout_id}
    except stripe.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all bank accounts
@api_router.get("/stripe/bank-accounts")
async def get_bank_accounts(authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        account = stripe.Account.retrieve()
        external_accounts = stripe.Account.list_external_accounts(
            account.id,
            object="bank_account",
            limit=10
        )
        
        return {
            "data": [
                {
                    "id": ba.id,
                    "object": ba.object,
                    "account_holder_name": ba.account_holder_name,
                    "account_holder_type": ba.account_holder_type,
                    "bank_name": ba.bank_name,
                    "country": ba.country,
                    "currency": ba.currency,
                    "last4": ba.last4,
                    "routing_number": ba.routing_number,
                    "status": ba.status,
                    "default_for_currency": ba.default_for_currency,
                }
                for ba in external_accounts.data
            ]
        }
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add a bank account
@api_router.post("/stripe/bank-accounts")
async def add_bank_account(request: AddBankAccountRequest, authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        account = stripe.Account.retrieve()
        
        # Create token for bank account
        token = stripe.Token.create(
            bank_account={
                "country": "US",
                "currency": "usd",
                "account_holder_name": request.account_holder_name,
                "account_holder_type": request.account_holder_type,
                "routing_number": request.routing_number,
                "account_number": request.account_number,
            },
        )
        
        # Add bank account to account
        bank_account = stripe.Account.create_external_account(
            account.id,
            external_account=token.id,
        )
        
        return {
            "id": bank_account.id,
            "bank_name": bank_account.bank_name,
            "last4": bank_account.last4,
            "status": bank_account.status,
        }
    except stripe.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Delete a bank account
@api_router.delete("/stripe/bank-accounts/{bank_account_id}")
async def delete_bank_account(bank_account_id: str, authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        account = stripe.Account.retrieve()
        stripe.Account.delete_external_account(
            account.id,
            bank_account_id,
        )
        
        return {"message": "Bank account deleted successfully", "bank_account_id": bank_account_id}
    except stripe.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Set default bank account
@api_router.post("/stripe/bank-accounts/{bank_account_id}/default")
async def set_default_bank_account(bank_account_id: str, authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        account = stripe.Account.retrieve()
        stripe.Account.modify_external_account(
            account.id,
            bank_account_id,
            default_for_currency=True,
        )
        
        return {"message": "Default bank account set successfully", "bank_account_id": bank_account_id}
    except stripe.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update account profile
@api_router.put("/stripe/profile")
async def update_profile(request: UpdateProfileRequest, authorization: str = Header(None)):
    try:
        api_key = get_stripe_key(authorization)
        stripe.api_key = api_key
        
        update_data = {}
        business_profile = {}
        
        if request.business_name:
            business_profile["name"] = request.business_name
        if request.url:
            business_profile["url"] = request.url
        if request.support_phone:
            business_profile["support_phone"] = request.support_phone
        if request.support_email:
            business_profile["support_email"] = request.support_email
        
        if business_profile:
            update_data["business_profile"] = business_profile
        
        # Use Account.modify without account ID for own account
        updated_account = stripe.Account.modify(**update_data)
        
        return {
            "message": "Profile updated successfully",
            "business_profile": dict(updated_account.business_profile) if updated_account.business_profile else {},
        }
    except stripe.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()