import { supabase } from './supabase';
import { Database } from '@/types/database';

type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type MessageUpdate = Database['public']['Tables']['messages']['Update'];
type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'mentor' | 'mentee';
  recipient_id: string;
  recipient_type: 'mentor' | 'mentee';
  content: string;
  message_type: 'text' | 'file' | 'image' | 'voice';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  reply_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  last_message_at: string;
  mentor_last_read_at: string;
  mentee_last_read_at: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: Message;
}

export interface SendMessageInput {
  conversation_id: string;
  sender_id: string;
  sender_type: 'mentor' | 'mentee';
  recipient_id: string;
  recipient_type: 'mentor' | 'mentee';
  content: string;
  message_type?: 'text' | 'file' | 'image' | 'voice';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
}

// Convert database row to Message interface
function dbMessageToMessage(dbMessage: MessageRow): Message {
  return {
    id: dbMessage.id,
    conversation_id: dbMessage.conversation_id,
    sender_id: dbMessage.sender_id,
    sender_type: dbMessage.sender_type,
    recipient_id: dbMessage.recipient_id,
    recipient_type: dbMessage.recipient_type,
    content: dbMessage.content,
    message_type: dbMessage.message_type,
    file_url: dbMessage.file_url || undefined,
    file_name: dbMessage.file_name || undefined,
    file_size: dbMessage.file_size || undefined,
    is_read: dbMessage.is_read,
    reply_to: dbMessage.reply_to || undefined,
    created_at: dbMessage.created_at,
    updated_at: dbMessage.updated_at
  };
}

// Convert database row to Conversation interface
function dbConversationToConversation(dbConversation: ConversationRow): Conversation {
  return {
    id: dbConversation.id,
    mentor_id: dbConversation.mentor_id,
    mentee_id: dbConversation.mentee_id,
    cohort_id: dbConversation.cohort_id,
    last_message_at: dbConversation.last_message_at,
    mentor_last_read_at: dbConversation.mentor_last_read_at,
    mentee_last_read_at: dbConversation.mentee_last_read_at,
    is_archived: dbConversation.is_archived,
    created_at: dbConversation.created_at,
    updated_at: dbConversation.updated_at
  };
}

// Generate conversation ID
function generateConversationId(mentorId: string, menteeId: string): string {
  return `conv_${mentorId}_${menteeId}`;
}

// Send a message
export async function sendMessage(messageData: SendMessageInput): Promise<Message | null> {
  console.log('Sending message:', messageData);

  const insertData: MessageInsert = {
    conversation_id: messageData.conversation_id,
    sender_id: messageData.sender_id,
    sender_type: messageData.sender_type,
    recipient_id: messageData.recipient_id,
    recipient_type: messageData.recipient_type,
    content: messageData.content,
    message_type: messageData.message_type || 'text',
    file_url: messageData.file_url || null,
    file_name: messageData.file_name || null,
    file_size: messageData.file_size || null,
    is_read: false,
    reply_to: messageData.reply_to || null
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  console.log('Message sent successfully:', data);
  return dbMessageToMessage(data);
}

// Get messages for a conversation
export async function getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
  console.log('Fetching messages for conversation:', conversationId);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data.map(dbMessageToMessage).reverse(); // Return in chronological order
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: string, userId: string, userType: 'mentor' | 'mentee'): Promise<boolean> {
  console.log('Marking messages as read:', { conversationId, userId, userType });

  // Mark all unread messages in the conversation as read
  const { error: messagesError } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (messagesError) {
    console.error('Error marking messages as read:', messagesError);
    return false;
  }

  // Update the conversation's last read timestamp for the user
  const updateField = userType === 'mentor' ? 'mentor_last_read_at' : 'mentee_last_read_at';
  const { error: conversationError } = await supabase
    .from('conversations')
    .update({ [updateField]: new Date().toISOString() })
    .eq('id', conversationId);

  if (conversationError) {
    console.error('Error updating conversation read timestamp:', conversationError);
    return false;
  }

  return true;
}

// Get conversations for a user
export async function getUserConversations(userId: string, userType: 'mentor' | 'mentee'): Promise<Conversation[]> {
  console.log('Fetching conversations for user:', { userId, userType });

  const idField = userType === 'mentor' ? 'mentor_id' : 'mentee_id';

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq(idField, userId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  // Enhance conversations with unread count and last message
  const enhancedConversations = await Promise.all(
    data.map(async (conv) => {
      const conversation = dbConversationToConversation(conv);

      // Get unread message count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('recipient_id', userId)
        .eq('is_read', false);

      conversation.unread_count = unreadCount || 0;

      // Get last message
      const { data: lastMessageData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastMessageData && lastMessageData.length > 0) {
        conversation.last_message = dbMessageToMessage(lastMessageData[0]);
      }

      return conversation;
    })
  );

  return enhancedConversations;
}

// Create or get conversation between mentor and mentee
export async function getOrCreateConversation(mentorId: string, menteeId: string): Promise<Conversation | null> {
  console.log('Getting or creating conversation:', { mentorId, menteeId });

  const conversationId = generateConversationId(mentorId, menteeId);

  // Try to get existing conversation
  const { data: existingConv, error: fetchError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching conversation:', fetchError);
    return null;
  }

  if (existingConv) {
    return dbConversationToConversation(existingConv);
  }

  // Get cohort_id from either mentor or mentee
  const { data: menteeData } = await supabase
    .from('mentees')
    .select('cohort_id')
    .eq('mentee_id', menteeId)
    .single();

  const cohortId = menteeData?.cohort_id || 'unassigned';

  // Create new conversation
  const conversationData: ConversationInsert = {
    id: conversationId,
    mentor_id: mentorId,
    mentee_id: menteeId,
    cohort_id: cohortId
  };

  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single();

  if (createError) {
    console.error('Error creating conversation:', createError);
    return null;
  }

  return dbConversationToConversation(newConv);
}

// Archive a conversation
export async function archiveConversation(conversationId: string): Promise<boolean> {
  console.log('Archiving conversation:', conversationId);

  const { error } = await supabase
    .from('conversations')
    .update({ is_archived: true })
    .eq('id', conversationId);

  if (error) {
    console.error('Error archiving conversation:', error);
    return false;
  }

  return true;
}

// Delete a message
export async function deleteMessage(messageId: string): Promise<boolean> {
  console.log('Deleting message:', messageId);

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    return false;
  }

  return true;
}