import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GroupMember {
  id: string;
  name: string;
  carModel?: string;
}

export interface GroupLeaderboardEntry {
  memberId: string;
  memberName: string;
  peakSpeed: number;
  avgGForce: number;
  sessionCount: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  leaderboard: GroupLeaderboardEntry[];
  createdAt: string;
}

class GroupService {
  private storageKey = 'apexbox_groups';

  async getGroups(): Promise<Group[]> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Return mock groups if none exist
      return this.getMockGroups();
    } catch (error) {
      console.error('[GroupService] Error loading groups:', error);
      return this.getMockGroups();
    }
  }

  private getMockGroups(): Group[] {
    return [
      {
        id: '1',
        name: 'Street Racers',
        description: 'Weekend warriors pushing limits',
        members: [
          { id: 'm1', name: 'Alex Turner', carModel: '2024 BMW M4' },
          { id: 'm2', name: 'Jordan Lee', carModel: '2023 Audi RS5' },
          { id: 'm3', name: 'Sam Rivera', carModel: '2025 Porsche 911' },
        ],
        leaderboard: [
          { memberId: 'm3', memberName: 'Sam Rivera', peakSpeed: 185.2, avgGForce: 2.8, sessionCount: 12 },
          { memberId: 'm1', memberName: 'Alex Turner', peakSpeed: 178.5, avgGForce: 2.6, sessionCount: 15 },
          { memberId: 'm2', memberName: 'Jordan Lee', peakSpeed: 172.3, avgGForce: 2.4, sessionCount: 10 },
        ],
        createdAt: '2025-10-15T10:30:00Z',
      },
      {
        id: '2',
        name: 'Track Day Legends',
        description: 'Professional circuit enthusiasts',
        members: [
          { id: 'm4', name: 'Taylor Swift', carModel: '2024 McLaren 720S' },
          { id: 'm5', name: 'Morgan Hayes', carModel: '2023 Ferrari F8' },
        ],
        leaderboard: [
          { memberId: 'm4', memberName: 'Taylor Swift', peakSpeed: 205.8, avgGForce: 3.2, sessionCount: 8 },
          { memberId: 'm5', memberName: 'Morgan Hayes', peakSpeed: 198.4, avgGForce: 3.0, sessionCount: 6 },
        ],
        createdAt: '2025-10-18T14:20:00Z',
      },
    ];
  }

  async createGroup(name: string, description: string): Promise<Group> {
    try {
      const groups = await this.getGroups();
      
      const newGroup: Group = {
        id: Date.now().toString(),
        name,
        description,
        members: [],
        leaderboard: [],
        createdAt: new Date().toISOString(),
      };

      groups.push(newGroup);
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(groups));
      
      console.log('[GroupService] Group created:', newGroup);
      return newGroup;
    } catch (error) {
      console.error('[GroupService] Error creating group:', error);
      throw error;
    }
  }

  async joinGroup(groupId: string, member: GroupMember): Promise<void> {
    try {
      const groups = await this.getGroups();
      const group = groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.members.some(m => m.id === member.id)) {
        group.members.push(member);
        await AsyncStorage.setItem(this.storageKey, JSON.stringify(groups));
        console.log('[GroupService] Member joined group:', member);
      }
    } catch (error) {
      console.error('[GroupService] Error joining group:', error);
      throw error;
    }
  }
}

export default new GroupService();