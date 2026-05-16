# ai-service/rag_engine.py
import os
import uuid
import numpy as np
import chromadb
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

class IngestionBrain:
    def __init__(self):
        self.db_path = "/app/data/vector_store"
        self.model_name = "all-MiniLM-L6-v2"
        
        # Load embedding weights
        self.encoder = SentenceTransformer(self.model_name)
        
        # Initialize Persistent Chroma Client
        os.makedirs(self.db_path, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=self.db_path)
        
        # Seed system-wide default vector layout 
        self.default_collection = self.chroma_client.get_or_create_collection(
            name="supply_chain_defaults",
            metadata={"description": "Global baseline logistics rules and safety manuals."}
        )

    def process_and_index_pdf(self, file_path: str, collection_name: str, origin_name: str) -> int:
        """Parses a PDF, recursively splits it into text chunks, embeds them, and logs to ChromaDB."""
        try:
            loader = PyMuPDFLoader(file_path)
            raw_docs = loader.load()
            
            if not raw_docs:
                return 0
                
            # Structural text partition configuration
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=120)
            split_chunks = text_splitter.split_documents(raw_docs)
            
            texts = [chunk.page_content for chunk in split_chunks]
            metadatas = [{"source_file": origin_name, "chunk_idx": i} for i, _ in enumerate(split_chunks)]
            ids = [f"chunk_{uuid.uuid4().hex[:10]}" for _ in split_chunks]
            
            # Vectorize via SentenceTransformer
            embeddings = self.encoder.encode(texts, show_progress_bar=False).tolist()
            
            # Secure targeted database connection
            target_collection = self.chroma_client.get_or_create_collection(name=collection_name)
            target_collection.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=texts)
            
            return len(split_chunks)
        except Exception as e:
            print(f"[RAG ENGINE COMPILATION FAILURE]: {str(e)}")
            raise e

    def fetch_combined_context(self, search_query: str, user_id: Optional[str] = None, top_k: int = 3) -> str:
        """Queries custom collections if present; falls back or blends with defaults."""
        query_vector = self.encoder.encode([search_query]).tolist()
        context_fragments = []
        
        # 1. Look for user-specific collection overlays
        if user_id and user_id != "undefined":
            user_collection_name = f"user_kb_collection_{user_id}"
            try:
                user_coll = self.chroma_client.get_collection(name=user_collection_name)
                if user_coll.count() > 0:
                    user_results = user_coll.query(query_embeddings=query_vector, n_results=top_k)
                    if user_results and user_results.get('documents') and user_results['documents'][0]:
                        for doc in user_results['documents'][0]:
                            context_fragments.append(f"[Custom Override Guideline]: {doc}")
            except Exception:
                pass # Silently proceed if collection doesn't exist yet

        # 2. Fall back to default handbook if user collection did not supply context
        if not context_fragments:
            try:
                default_results = self.default_collection.query(query_embeddings=query_vector, n_results=top_k)
                if default_results and default_results.get('documents') and default_results['documents'][0]:
                    for doc in default_results['documents'][0]:
                        context_fragments.append(f"[Default SOP Standard]: {doc}")
            except Exception:
                pass

        return "\n---\n".join(context_fragments)

# Global unified instance handle
rag_engine = IngestionBrain()