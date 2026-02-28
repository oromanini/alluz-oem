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
import aiosqlite
from passlib.context import CryptContext
from jose import JWTError, jwt
import json
from collections import defaultdict
import time

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

DB_PATH = ROOT_DIR / "alluz.db"

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
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS admins (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                empresa TEXT NOT NULL,
                telefone TEXT NOT NULL,
                cidade TEXT NOT NULL,
                plano TEXT NOT NULL,
                potencia TEXT,
                concessionaria TEXT,
                observacoes TEXT,
                status TEXT DEFAULT 'novo',
                created_at TEXT NOT NULL
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                preco TEXT NOT NULL,
                descricao TEXT NOT NULL,
                ordem INTEGER NOT NULL,
                destaque INTEGER DEFAULT 0,
                badge TEXT
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS content (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        await db.commit()
        
        # Check if admin exists
        cursor = await db.execute("SELECT COUNT(*) FROM admins")
        count = await cursor.fetchone()
        if count[0] == 0:
            admin_id = str(uuid.uuid4())
            password_hash = pwd_context.hash("admin123")
            await db.execute(
                "INSERT INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (admin_id, "admin", password_hash, datetime.now(timezone.utc).isoformat())
            )
            await db.commit()
        
        # Seed plans if empty
        cursor = await db.execute("SELECT COUNT(*) FROM plans")
        count = await cursor.fetchone()
        if count[0] == 0:
            plans = [
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Plano Essencial",
                    "preco": "R$ 49,90/mês",
                    "descricao": json.dumps([
                        "Acompanhamento mensal da geração",
                        "Acompanhamento do excedente/créditos (com base na fatura enviada)",
                        "Orientação remota",
                        "Informativo de mudanças na concessionária"
                    ]),
                    "ordem": 1,
                    "destaque": 0,
                    "badge": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Plano Avançado",
                    "preco": "R$ 79,90/mês",
                    "descricao": json.dumps([
                        "Tudo do Plano Essencial",
                        "Alteração de unidades beneficiárias quando precisar",
                        "20% de desconto na manutenção anual (avulsa / a negociar)"
                    ]),
                    "ordem": 2,
                    "destaque": 1,
                    "badge": "Mais escolhido"
                },
                {
                    "id": str(uuid.uuid4()),
                    "nome": "Plano Completo",
                    "preco": "R$ 99,90/mês",
                    "descricao": json.dumps([
                        "Tudo do Plano Avançado",
                        "40% de desconto na manutenção anual (avulsa / a negociar)"
                    ]),
                    "ordem": 3,
                    "destaque": 0,
                    "badge": None
                }
            ]
            for plan in plans:
                await db.execute(
                    "INSERT INTO plans (id, nome, preco, descricao, ordem, destaque, badge) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (plan["id"], plan["nome"], plan["preco"], plan["descricao"], plan["ordem"], plan["destaque"], plan["badge"])
                )
            await db.commit()
        
        # Seed content if empty
        cursor = await db.execute("SELECT COUNT(*) FROM content")
        count = await cursor.fetchone()
        if count[0] == 0:
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
            for key, value in default_content.items():
                await db.execute("INSERT INTO content (key, value) VALUES (?, ?)", (key, value))
            await db.commit()

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
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT password_hash FROM admins WHERE username = ?", (data.username,))
        row = await cursor.fetchone()
        if not row or not pwd_context.verify(data.password, row[0]):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        access_token = create_access_token(data={"sub": data.username})
        return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me")
async def get_me(username: str = Depends(verify_token)):
    return {"username": username}

@api_router.post("/auth/change-password")
async def change_password(data: AdminLogin, username: str = Depends(verify_token)):
    async with aiosqlite.connect(DB_PATH) as db:
        password_hash = pwd_context.hash(data.password)
        await db.execute("UPDATE admins SET password_hash = ? WHERE username = ?", (password_hash, username))
        await db.commit()
        return {"message": "Senha alterada com sucesso"}

# Public content route
@api_router.get("/content")
async def get_all_content():
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT key, value FROM content")
        rows = await cursor.fetchall()
        content = {}
        for row in rows:
            content[row[0]] = row[1]
        return content

# Public plans route
@api_router.get("/plans", response_model=List[PlanResponse])
async def get_plans():
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT id, nome, preco, descricao, ordem, destaque, badge FROM plans ORDER BY ordem")
        rows = await cursor.fetchall()
        plans = []
        for row in rows:
            plans.append({
                "id": row[0],
                "nome": row[1],
                "preco": row[2],
                "descricao": json.loads(row[3]),
                "ordem": row[4],
                "destaque": bool(row[5]),
                "badge": row[6]
            })
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
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO leads (id, nome, empresa, telefone, cidade, plano, potencia, concessionaria, observacoes, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (lead_id, lead.nome, lead.empresa, lead.telefone, lead.cidade, lead.plano,
             lead.potencia, lead.concessionaria, lead.observacoes, "novo", created_at)
        )
        await db.commit()
    
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
    async with aiosqlite.connect(DB_PATH) as db:
        query = "SELECT id, nome, empresa, telefone, cidade, plano, potencia, concessionaria, observacoes, status, created_at FROM leads WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        if plano:
            query += " AND plano = ?"
            params.append(plano)
        if data_inicio:
            query += " AND created_at >= ?"
            params.append(data_inicio)
        if data_fim:
            query += " AND created_at <= ?"
            params.append(data_fim)
        
        query += " ORDER BY created_at DESC"
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        leads = []
        for row in rows:
            leads.append({
                "id": row[0],
                "nome": row[1],
                "empresa": row[2],
                "telefone": row[3],
                "cidade": row[4],
                "plano": row[5],
                "potencia": row[6],
                "concessionaria": row[7],
                "observacoes": row[8],
                "status": row[9],
                "created_at": row[10]
            })
        return leads

@api_router.patch("/admin/leads/{lead_id}")
async def update_lead_status(lead_id: str, data: LeadStatusUpdate, username: str = Depends(verify_token)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE leads SET status = ? WHERE id = ?", (data.status, lead_id))
        await db.commit()
        return {"message": "Status atualizado"}

@api_router.get("/admin/leads/export")
async def export_leads_csv(username: str = Depends(verify_token)):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id, nome, empresa, telefone, cidade, plano, potencia, concessionaria, observacoes, status, created_at FROM leads ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        
        csv_content = "ID,Nome,Empresa,Telefone,Cidade,Plano,Potência,Concessionária,Observações,Status,Data\n"
        for row in rows:
            csv_content += ",".join([f'"{str(col or "")}"' for col in row]) + "\n"
        
        return {"csv": csv_content}

# Admin plans management
@api_router.post("/admin/plans", response_model=PlanResponse)
async def create_plan(plan: PlanCreate, username: str = Depends(verify_token)):
    plan_id = str(uuid.uuid4())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO plans (id, nome, preco, descricao, ordem, destaque, badge) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (plan_id, plan.nome, plan.preco, json.dumps(plan.descricao), plan.ordem, int(plan.destaque), plan.badge)
        )
        await db.commit()
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
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE plans SET nome = ?, preco = ?, descricao = ?, ordem = ?, destaque = ?, badge = ? WHERE id = ?",
            (plan.nome, plan.preco, json.dumps(plan.descricao), plan.ordem, int(plan.destaque), plan.badge, plan_id)
        )
        await db.commit()
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
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
        await db.commit()
        return {"message": "Plano excluído"}

# Admin content management
@api_router.put("/admin/content")
async def update_content(data: ContentUpdate, username: str = Depends(verify_token)):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM content WHERE key = ?", (data.key,))
        count = await cursor.fetchone()
        if count[0] > 0:
            await db.execute("UPDATE content SET value = ? WHERE key = ?", (data.value, data.key))
        else:
            await db.execute("INSERT INTO content (key, value) VALUES (?, ?)", (data.key, data.value))
        await db.commit()
        return {"message": "Conteúdo atualizado"}

@api_router.put("/admin/whatsapp")
async def update_whatsapp(data: WhatsAppConfig, username: str = Depends(verify_token)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE content SET value = ? WHERE key = ?", (data.numero, "whatsapp_numero"))
        await db.execute("UPDATE content SET value = ? WHERE key = ?", (data.mensagem_template, "whatsapp_mensagem"))
        await db.commit()
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
    pass
