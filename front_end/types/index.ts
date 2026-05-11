export type Nationality = "Vietnamese" | "Japanese";
export type Gender = "male" | "female";
export type JapaneseLevel = "N5" | "N4" | "N3" | "N2" | "N1" | "Basic" | "Native";
export type VietnameseLevel = "Basic" | "Native" | "A1" | "A2" | "B1" | "B2" | "C1";
export type Purpose = "language_exchange" | "friendship" | "networking" | "event";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: Nationality;
  gender: Gender;
  birthDate: string;
  occupation: string;
  city: string;
  japaneseLevel: JapaneseLevel;
  vietnameseLevel: VietnameseLevel;
  purposes: Purpose[];
  interests: string[];
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  photos?: string[];
  likeRate: number;
  connectionsCount: number;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: "sending" | "sent" | "read";
  translation?: string;
}

export interface ChatRoom {
  id: string;
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl?: string;
  interestedCount: number;
  isInterested: boolean;
}

export interface FilterState {
  gender: "male" | "female" | "all";
  ageMin: number;
  ageMax: number;
  distanceMax: number;
  japaneseLevel: JapaneseLevel[];
  nationality: Nationality | "all";
  interests: string[];
}
