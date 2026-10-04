export type QuoteStatus = 'sent' | 'received' | 'pending';

export interface QuoteItem {
  id: string;
  contactId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  amount?: number;
  fileName?: string;
  fileData?: string; // Data URL (Base64) for PDF or image
  fileType?: string; // MIME type (e.g. 'application/pdf', 'image/png')
  fileSize?: number; // Size in bytes
  status: QuoteStatus; // 'sent' | 'received' | 'pending'
  sentAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export interface QuoteFilter {
  contactId?: string;
  status?: QuoteStatus | 'all';
  search?: string;
}
