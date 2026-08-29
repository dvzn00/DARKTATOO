/**
 * Contrato de tipos do banco.
 *
 * Escrito à mão no BLOCO 1 para que nenhum cliente Supabase caia em `any`.
 * Espelha exatamente as migrations do BLOCO 3 e será conferido contra
 * `supabase gen types typescript` assim que o banco existir.
 */

import type { AppointmentStatus } from "@/lib/domain/constants";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  role: "admin";
  created_at: string;
}

export type TattooArtistRow = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  profile_picture_url: string;
  instagram_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export type ServiceRow = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export type AppointmentRow = {
  id: string;
  public_token: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_id: string;
  artist_id: string;
  /** YYYY-MM-DD, sem fuso. */
  date: string;
  /** HH:MM:SS, sem fuso. */
  start_time: string;
  /** HH:MM:SS, sem fuso. Derivado por trigger. */
  end_time: string;
  duration_minutes: number;
  price_snapshot: number;
  status: AppointmentStatus;
  reference_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Colunas que o cliente envia. As derivadas ficam a cargo dos triggers. */
export type AppointmentInsert = Pick<
  AppointmentRow,
  | "client_name"
  | "client_email"
  | "client_phone"
  | "service_id"
  | "artist_id"
  | "date"
  | "start_time"
> &
  Partial<Pick<AppointmentRow, "reference_image_url" | "notes" | "status">>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "id" | "email"> &
          Partial<Pick<ProfileRow, "name" | "role">>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      tattoo_artists: {
        Row: TattooArtistRow;
        Insert: Omit<TattooArtistRow, "id" | "created_at" | "is_active"> &
          Partial<Pick<TattooArtistRow, "id" | "is_active">>;
        Update: Partial<TattooArtistRow>;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: Omit<ServiceRow, "id" | "created_at" | "is_active"> &
          Partial<Pick<ServiceRow, "id" | "is_active">>;
        Update: Partial<ServiceRow>;
        Relationships: [];
      };
      appointments: {
        Row: AppointmentRow;
        Insert: AppointmentInsert;
        Update: Partial<
          Pick<AppointmentRow, "status" | "notes" | "reference_image_url">
        >;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
