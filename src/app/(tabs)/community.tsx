import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CommunityScreen() {
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('');
  const [inviteIds, setInviteIds] = useState('');
  const [groups, setGroups] = useState(['GO Builders']);

  function handleCreateGroup() {
    const cleanGroupName = groupName.trim();

    if (!cleanGroupName || !groupType.trim()) {
      Alert.alert('Missing info', 'Add a group name and group type.');
      return;
    }

    setGroups([cleanGroupName, ...groups]);
    setGroupName('');
    setGroupType('');
    setInviteIds('');
    Alert.alert('Group created', `${cleanGroupName} is ready for invites.`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>COMMUNITY</Text>
      <Text style={styles.title}>Create a group</Text>
      <Text style={styles.subtitle}>Start a crew for study, gym, meetups, gigs, or weekend plans.</Text>

      <TextInput
        value={groupName}
        onChangeText={setGroupName}
        placeholder="Group name, like Alkek Study Crew"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />

      <TextInput
        value={groupType}
        onChangeText={setGroupType}
        placeholder="Group type, like Study, Gym, Meet, Gig"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />

      <TextInput
        value={inviteIds}
        onChangeText={setInviteIds}
        placeholder="Invite IDs, like alex-txst, maya-txst"
        placeholderTextColor="#94A3B8"
        style={styles.input}
        autoCapitalize="none"
      />

      <Pressable style={styles.createButton} onPress={handleCreateGroup}>
        <Ionicons name="people-outline" size={21} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Create group</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Your groups</Text>

      <View style={styles.groupList}>
        {groups.map((group) => (
          <View key={group} style={styles.groupCard}>
            <View style={styles.groupIcon}>
              <Ionicons name="people-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.groupBody}>
              <Text style={styles.groupTitle}>{group}</Text>
              <Text style={styles.groupMeta}>Invite friends by ID after backend storage.</Text>
            </View>
          </View>
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
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#04924A',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: 8,
    color: '#071C4D',
    fontSize: 38,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: '#071C4D',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  input: {
    marginTop: 14,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#071C4D',
    fontWeight: '700',
  },
  createButton: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: '#03A63C',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  sectionTitle: {
    marginTop: 24,
    color: '#071C4D',
    fontSize: 17,
    fontWeight: '900',
  },
  groupList: {
    marginTop: 12,
    gap: 10,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#03A63C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBody: {
    flex: 1,
  },
  groupTitle: {
    color: '#071C4D',
    fontSize: 16,
    fontWeight: '900',
  },
  groupMeta: {
    marginTop: 3,
    color: '#245B91',
    fontSize: 13,
    fontWeight: '700',
  },
});
