export type ApprovalStatus =
  | 'pending_preview'
  | 'preview_ready'
  | 'approved'
  | 'edits_requested'
  | 'declined';

export type ApprovalRow = {
  id: string;
  order_id: number;
  order_name: string | null;
  customer_email: string | null;
  poster_title: string | null;
  preview_image_url: string | null;
  status: ApprovalStatus;
  edit_note: string | null;
  created_at: string;
  updated_at: string;
  acted_at: string | null;
};

