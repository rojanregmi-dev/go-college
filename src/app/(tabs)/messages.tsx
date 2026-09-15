import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChatMessage,
  JoinRequest,
  getIncomingJoinRequests,
  getOutgoingJoinRequests,
  getProfile,
  getMessages,
  sendMessage,
} from '../../services/api';

export default function MessagesScreen() {
  const [acceptedRequests, setAcceptedRequests] = useState<JoinRequest[]>([]);
  const [currentUserCode, setCurrentUserCode] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      async function loadMessages() {
        try {
          setLoading(true);
          setErrorMessage('');

          const profile = await getProfile();
          setCurrentUserCode(profile.user_code);
          const [incoming, outgoing] = await Promise.all([
            getIncomingJoinRequests(profile.user_code),
            getOutgoingJoinRequests(profile.user_code),
          ]);
          const accepted = [...incoming, ...outgoing].filter(
            (request) => request.status === 'accepted'
          );

          setAcceptedRequests(accepted);
        } catch (error) {
          setErrorMessage('Could not load accepted chats.');
        } finally {
          setLoading(false);
        }
      }

      loadMessages();
    }, [])
  );

  useEffect(() => {
    if (!selectedRequest || !currentUserCode) {
      return;
    }

    let active = true;
    const requestId = selectedRequest.id;

    async function refreshThread(showLoading: boolean) {
      try {
        if (showLoading) {
          setThreadLoading(true);
        }

        const messages = await getMessages(requestId, currentUserCode);

        if (active) {
          setThreadMessages(messages);
          setErrorMessage('');
        }
      } catch (error) {
        if (active) {
          setErrorMessage('Could not load this conversation.');
        }
      } finally {
        if (active && showLoading) {
          setThreadLoading(false);
        }
      }
    }

    refreshThread(true);
    const refreshTimer = setInterval(() => refreshThread(false), 3000);

    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, [currentUserCode, selectedRequest]);

  async function handleSendMessage() {
    const body = draft.trim();

    if (!selectedRequest || !body || sending) {
      return;
    }

    try {
      setSending(true);
      const message = await sendMessage(selectedRequest.id, body, currentUserCode);
      setThreadMessages((previous) => [...previous, message]);
      setDraft('');
    } catch (error) {
      Alert.alert('Message failed', error instanceof Error ? error.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  if (selectedRequest) {
    const otherPerson =
      selectedRequest.creator_code === currentUserCode
        ? selectedRequest.requester_name
        : `Host ${selectedRequest.creator_code}`;

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.threadScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={() => setSelectedRequest(null)}>
            <Ionicons name="arrow-back" size={20} color="#0F4C81" />
            <Text style={styles.backButtonText}>All messages</Text>
          </Pressable>

          <Text style={styles.eyebrow}>ACCEPTED PLAN</Text>
          <Text style={styles.title}>{selectedRequest.activity_title}</Text>
          <Text style={styles.subtitle}>
            Chat with {otherPerson} about {selectedRequest.activity_period.toLowerCase()} at {selectedRequest.activity_location}.
          </Text>

          <View style={styles.messageList}>
            {threadLoading && (
              <View style={styles.statusCard}>
                <ActivityIndicator color="#16A34A" />
                <Text style={styles.statusText}>Loading conversation...</Text>
              </View>
            )}

            {!threadLoading && threadMessages.length === 0 && (
              <View style={styles.statusCard}>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptyText}>Send a message to coordinate the accepted plan.</Text>
              </View>
            )}

            {threadMessages.map((message) => {
              const mine = message.sender_code === currentUserCode;

              return (
                <View key={message.id} style={[styles.messageRow, mine && styles.messageRowMine]}>
                  <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                    <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.body}</Text>
                    <Text style={[styles.messageSender, mine && styles.messageSenderMine]}>
                      {mine ? 'You' : message.sender_code}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            style={styles.messageInput}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!draft.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ACTIVITY CHAT</Text>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>
        Chats appear after the host accepts a meet or activity request.
      </Text>

      {loading && (
        <View style={styles.statusCard}>
          <ActivityIndicator color="#16A34A" />
          <Text style={styles.statusText}>Loading accepted chats...</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.statusCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {!loading && !errorMessage && acceptedRequests.length === 0 && (
        <View style={styles.statusCard}>
          <Text style={styles.emptyTitle}>No accepted chats yet</Text>
          <Text style={styles.emptyText}>
            Send a request or accept one from Discover to start a conversation.
          </Text>
        </View>
      )}

      <View style={styles.threadList}>
        {acceptedRequests.map((request) => (
          <Pressable key={request.id} style={styles.threadCard} onPress={() => setSelectedRequest(request)}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.threadBody}>
              <View style={styles.threadTopRow}>
                <Text style={styles.threadTitle}>{request.activity_title}</Text>
                <Text style={[styles.statusPill, styles.statusAccepted]}>Accepted</Text>
              </View>

              <Text style={styles.activityText}>
                {request.activity_period} at {request.activity_location}
              </Text>
              <Text style={styles.messageText}>
                Chat is open for this accepted plan. Coordinate the details here.
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BFF7FA',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 72,
    paddingBottom: 32,
  },

  threadScroll: {
    flex: 1,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },

  backButtonText: {
    color: '#0F4C81',
    fontSize: 15,
    fontWeight: '900',
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#04924A',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 8,
    color: '#071C4D',
    fontSize: 40,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 8,
    color: '#071C4D',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },

  statusCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 8,
  },

  statusText: {
    color: '#245B91',
    fontSize: 15,
    fontWeight: '800',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '900',
  },

  emptyTitle: {
    color: '#071C4D',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyText: {
    color: '#245B91',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  threadList: {
    marginTop: 24,
    gap: 14,
  },

  threadCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#03606E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#03A63C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  threadBody: {
    flex: 1,
  },

  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  threadTitle: {
    flex: 1,
    color: '#071C4D',
    fontSize: 19,
    fontWeight: '900',
  },

  statusPill: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    color: '#0F4C81',
    fontSize: 11,
    fontWeight: '900',
  },

  statusAccepted: {
    backgroundColor: '#64F58C',
    color: '#013B21',
  },

  activityText: {
    marginTop: 4,
    color: '#245B91',
    fontSize: 14,
    fontWeight: '700',
  },

  messageText: {
    marginTop: 8,
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  messageList: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 24,
  },

  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  messageRowMine: {
    justifyContent: 'flex-end',
  },

  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 5,
  },

  messageBubbleOther: {
    backgroundColor: '#FFFFFF',
  },

  messageBubbleMine: {
    backgroundColor: '#03A63C',
  },

  messageBody: {
    color: '#071C4D',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },

  messageBodyMine: {
    color: '#FFFFFF',
  },

  messageSender: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  messageSenderMine: {
    color: '#DCFCE7',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#A7E8EC',
    backgroundColor: '#FFFFFF',
  },

  messageInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#B7E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#071C4D',
    fontSize: 15,
    fontWeight: '600',
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#03A63C',
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },
});
