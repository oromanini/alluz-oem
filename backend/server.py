from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from passlib.context import CryptContext
from jose import JWTError, jwt
import json
from collections import defaultdict
import time
from pymongo import ASCENDING, DESCENDING

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security
SECRET_KEY = os.environ.get('JWT_SECRET', 'alluz-energia-super-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Rate limiting
rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 5

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "alluz_oem")
mongo_client: Optional[AsyncIOMotorClient] = None
mongo_db: Optional[AsyncIOMotorDatabase] = None

# Create the main app
app = FastAPI(title="Alluz Energia API")
api_router = APIRouter(prefix="/api")

# Models
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class LeadCreate(BaseModel):
    nome: str
    empresa: str
    telefone: str
    cidade: str
    plano: str
    potencia: Optional[str] = None
    concessionaria: Optional[str] = None
    observacoes: Optional[str] = None
    honeypot: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    nome: str
    empresa: str
    telefone: str
    cidade: str
    plano: str
    potencia: Optional[str]
    concessionaria: Optional[str]
    observacoes: Optional[str]
    status: str
    created_at: str

class LeadStatusUpdate(BaseModel):
    status: str

class PlanCreate(BaseModel):
    nome: str
    preco: str
    descricao: List[str]
    ordem: int
    destaque: bool = False
    badge: Optional[str] = None

class PlanResponse(BaseModel):
    id: str
    nome: str
    preco: str
    descricao: List[str]
    ordem: int
    destaque: bool
    badge: Optional[str]

class ContentUpdate(BaseModel):
    key: str
    value: str

class WhatsAppConfig(BaseModel):
    numero: str
    mensagem_template: str

# Database initialization
async def init_db():
    global mongo_client, mongo_db
    if not MONGO_URL:
        raise RuntimeError("Configure MONGO_URL (MongoDB Atlas connection string) no ambiente")

    mongo_client = AsyncIOMotorClient(MONGO_URL)
    mongo_db = mongo_client[MONGO_DB_NAME]
    await mongo_client.admin.command("ping")

    await mongo_db.admins.create_index([("username", ASCENDING)], unique=True)
    await mongo_db.leads.create_index([("id", ASCENDING)], unique=True)
    await mongo_db.leads.create_index([("created_at", DESCENDING)])
    await mongo_db.plans.create_index([("id", ASCENDING)], unique=True)
    await mongo_db.plans.create_index([("ordem", ASCENDING)])
    await mongo_db.content.create_index([("key", ASCENDING)], unique=True)

    if await mongo_db.admins.count_documents({}) == 0:
        await mongo_db.admins.insert_one(
            {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": pwd_context.hash("admin123"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    if await mongo_db.plans.count_documents({}) == 0:
        plans = [
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Plano Essencial",
                    "preco": "R$ 49,90/mês",
                    "descricao": [
                        "Acompanhamento mensal da geração",
                        "Acompanhamento do excedente/créditos (com base na fatura enviada)",
                        "Orientação remota",
                        "Informativo de mudanças na concessionária"
                    ],
                    "ordem": 1,
                    "destaque": False,
                    "badge": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Plano Avançado",
                    "preco": "R$ 79,90/mês",
                    "descricao": [
                        "Tudo do Plano Essencial",
                        "Alteração de unidades beneficiárias quando precisar",
                        "20% de desconto na manutenção anual (avulsa / a negociar)"
                    ],
                    "ordem": 2,
                    "destaque": True,
                    "badge": "Mais escolhido"
                },
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Plano Completo",
                    "preco": "R$ 99,90/mês",
                    "descricao": [
                        "Tudo do Plano Avançado",
                        "40% de desconto na manutenção anual (avulsa / a negociar)"
                    ],
                    "ordem": 3,
                    "destaque": False,
                    "badge": None
                }
        ]
        await mongo_db.plans.insert_many(plans)

    if await mongo_db.content.count_documents({}) == 0:
        default_content = {
                "hero_titulo": "Acompanhamento remoto do seu sistema solar",
                "hero_subtitulo": "Monitoramento mensal, excedente/créditos e orientação para você não ficar sem suporte",
                "hero_microcopy": "Sem deslocamento. Tudo remoto.",
                "problema_titulo": "Comprou solar e ficou sem suporte?",
                "problema_texto": "App offline, geração baixa, créditos que não batem? É comum empresas terem fechado e o cliente ficar órfão. A Alluz Energia está aqui para ajudar.",
                "como_funciona_titulo": "Como funciona",
                "como_funciona_passos": json.dumps([
                    {"numero": "1", "titulo": "Preencha o formulário", "descricao": "Informe seus dados e o plano desejado"},
                    {"numero": "2", "titulo": "Falamos pelo WhatsApp", "descricao": "Confirmamos seus dados e tiramos dúvidas"},
                    {"numero": "3", "titulo": "Iniciamos o acompanhamento", "descricao": "Começamos o monitoramento mensal do seu sistema"},
                    {"numero": "4", "titulo": "Receba orientações", "descricao": "Você recebe informativos e orientações periódicas"}
                ]),
                "nao_incluso_titulo": "O que NÃO está incluso",
                "nao_incluso_itens": json.dumps([
                    "Não inclui deslocamento",
                    "Não inclui manutenção corretiva presencial",
                    "Manutenção avulsa: a negociar",
                    "Garantia: quando a Alluz executar algum serviço presencial, a garantia será apenas sobre o serviço executado (prazo informado no orçamento)"
                ]),
                "faq_titulo": "Perguntas Frequentes",
                "faq_itens": json.dumps([
                    {"pergunta": "Isso serve para demanda contratada?", "resposta": "Sim, nosso acompanhamento atende tanto sistemas residenciais quanto comerciais com demanda contratada."},
                    {"pergunta": "Até quantos kWp?", "resposta": "Atendemos sistemas de até 75 kWp."},
                    {"pergunta": "Preciso ter acesso ao app?", "resposta": "Idealmente sim, mas podemos trabalhar com as faturas enviadas mensalmente caso não tenha acesso ao app do inversor."},
                    {"pergunta": "Como vocês conferem créditos/excedente?", "resposta": "Analisamos suas faturas de energia mensalmente e comparamos com a geração do sistema para verificar se os créditos estão sendo aplicados corretamente."},
                    {"pergunta": "Se der problema, vocês atendem?", "resposta": "Oferecemos orientação remota. Para serviços presenciais, fazemos orçamento à parte com desconto conforme seu plano."},
                    {"pergunta": "Posso cancelar quando quiser?", "resposta": "Sim! Nossos planos são mensais e sem fidelidade. Você pode cancelar a qualquer momento."}
                ]),
                "whatsapp_numero": "5544988574869",
                "whatsapp_mensagem": "Olá! Sou {nome} da empresa {empresa}. Telefone: {telefone}, Cidade: {cidade}. Tenho interesse no {plano}. Potência: {kwp}. Concessionária: {concessionaria}. Observações: {obs}. Quero assinar o plano de acompanhamento.",
                "footer_razao_social": "Alluz Energia Sustentável e Tecnologia da Informacao",
                "footer_cnpj": "34.782.317/0001-49"
        }
        await mongo_db.content.insert_many(
                [{"key": key, "value": value} for key, value in default_content.items()]
            )


def get_db() -> AsyncIOMotorDatabase:
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="Banco de dados não inicializado")
    return mongo_db

# JWT helpers
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

# Rate limiting
def check_rate_limit(ip: str):
    now = time.time()
    rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limit_store[ip]) >= RATE_LIMIT_MAX:
        return False
    rate_limit_store[ip].append(now)
    return True

# Routes

@api_router.get("/")
async def root():
    return {"message": "Alluz Energia API"}

# Auth routes
@api_router.post("/auth/login", response_model=Token)
async def login(data: AdminLogin):
    db = get_db()
    admin = await db.admins.find_one({"username": data.username})
    if not admin or not pwd_context.verify(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    access_token = create_access_token(data={"sub": data.username})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me")
async def get_me(username: str = Depends(verify_token)):
    return {"username": username}

@api_router.post("/auth/change-password")
async def change_password(data: AdminLogin, username: str = Depends(verify_token)):
    db = get_db()
    password_hash = pwd_context.hash(data.password)
    await db.admins.update_one({"username": username}, {"$set": {"password_hash": password_hash}})
    return {"message": "Senha alterada com sucesso"}

# Public content route
@api_router.get("/content")
async def get_all_content():
    db = get_db()
    content = {}
    async for row in db.content.find({}, {"_id": 0, "key": 1, "value": 1}):
        content[row["key"]] = row["value"]
    return content

# Public plans route
@api_router.get("/plans", response_model=List[PlanResponse])
async def get_plans():
    db = get_db()
    plans = []
    async for row in db.plans.find({}, {"_id": 0}).sort("ordem", ASCENDING):
        plans.append(row)
    return plans

# Lead creation (public with rate limit)
@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, request: Request):
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Muitas requisições. Tente novamente em 1 minuto.")
    
    # Honeypot check
    if lead.honeypot:
        raise HTTPException(status_code=400, detail="Requisição inválida")
    
    lead_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    db = get_db()
    await db.leads.insert_one(
        {
            "id": lead_id,
            "nome": lead.nome,
            "empresa": lead.empresa,
            "telefone": lead.telefone,
            "cidade": lead.cidade,
            "plano": lead.plano,
            "potencia": lead.potencia,
            "concessionaria": lead.concessionaria,
            "observacoes": lead.observacoes,
            "status": "novo",
            "created_at": created_at,
        }
    )
    
    return {
        "id": lead_id,
        "nome": lead.nome,
        "empresa": lead.empresa,
        "telefone": lead.telefone,
        "cidade": lead.cidade,
        "plano": lead.plano,
        "potencia": lead.potencia,
        "concessionaria": lead.concessionaria,
        "observacoes": lead.observacoes,
        "status": "novo",
        "created_at": created_at
    }

# Admin routes

@api_router.get("/admin/leads", response_model=List[LeadResponse])
async def get_leads(
    status: Optional[str] = None,
    plano: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    username: str = Depends(verify_token)
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if plano:
        query["plano"] = plano
    if data_inicio or data_fim:
        query["created_at"] = {}
        if data_inicio:
            query["created_at"]["$gte"] = data_inicio
        if data_fim:
            query["created_at"]["$lte"] = data_fim

    leads = []
    async for row in db.leads.find(query, {"_id": 0}).sort("created_at", DESCENDING):
        leads.append(row)
    return leads

@api_router.patch("/admin/leads/{lead_id}")
async def update_lead_status(lead_id: str, data: LeadStatusUpdate, username: str = Depends(verify_token)):
    db = get_db()
    result = await db.leads.update_one({"id": lead_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return {"message": "Status atualizado"}

@api_router.get("/admin/leads/export")
async def export_leads_csv(username: str = Depends(verify_token)):
    db = get_db()
    csv_content = "ID,Nome,Empresa,Telefone,Cidade,Plano,Potência,Concessionária,Observações,Status,Data\n"
    async for row in db.leads.find({}, {"_id": 0}).sort("created_at", DESCENDING):
        cols = [
            row.get("id"),
            row.get("nome"),
            row.get("empresa"),
            row.get("telefone"),
            row.get("cidade"),
            row.get("plano"),
            row.get("potencia"),
            row.get("concessionaria"),
            row.get("observacoes"),
            row.get("status"),
            row.get("created_at"),
        ]
        csv_content += ",".join([f'"{str(col or "")}"' for col in cols]) + "\n"
    return {"csv": csv_content}

# Admin plans management
@api_router.post("/admin/plans", response_model=PlanResponse)
async def create_plan(plan: PlanCreate, username: str = Depends(verify_token)):
    plan_id = str(uuid.uuid4())
    db = get_db()
    await db.plans.insert_one(
        {
            "id": plan_id,
            "nome": plan.nome,
            "preco": plan.preco,
            "descricao": plan.descricao,
            "ordem": plan.ordem,
            "destaque": plan.destaque,
            "badge": plan.badge,
        }
    )
    return {
        "id": plan_id,
        "nome": plan.nome,
        "preco": plan.preco,
        "descricao": plan.descricao,
        "ordem": plan.ordem,
        "destaque": plan.destaque,
        "badge": plan.badge
    }

@api_router.put("/admin/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: str, plan: PlanCreate, username: str = Depends(verify_token)):
    db = get_db()
    result = await db.plans.update_one(
        {"id": plan_id},
        {
            "$set": {
                "nome": plan.nome,
                "preco": plan.preco,
                "descricao": plan.descricao,
                "ordem": plan.ordem,
                "destaque": plan.destaque,
                "badge": plan.badge,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return {
        "id": plan_id,
        "nome": plan.nome,
        "preco": plan.preco,
        "descricao": plan.descricao,
        "ordem": plan.ordem,
        "destaque": plan.destaque,
        "badge": plan.badge
    }

@api_router.delete("/admin/plans/{plan_id}")
async def delete_plan(plan_id: str, username: str = Depends(verify_token)):
    db = get_db()
    result = await db.plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return {"message": "Plano excluído"}

# Admin content management
@api_router.put("/admin/content")
async def update_content(data: ContentUpdate, username: str = Depends(verify_token)):
    db = get_db()
    await db.content.update_one({"key": data.key}, {"$set": {"value": data.value}}, upsert=True)
    return {"message": "Conteúdo atualizado"}

@api_router.put("/admin/whatsapp")
async def update_whatsapp(data: WhatsAppConfig, username: str = Depends(verify_token)):
    db = get_db()
    await db.content.update_one(
        {"key": "whatsapp_numero"}, {"$set": {"value": data.numero}}, upsert=True
    )
    await db.content.update_one(
        {"key": "whatsapp_mensagem"}, {"$set": {"value": data.mensagem_template}}, upsert=True
    )
    return {"message": "WhatsApp atualizado"}

# Include the router
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

@app.on_event("startup")
async def startup():
    await init_db()

@app.on_event("shutdown")
async def shutdown():
    if mongo_client is not None:
        mongo_client.close()
