// services/knowledgeBaseService.ts
// ═══════════════════════════════════════════════════════════════════
// Knowledge Base Service — document upload, text extraction, search
// v1.1 — 2026-02-20
//
// FEATURES:
//   - Upload documents (PDF, DOCX, XLSX, PPTX, JPG, PNG)
//   - Extract plain text from documents (client-side)
//   - Store metadata + extracted text in Supabase
//   - Search knowledge base by keyword matching
//   - Max 10MB per file, max 50 docs per organization
//   - Prepared for future vector/RAG upgrade (Approach B)
//
// CHANGES v1.1:
//   - FIX: Use shared supabase singleton from supabaseClient.ts
//     instead of local createClient() which crashed with empty key
// ═══════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient';

// ——— Types ———————————————————————————————————————

export interface KBDocument {
  id: string;
  organization_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
}

// ——— Constants ———————————————————————————————————

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOCS_PER_ORG = 50;
const BUCKET_NAME = 'knowledge-base';
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'image/jpeg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png'];

// ——— Text Extraction (client-side) ——————————————

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // For images, we can't extract text client-side easily
  if (['jpg', 'jpeg', 'png'].includes(ext)) {
    return `[Image: ${file.name}]`;
  }

  // For PDF — use pdf.js if available, otherwise return placeholder
  if (ext === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Try to use pdf.js if loaded
      if (typeof (window as any).pdfjsLib !== 'undefined') {
        const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return text.trim() || `[PDF: ${file.name} — text extraction failed]`;
      }
      return `[PDF: ${file.name} — pdf.js not loaded, text not extracted]`;
    } catch (e) {
      return `[PDF: ${file.name} — extraction error]`;
    }
  }

  // For DOCX — basic XML extraction
  if (ext === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXml = await zip.file('word/document.xml')?.async('string');
      if (docXml) {
        // Strip XML tags to get plain text
        const text = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return text || `[DOCX: ${file.name} — empty]`;
      }
      return `[DOCX: ${file.name} — could not read content]`;
    } catch (e) {
      return `[DOCX: ${file.name} — extraction error]`;
    }
  }

  // For XLSX/PPTX — basic approach
  if (ext === 'xlsx' || ext === 'pptx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      let text = '';
      const xmlFiles = Object.keys(zip.files).filter(f =>
        f.endsWith('.xml') && (f.includes('sheet') || f.includes('slide'))
      );
      for (const xmlFile of xmlFiles) {
        const content = await zip.file(xmlFile)?.async('string');
        if (content) {
          text += content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') + '\n';
        }
      }
      return text.trim() || `[${ext.toUpperCase()}: ${file.name} — empty]`;
    } catch (e) {
      return `[${ext.toUpperCase()}: ${file.name} — extraction error]`;
    }
  }

  return `[${ext.toUpperCase()}: ${file.name}]`;
}

// ——— Service ————————————————————————————————————

export const knowledgeBaseService = {

  // Get all documents for an organization
  async getDocuments(orgId: string): Promise<KBDocument[]> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('organization_id', orgId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[KnowledgeBase] Failed to fetch documents:', error);
      return [];
    }
    return data || [];
  },

  // Get document count for an organization
  async getDocCount(orgId: string): Promise<number> {
    const { count, error } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (error) return 0;
    return count || 0;
  },

  // Upload a document
  async uploadDocument(orgId: string, file: File): Promise<{ success: boolean; message: string; doc?: KBDocument }> {
    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { success: false, message: `File type .${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` };
    }

    // Check document limit
    const count = await this.getDocCount(orgId);
    if (count >= MAX_DOCS_PER_ORG) {
      return { success: false, message: `Document limit reached (${MAX_DOCS_PER_ORG}). Please delete some documents first.` };
    }

    try {
      // 1. Extract text
      const extractedText = await extractTextFromFile(file);

      // 2. Upload to Supabase Storage
      const storagePath = `${orgId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        console.error('[KnowledgeBase] Storage upload failed:', uploadError);
        return { success: false, message: `Upload failed: ${uploadError.message}` };
      }

      // 3. Save metadata to database
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;

      const { data, error: dbError } = await supabase
        .from('knowledge_base')
        .insert({
          organization_id: orgId,
          file_name: file.name,
          file_type: ext,
          file_size: file.size,
          storage_path: storagePath,
          extracted_text: extractedText,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup storage if db insert fails
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        return { success: false, message: `Database error: ${dbError.message}` };
      }

      return { success: true, message: 'Document uploaded successfully.', doc: data };
    } catch (e: any) {
      return { success: false, message: `Upload error: ${e.message}` };
    }
  },

  // Delete a document
  async deleteDocument(docId: string, storagePath: string): Promise<{ success: boolean; message: string }> {
    try {
      // Delete from storage
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);

      // Delete from database
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', docId);

      if (error) {
        return { success: false, message: `Delete failed: ${error.message}` };
      }

      return { success: true, message: 'Document deleted.' };
    } catch (e: any) {
      return { success: false, message: `Delete error: ${e.message}` };
    }
  },

  // Search knowledge base — keyword matching (Approach A)
  // Returns relevant text chunks for AI context
  async searchKnowledgeBase(orgId: string, query: string, maxChunks: number = 5): Promise<string[]> {
    if (!query || !orgId) return [];

    try {
      // Get all documents for the org
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('file_name, extracted_text')
        .eq('organization_id', orgId)
        .not('extracted_text', 'is', null);

      if (error || !data || data.length === 0) return [];

      // Simple keyword search — split query into words, find matching paragraphs
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (queryWords.length === 0) return [];

      const scoredChunks: { text: string; score: number; source: string }[] = [];

      for (const doc of data) {
        if (!doc.extracted_text) continue;
        // Split into paragraphs/chunks (~500 chars each)
        const chunks = doc.extracted_text.match(/.{1,500}/gs) || [];
        for (const chunk of chunks) {
          const lowerChunk = chunk.toLowerCase();
          let score = 0;
          for (const word of queryWords) {
            if (lowerChunk.includes(word)) score++;
          }
          if (score > 0) {
            scoredChunks.push({ text: chunk.trim(), score, source: doc.file_name });
          }
        }
      }

      // Sort by relevance score descending, take top N
      scoredChunks.sort((a, b) => b.score - a.score);
      return scoredChunks.slice(0, maxChunks).map(c => `[${c.source}]: ${c.text}`);
    } catch (e) {
      console.error('[KnowledgeBase] Search error:', e);
      return [];
    }
  },

  // Get ALL knowledge text for AI prompt (truncated to maxLength)
  async getAllKnowledgeText(orgId: string, maxLength: number = 8000): Promise<string> {
    if (!orgId) return '';

    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('file_name, extracted_text')
        .eq('organization_id', orgId)
        .not('extracted_text', 'is', null);

      if (error || !data || data.length === 0) return '';

      let combined = '';
      for (const doc of data) {
        if (!doc.extracted_text) continue;
        const docText = `\n--- ${doc.file_name} ---\n${doc.extracted_text}\n`;
        if (combined.length + docText.length > maxLength) {
          // Add as much as we can
          combined += docText.substring(0, maxLength - combined.length);
          break;
        }
        combined += docText;
      }
      return combined.trim();
    } catch (e) {
      console.error('[KnowledgeBase] getAllKnowledgeText error:', e);
      return '';
    }
  },
};
