"""
AI Microservice for Complaint Analysis
Using FastAPI, Google Gemini for extraction, Sentence Transformers for clustering,
and Telegram Bot for integration
"""

import os
import json
import uuid
import asyncio
from typing import Dict, List, Optional
import numpy as np
from dotenv import load_dotenv
load_dotenv()

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, Response
from pydantic import BaseModel
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import aiohttp
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from contextlib import asynccontextmanager

# Global telegram app variable
telegram_app = None

# Initialize FastAPI app with startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage FastAPI app lifecycle"""
    # Startup: Start Telegram Bot
    global telegram_app
    try:
        if TELEGRAM_BOT_TOKEN:
            asyncio.create_task(start_telegram_bot())
            print("[Bot] Telegram Bot starting in background...")
        else:
            print("[Bot] TELEGRAM_BOT_TOKEN not set, skipping bot startup")
    except Exception as e:
        print(f"[Bot] Error starting telegram bot: {e}")
    
    yield
    
    # Shutdown: Stop Telegram Bot
    try:
        if telegram_app:
            await telegram_app.stop()
            print("[Bot] Telegram Bot stopped")
    except Exception as e:
        print(f"[Bot] Error stopping telegram bot: {e}")

app = FastAPI(
    title="AI Complaint Analysis Service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
NEXTJS_API_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
WA_VERIFY_TOKEN = os.getenv("WA_VERIFY_TOKEN")
WA_PHONE_NUMBER_ID = os.getenv("WA_PHONE_NUMBER_ID")
WA_ACCESS_TOKEN = os.getenv("WA_ACCESS_TOKEN")

genai.configure(api_key=GEMINI_API_KEY)
model_gemini = genai.GenerativeModel('gemini-2.5-flash')

# Initialize Sentence Transformer for embeddings
model_embedding = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# In-memory vector store for clusters
cluster_store: Dict[str, np.ndarray] = {}  # cluster_id -> centroid vector

# Pydantic models
class AnalyzeComplaintRequest(BaseModel):
    complaint_id: str
    text: str

class ExtractedData(BaseModel):
    target: str  # "RS" | "Asuransi" | "Keduanya"
    category: str
    base_urgency_score: int  # 1, 3, or 10

class ClusteringResult(BaseModel):
    cluster_id: str
    similarity_score: float
    is_new_cluster: bool

class AnalyzeComplaintResponse(BaseModel):
    complaint_id: str
    extracted_data: ExtractedData
    clustering: ClusteringResult

class NextJSComplaintPayload(BaseModel):
    """Payload to send to Next.js API"""
    patientName: str
    department: str
    complaintText: str
    insuranceProvider: Optional[str] = "umum"
    source: Optional[str] = None

@app.post("/api/v1/analyze-complaint", response_model=AnalyzeComplaintResponse)
async def analyze_complaint(request: AnalyzeComplaintRequest):
    """Analyze complaint text and return extraction + clustering results"""
    try:
        # Step 1: Extract data using LLM
        extracted_data = await extract_complaint_data(request.text)

        # Step 2: Perform clustering
        clustering_result = perform_clustering(request.text)

        return AnalyzeComplaintResponse(
            complaint_id=request.complaint_id,
            extracted_data=extracted_data,
            clustering=clustering_result
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/v1/webhook/whatsapp")
async def whatsapp_webhook_verify(
    hub_mode: Optional[str] = None,
    hub_challenge: Optional[str] = None,
    hub_verify_token: Optional[str] = None,
):
    """Verify WhatsApp webhook token from Meta"""
    if not WA_VERIFY_TOKEN:
        raise HTTPException(status_code=500, detail="WA_VERIFY_TOKEN not configured")

    if hub_mode == "subscribe" and hub_verify_token == WA_VERIFY_TOKEN:
        return Response(content=hub_challenge or "", media_type="text/plain")

    raise HTTPException(status_code=403, detail="Webhook verification failed")

@app.post("/api/v1/webhook/whatsapp")
async def whatsapp_webhook_receive(request: Request, background_tasks: BackgroundTasks):
    """Receive WhatsApp incoming messages and process in background"""
    if not WA_ACCESS_TOKEN or not WA_PHONE_NUMBER_ID:
        raise HTTPException(status_code=500, detail="WhatsApp credentials not configured")

    body = await request.json()
    
    import json
    print(f"\n[META WEBHOOK INCOMING]\n{json.dumps(body, indent=2)}\n")

    entry = body.get("entry")
    if not entry or not isinstance(entry, list):
        return {"success": False, "message": "No entry payload"}

    first_entry = entry[0]
    changes = first_entry.get("changes")
    if not changes or not isinstance(changes, list):
        return {"success": False, "message": "No changes payload"}

    change = changes[0]
    value = change.get("value", {})
    messages = value.get("messages")
    if not messages or not isinstance(messages, list):
        return {"success": True, "message": "No message to process"}

    message = messages[0]
    message_text = None
    if isinstance(message.get("text"), dict):
        message_text = message["text"].get("body")
    if not message_text:
        # fallback for other message types
        message_text = message.get("body") or message.get("caption")

    sender = message.get("from") or message.get("wa_id") or None
    if not message_text or not sender:
        return {"success": False, "message": "Invalid message payload"}

    contact_name = None
    contacts = value.get("contacts")
    if contacts and isinstance(contacts, list) and contacts[0].get("profile"):
        contact_name = contacts[0]["profile"].get("name")

    background_tasks.add_task(process_whatsapp_message, sender, message_text, contact_name)

    return {"success": True, "message": "WhatsApp message received"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "telegram_bot_running": telegram_app is not None and telegram_app.running
    }

async def extract_complaint_data(text: str) -> ExtractedData:
    """
    Use Google Gemini to extract target, category, and base_urgency_score from complaint text
    """
    prompt = f"""
    Analyze the following complaint text and extract the required information.
    Return ONLY a valid JSON object with this exact structure:
    {{
        "target": "RS" or "Asuransi" or "Keduanya",
        "category": "brief category name in Indonesian",
        "base_urgency_score": 1 or 3 or 10
    }}

    Rules:
    - target: "RS" if complaint is about hospital services, "Asuransi" if about insurance, "Keduanya" if both
    - category: main category like "Pelayanan", "Fasilitas", "Administrasi", etc.
    - base_urgency_score: 1 for low urgency, 3 for medium, 10 for high urgency

    Complaint text: {text}
    """

    try:
        response = await model_gemini.generate_content_async(prompt)
        response_text = response.text.strip()

        # Clean response (remove markdown if present)
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        import json
        data = json.loads(response_text)

        # Validate the extracted data
        if data["target"] not in ["RS", "Asuransi", "Keduanya"]:
            data["target"] = "RS"  # fallback

        if data["base_urgency_score"] not in [1, 3, 10]:
            data["base_urgency_score"] = 3  # fallback

        return ExtractedData(**data)

    except Exception as e:
        print(f"[AI] Error during extraction: {e}")
        # Fallback extraction
        return ExtractedData(
            target="RS",
            category="Umum",
            base_urgency_score=3
        )

def perform_clustering(text: str) -> ClusteringResult:
    """
    Perform clustering using sentence embeddings and cosine similarity
    """
    try:
        # Generate embedding for the current text
        embedding = model_embedding.encode([text])[0]

        best_similarity = 0.0
        best_cluster_id = None

        # Check similarity with existing clusters
        for cluster_id, centroid in cluster_store.items():
            similarity = cosine_similarity([embedding], [centroid])[0][0]
            if similarity > best_similarity:
                best_similarity = similarity
                best_cluster_id = cluster_id

        # Decision based on threshold
        if best_similarity > 0.85 and best_cluster_id:
            # Assign to existing cluster
            # Update centroid (simple average)
            cluster_store[best_cluster_id] = (cluster_store[best_cluster_id] + embedding) / 2
            return ClusteringResult(
                cluster_id=best_cluster_id,
                similarity_score=float(best_similarity),
                is_new_cluster=False
            )
        else:
            # Create new cluster
            new_cluster_id = str(uuid.uuid4())
            cluster_store[new_cluster_id] = embedding
            return ClusteringResult(
                cluster_id=new_cluster_id,
                similarity_score=0.0,
                is_new_cluster=True
            )

    except Exception as e:
        print(f"[Clustering] Error during clustering: {e}")
        # Fallback: create new cluster
        new_cluster_id = str(uuid.uuid4())
        embedding = model_embedding.encode([text])[0]
        cluster_store[new_cluster_id] = embedding
        return ClusteringResult(
            cluster_id=new_cluster_id,
            similarity_score=0.0,
            is_new_cluster=True
        )

# ==================== Telegram Bot Functions ====================

async def start_telegram_bot():
    """Initialize and run Telegram Bot"""
    global telegram_app
    
    if not TELEGRAM_BOT_TOKEN:
        print("[Bot] TELEGRAM_BOT_TOKEN not configured, skipping bot startup")
        return
    
    try:
        # Create application
        telegram_app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        
        # Add message handler
        telegram_app.add_handler(
            MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message)
        )
        
        print("[Bot] Telegram Bot initialized, polling started...")
        # Start polling (blocking)
        await telegram_app.initialize()
        await telegram_app.start()
        await telegram_app.updater.start_polling(allowed_updates=Update.ALL_TYPES)
        
    except Exception as e:
        print(f"[Bot] Error in telegram bot: {e}")
        raise

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages from Telegram"""
    try:
        chat_id = update.effective_chat.id
        message_text = update.message.text
        user_name = update.effective_user.first_name or "User"
        
        print(f"[Bot] Received message from {user_name}: {message_text[:50]}...")
        
        # Send "Processing..." message
        await context.bot.send_message(
            chat_id=chat_id,
            text="⏳ Menganalisis laporan Anda, harap tunggu..."
        )
        
        # Step 1: Analyze complaint using AI service
        complaint_id = str(uuid.uuid4())
        analysis_result = await analyze_complaint(
            AnalyzeComplaintRequest(
                complaint_id=complaint_id,
                text=message_text
            )
        )
        
        print(f"[Bot] Analysis complete. Category: {analysis_result.extracted_data.category}")
        
        # Step 2: Prepare payload for Next.js API
        payload = NextJSComplaintPayload(
            patientName=user_name,
            department=analysis_result.extracted_data.category,
            complaintText=message_text,
            insuranceProvider="umum"
        )
        
        # Step 3: Send to Next.js API
        ticket_number = await send_complaint_to_nextjs(payload)
        
        if ticket_number:
            # Step 4: Reply to user with ticket number
            await context.bot.send_message(
                chat_id=chat_id,
                text=f"✅ Terima kasih, laporan Anda telah diterima dengan Nomor Tiket: <b>{ticket_number}</b>",
                parse_mode="HTML"
            )
            print(f"[Bot] Complaint saved with ticket: {ticket_number}")
        else:
            await context.bot.send_message(
                chat_id=chat_id,
                text="❌ Maaf, terjadi kesalahan saat menyimpan laporan. Silakan coba lagi."
            )
        
    except Exception as e:
        print(f"[Bot] Error handling message: {e}")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text=f"❌ Terjadi kesalahan: {str(e)[:100]}"
        )

async def send_complaint_to_nextjs(payload: NextJSComplaintPayload) -> Optional[str]:
    """
    Send complaint to Next.js API and return ticket number
    Returns: ticket_number if successful, None otherwise
    """
    try:
        url = f"{NEXTJS_API_URL}/api/complaints"
        payload_dict = payload.model_dump()
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload_dict, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 201:
                    data = await response.json()
                    if data.get("success") and data.get("ticket"):
                        ticket_number = data["ticket"].get("ticketNumber")
                        print(f"[API] Complaint sent successfully. Ticket: {ticket_number}")
                        return ticket_number
                else:
                    print(f"[API] Error response from Next.js: {response.status}")
                    response_text = await response.text()
                    print(f"[API] Response: {response_text[:200]}")
        
        return None
        
    except asyncio.TimeoutError:
        print("[API] Timeout when sending complaint to Next.js")
        return None
    except Exception as e:
        print(f"[API] Error sending complaint to Next.js: {e}")
        return None

async def process_whatsapp_message(sender: str, text: str, contact_name: Optional[str] = None):
    """Process incoming WhatsApp message using existing AI analysis and send reply"""
    try:
        complaint_id = str(uuid.uuid4())
        analysis_result = await analyze_complaint(
            AnalyzeComplaintRequest(
                complaint_id=complaint_id,
                text=text
            )
        )

        payload = NextJSComplaintPayload(
            patientName=contact_name or sender,
            department=analysis_result.extracted_data.category,
            complaintText=text,
            insuranceProvider="umum",
            source="WhatsApp"
        )

        ticket_number = await send_complaint_to_nextjs(payload)
        if ticket_number:
            await send_whatsapp_reply(sender, ticket_number)
        else:
            print(f"[WhatsApp] Failed to save complaint for sender {sender}")
    except Exception as e:
        print(f"[WhatsApp] Error processing message from {sender}: {e}")

async def send_whatsapp_reply(to_number: str, message_text: str) -> bool:
    """Send WhatsApp reply via Meta Graph API"""
    try:
        # PERHATIKAN: Sudah diubah ke v25.0
        url = f"https://graph.facebook.com/v25.0/{WA_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WA_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual", # Wajib untuk Meta versi baru
            "to": to_number,
            "type": "text",
            "text": {
                "body": message_text
            },
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 200:
                    print(f"[WhatsApp] Reply sent to {to_number}")
                    return True
                response_text = await response.text()
                print(f"[WhatsApp] Failed to send reply: {response.status} - {response_text}")
                return False
    except asyncio.TimeoutError:
        print("[WhatsApp] Timeout sending WhatsApp reply")
        return False
    except Exception as e:
        print(f"[WhatsApp] Error sending reply: {e}")
        return False

async def process_whatsapp_message(sender: str, text: str, contact_name: Optional[str] = None):
    """Process incoming WhatsApp message using existing AI analysis and send reply"""
    try:
        # 1. Kirim pesan "Loading" agar pasien tidak bingung
        await send_whatsapp_reply(sender, "⏳ Menganalisis laporan Anda, harap tunggu...")

        complaint_id = str(uuid.uuid4())
        analysis_result = await analyze_complaint(
            AnalyzeComplaintRequest(
                complaint_id=complaint_id,
                text=text
            )
        )

        payload = NextJSComplaintPayload(
            patientName=contact_name or sender,
            department=analysis_result.extracted_data.category,
            complaintText=text,
            insuranceProvider="umum",
            source="WhatsApp"
        )

        # 2. Kirim ke Next.js
        ticket_number = await send_complaint_to_nextjs(payload)
        
        # 3. Cek hasil dari Next.js dan kirim balasan final
        if ticket_number:
            await send_whatsapp_reply(sender, f"✅ Terima kasih, laporan Anda telah diterima dengan Nomor Tiket: *{ticket_number}*")
        else:
            print(f"[WhatsApp] Failed to save complaint for sender {sender}")
            await send_whatsapp_reply(sender, "❌ Maaf, terjadi kesalahan saat menyimpan laporan ke sistem Rumah Sakit. Silakan coba beberapa saat lagi.")
            
    except Exception as e:
        print(f"[WhatsApp] Error processing message from {sender}: {e}")
        await send_whatsapp_reply(sender, "❌ Maaf, sistem AI kami sedang mengalami gangguan. Silakan hubungi petugas.")

# ==================== Main ====================

if __name__ == "__main__":
    import uvicorn
    print(f"[Server] Starting AI Service on port 8000")
    print(f"[Server] Next.js API URL: {NEXTJS_API_URL}")
    print(f"[Bot] Telegram Bot Token configured: {'Yes' if TELEGRAM_BOT_TOKEN else 'No'}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)